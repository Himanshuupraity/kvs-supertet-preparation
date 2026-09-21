import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Mic, Square, X, ChevronRight, Volume2, Save, Loader2, Camera, Keyboard, AlertTriangle } from 'lucide-react';
import type { InterviewAnswer, InterviewFeedback, InterviewQuestion, InterviewSession } from '@/types/models';
import { useInterviewStore } from '@/store/useInterviewStore';
import { useUserStore } from '@/store/useUserStore';
import { useProgressStore } from '@/store/useProgressStore';
import { getInterviewQuestion } from '@/services/contentService';
import { evaluateAnswer, generateFollowUp } from '@/services/aiService';
import { pickFollowUp } from '@/services/evaluationService';
import { buildReport } from '@/services/interviewService';
import { saveRecording } from '@/services/recordingStorage';
import { useInterviewRecorder } from '@/hooks/useInterviewRecorder';
import { speechFailureMessage, type SpeechFailure } from '@/services/speechService';
import { FeedbackPanel } from '@/components/interview/FeedbackPanel';
import { Button, Modal } from '@/components/ui';
import { uid } from '@/utils/ids';
import { secondsToClock } from '@/utils/dates';

type Phase = 'ask' | 'recording' | 'processing' | 'transcript' | 'feedback';
interface QueueItem { question: InterviewQuestion; text: string; isFollowUp: boolean; }

