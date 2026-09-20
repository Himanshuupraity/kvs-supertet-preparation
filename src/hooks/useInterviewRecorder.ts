import { useCallback, useEffect, useRef, useState } from 'react';
import type { PresentationMetrics } from '@/types/models';
import { createTranscriber, speechSupported, type Transcriber } from '@/services/speechService';
import { PresentationAnalyzer } from '@/services/presentationAnalyzer';

export interface RecordingResult { blob: Blob | null; transcript: string; durationSec: number; presentation: PresentationMetrics | null; transcriptSource: 'speech-api' | 'none'; }

/**
 * Manages camera/mic stream, MediaRecorder, live speech transcription and presentation sampling.
 * Everything runs on-device.
 */
export function useInterviewRecorder(videoRef: React.RefObject<HTMLVideoElement | null>, lang: 'en-IN' | 'hi-IN') {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveText, setLiveText] = useState<{ final: string; interim: string }>({ final: '', interim: '' });
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const transcriber = useRef<Transcriber | null>(null);
  const analyzer = useRef<PresentationAnalyzer | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);

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
    const mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
    try {
      recorder.current = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      recorder.current.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      recorder.current.start(1000);
    } catch { recorder.current = null; }
    if (speechSupported()) {
      transcriber.current = createTranscriber(lang);
      transcriber.current?.onUpdate((f, i) => setLiveText({ final: f, interim: i }));
      transcriber.current?.start();
    }
    if (videoRef.current) { analyzer.current = new PresentationAnalyzer(videoRef.current); analyzer.current.start(); }
    startedAt.current = Date.now();
    setElapsed(0); setLiveText({ final: '', interim: '' }); setRecording(true);
    timer.current = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return true;
  }, [stream, openCamera, lang, videoRef]);

  const stop = useCallback(async (): Promise<RecordingResult> => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
    const presentation = analyzer.current?.stop() ?? null; analyzer.current = null;
    const transcript = transcriber.current ? await transcriber.current.stop() : '';
    transcriber.current = null;
    const blob = await new Promise<Blob | null>((res) => {
      const r = recorder.current;
      if (!r || r.state === 'inactive') return res(chunks.current.length ? new Blob(chunks.current, { type: chunks.current[0].type }) : null);
      r.onstop = () => res(chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || 'video/webm' }) : null);
      r.stop();
    });
    recorder.current = null;
    setRecording(false);
    return { blob, transcript: transcript.trim(), durationSec, presentation, transcriptSource: transcript.trim() ? 'speech-api' : 'none' };
  }, []);

  // stop tracks when the stream changes / on unmount; the elapsed timer is owned by start()/stop() only
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); }, []);

  return { stream, permissionError, recording, elapsed, liveText, openCamera, closeCamera, start, stop };
}
