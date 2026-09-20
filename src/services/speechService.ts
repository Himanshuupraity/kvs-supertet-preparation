/**
 * Thin wrapper over the Web Speech API (SpeechRecognition) for live transcription.
 * Chrome on Android / desktop supports it; Firefox and some iOS versions do not.
 * When unsupported, the UI offers a manual transcript box.
 */

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; }

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean { return !!getCtor(); }

export interface Transcriber {
  start(): void;
  stop(): Promise<string>;
  onUpdate: (cb: (finalText: string, interim: string) => void) => void;
}

export function createTranscriber(lang: 'en-IN' | 'hi-IN' = 'en-IN'): Transcriber | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  let finalText = ''; let interim = ''; let running = false; let manualStop = false;
  let update: (f: string, i: string) => void = () => {};
  let resolveStop: ((t: string) => void) | null = null;

  rec.onresult = (e) => {
    interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const t = res[0]?.transcript ?? '';
      if (res.isFinal) finalText += (finalText ? ' ' : '') + t.trim();
      else interim += t;
    }
    update(finalText, interim);
  };
  rec.onerror = (e) => { if (e.error === 'no-speech' || e.error === 'aborted') return; console.warn('speech error', e.error); };
  rec.onend = () => {
    if (running && !manualStop) { try { rec.start(); } catch { /* ignore */ } return; } // auto-restart on silence timeouts
    running = false;
    resolveStop?.(finalText);
  };
  return {
    start() { manualStop = false; running = true; try { rec.start(); } catch { /* already started */ } },
    stop() { return new Promise<string>((res) => { manualStop = true; resolveStop = res; try { rec.stop(); } catch { res(finalText); } setTimeout(() => res(finalText), 1500); }); },
    onUpdate(cb) { update = cb; },
  };
}