export default function InterviewSessionPage() {
  const { sessionId = '' } = useParams();
  const nav = useNavigate();
  const stored = useInterviewStore((s) => s.sessions[sessionId]);
  const saveSession = useInterviewStore((s) => s.saveSession);
  const profile = useUserStore((s) => s.profile);
  const { bumpDaily, markInterviewPracticed } = useProgressStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lang = profile?.language === 'hi' ? 'hi-IN' : 'en-IN';
  const rec = useInterviewRecorder(videoRef, lang);

  const [session, setSession] = useState<InterviewSession | undefined>(stored);
  const [queue, setQueue] = useState<QueueItem[]>(() => (stored ? stored.plannedQuestionIds.slice(stored.answers.filter((a) => !a.isFollowUp).length).map((id) => getInterviewQuestion(id)).filter(Boolean).map((q) => ({ question: q!, text: q!.question, isFollowUp: false })) : []));
  const [phase, setPhase] = useState<Phase>('ask');
  const [pending, setPending] = useState<{ blob: Blob | null; transcript: string; durationSec: number; presentation: InterviewFeedback['presentation']; source: InterviewAnswer['transcriptSource']; speechFailure: SpeechFailure | null; micHeardAudio: boolean } | null>(null);
  const [manual, setManual] = useState('');
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [nextFollowUp, setNextFollowUp] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [quit, setQuit] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const current = queue[0];
  const answeredCount = session?.answers.length ?? 0;
  const totalPlanned = (session?.plannedQuestionIds.length ?? 0) + (session?.answers.filter((a) => a.isFollowUp).length ?? 0) + queue.filter((q) => q.isFollowUp).length + (nextFollowUp ? 1 : 0);

  const persist = useCallback((s: InterviewSession) => { setSession(s); saveSession(s); }, [saveSession]);

  // Text-to-speech: the "interviewer" reads the question aloud (optional)
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN'; u.rate = 0.95;
    u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  const startAnswer = async () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const ok = await rec.start();
    if (ok) setPhase('recording');
  };

  const stopAnswer = async () => {
    const r = await rec.stop();
    setPending({ blob: r.blob, transcript: r.transcript, durationSec: r.durationSec, presentation: r.presentation, source: r.transcriptSource, speechFailure: r.speechFailure, micHeardAudio: r.micHeardAudio });
    if (!r.transcript || r.transcript.split(/\s+/).length < 8) { setManual(r.transcript); setPhase('transcript'); }
    else await evaluate(r.transcript, r.durationSec, r.presentation, r.transcriptSource);
  };

  const evaluate = async (transcript: string, durationSec: number, presentation: InterviewFeedback['presentation'], source: InterviewAnswer['transcriptSource']) => {
    if (!current || !session) return;
    setPhase('processing');
    const fb = await evaluateAnswer({ question: current.question, transcript, durationSec, presentation });
    const answer: InterviewAnswer = {
      id: uid('ans'), questionId: current.isFollowUp ? null : current.question.id, questionText: current.text, isFollowUp: current.isFollowUp,
      transcript, transcriptSource: source, durationSec, feedback: fb, answeredAt: new Date().toISOString(),
    };
    const next: InterviewSession = { ...session, answers: [...session.answers, answer] };
    persist(next);
    setFeedback(fb);
    if (!current.isFollowUp) markInterviewPracticed(current.question.id);
    // decide follow-up (not in beginner mode, not after a follow-up, not for closing questions)
    let fu: string | null = null;
    if (session.mode !== 'beginner' && !current.isFollowUp && current.question.categoryId !== 'closing') {
      fu = await generateFollowUp(current.text, transcript, fb);
      if (!fu) {
        const chance = session.mode === 'advanced' ? 0.7 : session.mode === 'full' ? 0.4 : 0.5;
        if (fb.missingPoints.length > 0 || Math.random() < chance) fu = pickFollowUp(current.question, fb);
      }
    }
    setNextFollowUp(fu);
    setPhase('feedback');
  };

  const saveVideo = async () => {
    if (!pending?.blob || !session) return;
    const key = `${session.id}:${session.answers.length}`;
    await saveRecording(key, pending.blob);
    const answers = [...session.answers]; answers[answers.length - 1] = { ...answers[answers.length - 1], recordingBlobKey: key };
    persist({ ...session, answers });
    setSaved(true);
  };

  const proceed = () => {
    if (!session) return;
    const rest = queue.slice(1);
    const nextQueue = nextFollowUp && current ? [{ question: current.question, text: nextFollowUp, isFollowUp: true }, ...rest] : rest;
    setQueue(nextQueue); setFeedback(null); setPending(null); setManual(''); setSaved(false); setNextFollowUp(null);
    if (nextQueue.length === 0) {
      const report = buildReport(session);
      persist({ ...session, status: 'completed', completedAt: new Date().toISOString(), overallScore: report.overall, report });
      bumpDaily({ aiInterviews: 1, studySeconds: session.answers.reduce((a, x) => a + x.durationSec, 0) });
      rec.closeCamera();
      nav(`/kvs/interview/${session.id}/report`, { replace: true });
    } else setPhase('ask');
  };

  const abandon = () => {
    if (!session) return;
    if (session.answers.length) { const report = buildReport(session); persist({ ...session, status: 'completed', completedAt: new Date().toISOString(), overallScore: report.overall, report }); nav(`/kvs/interview/${session.id}/report`, { replace: true }); }
    else { persist({ ...session, status: 'abandoned' }); nav('/kvs', { replace: true }); }
    rec.closeCamera();
  };

  const progressPct = useMemo(() => (totalPlanned ? Math.round((answeredCount / totalPlanned) * 100) : 0), [answeredCount, totalPlanned]);

  if (!stored) return <Navigate to="/kvs" replace />;
  if (stored.status === 'completed') return <Navigate to={`/kvs/interview/${sessionId}/report`} replace />;
  if (!session || !current) return <div className="p-6 text-center text-ink-muted">No questions available for this session.</div>;

  return (
    <div className="min-h-dvh flex flex-col bg-slate-950 text-white">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur pt-[var(--safe-top)]">
        <div className="max-w-3xl mx-auto px-3 h-14 flex items-center gap-2">
          <button type="button" onClick={() => setQuit(true)} className="tap grid place-items-center rounded-xl text-slate-300" aria-label="End interview"><X size={22} /></button>
          <div className="flex-1 min-w-0"><p className="text-xs text-slate-400 capitalize">{session.mode === 'full' ? 'Full mock interview' : `${session.mode} interview`}</p><p className="font-bold text-sm">Question {phase === 'feedback' ? answeredCount : answeredCount + 1}{current.isFollowUp ? ' (follow-up)' : ''} · {answeredCount}/{totalPlanned} answered</p></div>
          {phase === 'recording' && <span className="chip bg-red-600 text-white animate-pulse">● REC {secondsToClock(rec.elapsed)}</span>}
        </div>
        <div className="h-1 bg-slate-800"><div className="h-full bg-rose-500 transition-all" style={{ width: `${progressPct}%` }} /></div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-3 py-4 space-y-4">
        {/* Interviewer question */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-rose-600 grid place-items-center shrink-0 font-bold">AI</span>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">{current.isFollowUp ? 'Interviewer (follow-up)' : 'Interviewer'}</p>
              <p className="text-lg leading-relaxed font-medium">{current.text}</p>
              {!current.isFollowUp && current.question.questionHi && current.question.questionHi !== current.text && <p className="hindi text-slate-300 mt-1">{current.question.questionHi}</p>}
            </div>
            <button type="button" onClick={() => speak(current.text)} className={`tap grid place-items-center rounded-xl ${speaking ? 'text-rose-400' : 'text-slate-400'}`} aria-label="Read question aloud"><Volume2 size={20} /></button>
          </div>
        </div>

        {/* Video area */}
        {(phase === 'ask' || phase === 'recording') && (
          <div className="rounded-2xl overflow-hidden bg-black relative aspect-[4/3] sm:aspect-video">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
            {!rec.stream && (
              <div className="absolute inset-0 grid place-items-center text-center p-6">
                <div><Camera size={36} className="mx-auto text-slate-500 mb-2" /><p className="text-slate-300 text-sm">Camera preview appears here when you start your answer.</p>
                  <button type="button" onClick={() => rec.openCamera()} className="mt-3 text-sm underline text-slate-300">Test camera first</button></div>
              </div>
            )}
            {rec.permissionError && <div className="absolute inset-x-3 bottom-3 rounded-xl bg-red-600/90 text-sm p-3">{rec.permissionError}</div>}
            {phase === 'recording' && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-sm">
                <p className="text-slate-300 text-xs mb-0.5">Live transcript {rec.liveText.final || rec.liveText.interim ? '' : '(listening…)'}</p>
                <p className="line-clamp-3">{rec.liveText.final} <span className="text-slate-400">{rec.liveText.interim}</span></p>
                {rec.speechFailure && rec.speechFailure !== 'no-speech' && !rec.liveText.final && (
                  <p className="mt-1 text-xs text-amber-300 flex items-start gap-1"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {speechFailureMessage(rec.speechFailure)} Keep answering — you can type the transcript after stopping.</p>
                )}
              </div>
            )}
          </div>
        )}

        {phase === 'ask' && (
          <div className="space-y-2">
            <p className="text-center text-sm text-slate-400">Take a breath. Think for a few seconds. Then press Start and answer as you would to the board (60–120 seconds).</p>
            {rec.speechBlocked && <p className="rounded-xl bg-amber-900/40 border border-amber-800 text-amber-100 text-sm p-3">{speechFailureMessage(rec.speechBlocked)}</p>}
            <Button full size="lg" onClick={startAnswer} className="!bg-rose-600 hover:!bg-rose-700"><Mic /> Start Answer</Button>
          </div>
        )}
        {phase === 'recording' && <Button full size="lg" onClick={stopAnswer} className="!bg-white !text-slate-900 hover:!bg-slate-200"><Square className="fill-current" /> Stop Answer</Button>}

        {phase === 'processing' && <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center"><Loader2 className="animate-spin mx-auto mb-2" /><p className="font-semibold">Evaluating your answer…</p><p className="text-sm text-slate-400">Checking content coverage, relevance, structure, fluency and presentation.</p></div>}

        {phase === 'transcript' && pending && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <p className="font-semibold flex items-center gap-2"><AlertTriangle size={18} className="text-amber-400 shrink-0" /> {pending.source === 'none' ? 'Your answer could not be transcribed.' : 'Only a very short transcript was captured.'}</p>
            {pending.source === 'none' && <p className="text-sm text-amber-200">{speechFailureMessage(pending.speechFailure)}</p>}
            {pending.source === 'none' && pending.speechFailure === 'no-speech' && !pending.micHeardAudio && <p className="text-sm text-amber-200">The microphone recorded almost no sound for {pending.durationSec}s — check that the right input device is selected and that the mic is not muted.</p>}
            <p className="text-sm text-slate-400 flex items-center gap-2"><Keyboard size={18} className="shrink-0" /> Type (or correct) what you said so it can be evaluated. Recorded for {pending.durationSec}s.</p>
            <textarea className="input !bg-slate-800 !border-slate-700 !text-white min-h-[140px]" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Type your answer here…" />
            <div className="flex gap-2">
              <Button variant="secondary" full onClick={() => { setPhase('ask'); setPending(null); }}>Re-record</Button>
              <Button full disabled={manual.trim().split(/\s+/).length < 5} onClick={() => evaluate(manual.trim(), pending.durationSec, pending.presentation, 'manual')} className="!bg-rose-600">Evaluate</Button>
            </div>
          </div>
        )}

        {phase === 'feedback' && feedback && (
          <div className="space-y-3 text-ink">
            <FeedbackPanel fb={feedback} sampleAnswer={current.isFollowUp ? undefined : current.question.sampleAnswer} />
            <div className="card p-4 text-sm space-y-2">
              <p className="font-semibold">Your transcript</p>
              <p className="text-ink-muted whitespace-pre-line">{session.answers[session.answers.length - 1]?.transcript}</p>
              {pending?.blob && (
                <div className="pt-2 border-t border-surface-border flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={saveVideo} disabled={saved}><Save size={16} /> {saved ? 'Recording saved on this device' : 'Save this recording (on device only)'}</Button>
                  {!saved && <span className="text-xs text-ink-faint">Otherwise it is discarded now.</span>}
                </div>
              )}
            </div>
            {nextFollowUp && <div className="rounded-2xl bg-rose-900/40 border border-rose-800 p-3 text-sm text-rose-100"><b>Follow-up coming:</b> the interviewer wants to probe further based on your answer.</div>}
            <Button full size="lg" onClick={proceed} className="!bg-rose-600 hover:!bg-rose-700">{queue.length === 1 && !nextFollowUp ? 'Finish & see report' : 'Continue to next question'} <ChevronRight /></Button>
          </div>
        )}
      </div>

      <Modal open={quit} onClose={() => setQuit(false)} title="End interview?">
        <p className="text-sm text-ink-muted mb-4">{session.answers.length ? `You have answered ${session.answers.length} question(s). Ending now will generate a report from those answers.` : 'No answers yet — the session will be discarded.'}</p>
        <div className="flex gap-2"><Button variant="secondary" full onClick={() => setQuit(false)}>Continue</Button><Button variant="danger" full onClick={abandon}>End interview</Button></div>
      </Modal>
    </div>
  );
}
