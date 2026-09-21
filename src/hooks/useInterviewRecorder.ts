import { useCallback, useEffect, useRef, useState } from 'react';
import type { PresentationMetrics } from '@/types/models';
import { createTranscriber, speechUnavailableReason, type SpeechFailure, type Transcriber } from '@/services/speechService';
import { PresentationAnalyzer } from '@/services/presentationAnalyzer';

export interface RecordingResult {
  blob: Blob | null;
  transcript: string;
  durationSec: number;
  presentation: PresentationMetrics | null;
  transcriptSource: 'speech-api' | 'none';
  /** why the transcript is empty (null when we got one) */
  speechFailure: SpeechFailure | null;
  /** did the microphone itself pick up any sound? distinguishes a dead mic from a dead recogniser */
  micHeardAudio: boolean;
}

/** Watches the raw mic track so we can tell "mic was silent" from "recogniser failed". */
class MicLevelMonitor {
  private ctx: AudioContext | null = null;
  private raf: number | null = null;
  private peak = 0;
  constructor(private stream: MediaStream) {}

  start() {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor || !this.stream.getAudioTracks().length) return;
    try {
      this.ctx = new Ctor();
      void this.ctx.resume().catch(() => {});
      const src = this.ctx.createMediaStreamSource(this.stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        this.peak = Math.max(this.peak, Math.sqrt(sum / buf.length));
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { this.ctx = null; }
  }

  /** true when the mic saw more than room noise at some point */
  stop(): boolean {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    return this.peak > 0.02;
  }
}

/**
 * Manages camera/mic stream, MediaRecorder, live speech transcription and presentation sampling.
 * Everything runs on-device (Chrome's recogniser itself uses Google's speech service).
 */
export function useInterviewRecorder(videoRef: React.RefObject<HTMLVideoElement | null>, lang: 'en-IN' | 'hi-IN') {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveText, setLiveText] = useState<{ final: string; interim: string }>({ final: '', interim: '' });
  const [speechFailure, setSpeechFailure] = useState<SpeechFailure | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const transcriber = useRef<Transcriber | null>(null);
  const analyzer = useRef<PresentationAnalyzer | null>(null);
  const micMonitor = useRef<MicLevelMonitor | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);

  /** non-null when speech recognition cannot even be attempted in this browser */
  const speechBlocked = speechUnavailableReason();

  const openCamera = useCallback(async () => {
    setPermissionError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: { echoCancellation: true, noiseSuppression: true } });
      setStream(s);
      return s;
    } catch (e) {
      const err = e as DOMException;
      setPermissionError(err.name === 'NotAllowedError' ? 'Camera/microphone permission was denied. Allow access in your browser settings and try again.' : err.name === 'NotFoundError' ? 'No camera or microphone found on this device.' : `Could not start camera: ${err.message}`);
      return null;
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v && stream) { v.srcObject = stream; v.muted = true; v.play().catch(() => {}); }
  }, [stream, videoRef]);

  const closeCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const start = useCallback(async () => {
    let s = stream;
    if (!s) s = await openCamera();
    if (!s) return false;
    chunks.current = [];
    setSpeechFailure(speechBlocked);
    const mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
    try {
      recorder.current = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      recorder.current.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      recorder.current.start(1000);
    } catch { recorder.current = null; }
    micMonitor.current = new MicLevelMonitor(s);
    micMonitor.current.start();
    if (!speechBlocked) {
      transcriber.current = createTranscriber(lang);
      transcriber.current?.onUpdate((f, i) => setLiveText({ final: f, interim: i }));
      transcriber.current?.onStatus((st) => setSpeechFailure(st.failure));
      transcriber.current?.start();
    }
    if (videoRef.current) { analyzer.current = new PresentationAnalyzer(videoRef.current); analyzer.current.start(); }
    startedAt.current = Date.now();
    setElapsed(0); setLiveText({ final: '', interim: '' }); setRecording(true);
    timer.current = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return true;
  }, [stream, openCamera, lang, videoRef, speechBlocked]);

  const stop = useCallback(async (): Promise<RecordingResult> => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
    const presentation = analyzer.current?.stop() ?? null; analyzer.current = null;
    const micHeardAudio = micMonitor.current?.stop() ?? false; micMonitor.current = null;
    const speech = transcriber.current ? await transcriber.current.stop() : null;
    transcriber.current = null;
    const blob = await new Promise<Blob | null>((res) => {
      const r = recorder.current;
      if (!r || r.state === 'inactive') return res(chunks.current.length ? new Blob(chunks.current, { type: chunks.current[0].type }) : null);
      r.onstop = () => res(chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || 'video/webm' }) : null);
      r.stop();
    });
    recorder.current = null;
    setRecording(false);
    const transcript = (speech?.transcript ?? '').trim();
    // a silent mic explains the empty transcript better than any recogniser error
    const failure: SpeechFailure | null = transcript ? null
      : speechBlocked ?? (!micHeardAudio ? 'no-speech' : speech?.failure ?? 'unknown');
    setSpeechFailure(failure);
    return { blob, transcript, durationSec, presentation, transcriptSource: transcript ? 'speech-api' : 'none', speechFailure: failure, micHeardAudio };
  }, [speechBlocked]);

  // stop tracks when the stream changes / on unmount; the elapsed timer is owned by start()/stop() only
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); }, []);

  return { stream, permissionError, recording, elapsed, liveText, speechFailure, speechBlocked, openCamera, closeCamera, start, stop };
}
