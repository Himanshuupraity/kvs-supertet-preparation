/**
 * Thin wrapper over the Web Speech API (SpeechRecognition) for live transcription.
 * Chrome on Android / desktop supports it; Firefox and some iOS versions do not.
 * When unsupported, the UI offers a manual transcript box.
 *
 * The recogniser is fragile in practice: it ends by itself on silence, it can be
 * killed by the network, and it can end instantly in a loop when the microphone is
 * busy. This wrapper restarts it with backoff, keeps whatever was heard, and always
 * reports *why* it produced nothing so the UI can say something useful.
 */

export type SpeechFailure =
  | 'unsupported'      // browser has no SpeechRecognition
  | 'insecure-context' // not https / localhost
  | 'not-allowed'      // mic permission denied for speech
  | 'audio-capture'    // mic busy or unavailable to the recogniser
  | 'network'          // recognition service unreachable (it is a cloud service in Chrome)
  | 'language'         // requested language not supported
  | 'no-speech'        // ran fine, heard nothing
  | 'unstable'         // recogniser kept dying and restarting without ever hearing speech
  | 'unknown';

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
}
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; }

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** null when speech recognition can be attempted, otherwise the blocking reason. */
export function speechUnavailableReason(): SpeechFailure | null {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure-context';
  if (!getCtor()) return 'unsupported';
  return null;
}

export function speechSupported(): boolean { return speechUnavailableReason() === null; }

/** Errors that will never fix themselves by restarting the recogniser. */
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported']);

function mapError(err: string): SpeechFailure {
  switch (err) {
    case 'not-allowed': case 'service-not-allowed': return 'not-allowed';
    case 'audio-capture': return 'audio-capture';
    case 'network': return 'network';
    case 'language-not-supported': return 'language';
    case 'no-speech': return 'no-speech';
    default: return 'unknown';
  }
}

export interface TranscriberResult {
  transcript: string;
  /** null when a usable transcript came back. */
  failure: SpeechFailure | null;
  /** true if the recogniser detected speech at any point, even if it transcribed nothing. */
  heardSpeech: boolean;
}

export interface TranscriberStatus { listening: boolean; failure: SpeechFailure | null; }

export interface Transcriber {
  start(): void;
  stop(): Promise<TranscriberResult>;
  onUpdate: (cb: (finalText: string, interim: string) => void) => void;
  onStatus: (cb: (s: TranscriberStatus) => void) => void;
}

const MAX_BLIND_RESTARTS = 8; // consecutive restarts with no result at all => something is wrong

export function createTranscriber(lang: 'en-IN' | 'hi-IN' = 'en-IN'): Transcriber | null {
  if (!speechSupported()) return null;
  const Ctor = getCtor()!;
  const rec = new Ctor();
  rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;

  let finalText = '';
  let interim = '';
  let running = false;        // caller wants us listening
  let manualStop = false;
  let settled = false;
  let heardSpeech = false;
  let failure: SpeechFailure | null = null;
  let blindRestarts = 0;
  let restartTimer: number | null = null;
  let safetyTimer: number | null = null;

  let update: (f: string, i: string) => void = () => {};
  let status: (s: TranscriberStatus) => void = () => {};
  let resolveStop: ((r: TranscriberResult) => void) | null = null;

  const emitStatus = () => status({ listening: running && !manualStop, failure });

  /** Anything the recogniser never finalised still counts — do not throw it away. */
  const absorbInterim = () => {
    const t = interim.trim();
    if (t) { finalText += (finalText ? ' ' : '') + t; interim = ''; }
  };

  const settle = () => {
    if (settled) return;
    settled = true;
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    absorbInterim();
    const transcript = finalText.trim();
    running = false;
    emitStatus();
    resolveStop?.({
      transcript,
      failure: transcript ? null : (failure ?? (heardSpeech ? 'unknown' : 'no-speech')),
      heardSpeech,
    });
    resolveStop = null;
  };

  const tryStart = () => {
    try { rec.start(); return true; } catch { return false; } // InvalidStateError when still winding down
  };

  const scheduleRestart = () => {
    if (restartTimer) return;
    // back off a little as blind restarts pile up, so a busy mic cannot spin the CPU
    const delay = Math.min(150 * (blindRestarts + 1), 1200);
    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      if (!running || manualStop) return;
      if (!tryStart()) scheduleRestart();
    }, delay);
  };

  rec.onresult = (e) => {
    interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const t = res[0]?.transcript ?? '';
      if (res.isFinal) finalText += (finalText ? ' ' : '') + t.trim();
      else interim += t;
    }
    if (finalText || interim) { heardSpeech = true; blindRestarts = 0; failure = null; emitStatus(); }
    update(finalText, interim);
  };

  rec.onspeechstart = () => { heardSpeech = true; blindRestarts = 0; };

  rec.onerror = (e) => {
    // 'no-speech' and 'aborted' are normal: the recogniser simply ends and we restart it.
    if (e.error === 'aborted') return;
    if (e.error === 'no-speech') { if (!finalText) failure = failure ?? 'no-speech'; return; }
    failure = mapError(e.error);
    if (FATAL.has(e.error)) { running = false; console.warn('speech recognition stopped:', e.error); }
    emitStatus();
  };

  rec.onend = () => {
    absorbInterim();
    if (running && !manualStop) {
      if (!finalText) {
        blindRestarts += 1;
        if (blindRestarts > MAX_BLIND_RESTARTS) {
          // the recogniser is ending immediately every time — mic busy, offline, or blocked
          running = false;
          failure = failure ?? 'unstable';
          emitStatus();
          settle();
          return;
        }
      }
      scheduleRestart();
      return;
    }
    settle();
  };

  return {
    start() {
      manualStop = false; settled = false; running = true;
      finalText = ''; interim = ''; heardSpeech = false; failure = null; blindRestarts = 0;
      if (!tryStart()) scheduleRestart();
      emitStatus();
    },
    stop() {
      return new Promise<TranscriberResult>((res) => {
        resolveStop = res;
        manualStop = true;
        if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
        if (settled) { settled = false; settle(); return; }
        try { rec.stop(); } catch { settle(); return; }
        // onend normally fires within a few hundred ms; never hang the UI on it
        safetyTimer = window.setTimeout(() => { try { rec.abort(); } catch { /* ignore */ } settle(); }, 2500);
      });
    },
    onUpdate(cb) { update = cb; },
    onStatus(cb) { status = cb; emitStatus(); },
  };
}

/** User-facing explanation for a failure, used by the interview UI. */
export function speechFailureMessage(f: SpeechFailure | null): string {
  switch (f) {
    case 'unsupported': return 'This browser has no speech recognition. Chrome (Android or desktop) supports it — meanwhile you can type your answer below.';
    case 'insecure-context': return 'Speech recognition needs a secure (https) connection. Open the app over https, or type your answer below.';
    case 'not-allowed': return 'Microphone access for speech recognition was blocked. Allow the microphone for this site in your browser settings, then try again.';
    case 'audio-capture': return 'The microphone was not available to speech recognition — another app or tab may be using it. Close it and try again.';
    case 'network': return 'Speech recognition needs an internet connection (Chrome transcribes on Google servers). Check your connection and try again.';
    case 'language': return 'The selected language is not supported for speech recognition on this device. Try switching the app language, or type your answer.';
    case 'unstable': return 'Speech recognition kept disconnecting — this usually means the microphone is busy or the connection dropped.';
    case 'no-speech': return 'No speech was picked up. Check that the right microphone is selected and speak a little louder or closer.';
    default: return 'Speech could not be transcribed this time.';
  }
}
