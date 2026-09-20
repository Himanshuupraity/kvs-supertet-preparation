import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Mic, ShieldCheck, Sparkles, Info } from 'lucide-react';
import type { InterviewMode } from '@/types/models';
import { planSession } from '@/services/interviewService';
import { useInterviewStore } from '@/store/useInterviewStore';
import { aiAvailable } from '@/services/aiService';
import { speechSupported } from '@/services/speechService';
import { Button, Card, PageHeader } from '@/components/ui';

const MODES: { id: InterviewMode; title: string; desc: string; qs: string }[] = [
  { id: 'beginner', title: 'Beginner', desc: 'Introduction and basic pedagogy. Gentle pace, no follow-ups.', qs: '5 questions · ~10 min' },
  { id: 'standard', title: 'Standard', desc: 'Mix of pedagogy, scenarios and policy with occasional follow-ups.', qs: '8 questions · ~20 min' },
  { id: 'advanced', title: 'Advanced', desc: 'Scenario-heavy, NEP/NCF depth, probing follow-ups.', qs: '10 questions · ~25 min' },
  { id: 'full', title: 'Full Mock Interview', desc: 'Realistic board structure: introduction → pedagogy → psychology → scenarios → subject → NEP → KVS → situational → closing.', qs: '18 questions · ~40 min' },
];

export default function InterviewSetupPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const saveSession = useInterviewStore((s) => s.saveSession);
  const [mode, setMode] = useState<InterviewMode>('standard');
  const [ai, setAi] = useState<boolean | null>(null);
  const [agree, setAgree] = useState(false);
  const single = sp.get('question');
  useEffect(() => { aiAvailable().then(setAi); }, []);

  const start = () => {
    const session = planSession(mode);
    if (single) { session.plannedQuestionIds = [single]; session.mode = 'standard'; }
    saveSession(session);
    nav(`/kvs/interview/${session.id}`, { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader back="/kvs" title="AI Mock Interview" subtitle="Answer on camera like a real board interview. After each answer you get a score out of 100 with specific feedback." />
      {!single && (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)} aria-pressed={mode === m.id} className={`card p-4 text-left border-2 ${mode === m.id ? 'border-rose-500 bg-rose-50' : 'border-transparent'}`}>
              <div className="flex justify-between items-center"><p className="font-bold">{m.title}</p><span className="text-xs text-ink-muted">{m.qs}</span></div>
              <p className="text-sm text-ink-muted mt-1">{m.desc}</p>
            </button>
          ))}
        </div>
      )}
      {single && <Card className="text-sm">Single-question practice. You will answer one question on video and receive feedback.</Card>}

      <Card className="space-y-2 text-sm">
        <p className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-rose-600" /> How evaluation works</p>
        <p className="text-ink-muted">{ai === null ? 'Checking AI service…' : ai ? 'AI evaluation is connected: your transcript is analysed by the language model on your server for content, relevance, structure and teaching approach, and follow-up questions are generated from your actual answer.' : 'AI backend not connected — using the built-in rubric: key-point coverage, relevance, structure words, pace, filler words and observable presentation metrics. Follow-ups come from a structured question tree. Connect the server (see README) to enable dynamic AI.'}</p>
        <p className="text-ink-muted flex gap-2"><Info size={16} className="shrink-0 mt-0.5" /> Speech-to-text: {speechSupported() ? 'supported in this browser (Chrome recommended).' : 'NOT supported in this browser — you will be able to type your answer after recording. Use Chrome on Android/desktop for live transcription.'}</p>
      </Card>

      <Card className="space-y-2 text-sm border-brand-100">
        <p className="font-bold flex items-center gap-2"><ShieldCheck size={18} className="text-brand-600" /> Camera, microphone & privacy</p>
        <ul className="list-disc pl-5 text-ink-muted space-y-1">
          <li><Camera size={14} className="inline" /> <Mic size={14} className="inline" /> Camera and microphone permission is required when you press “Start Answer”.</li>
          <li>Video is processed on your device. Recordings are <b>not stored</b> unless you explicitly choose “Save this recording” after an answer; saved recordings stay in this browser and can be deleted from Profile.</li>
          <li>If AI is connected, only the text transcript and numeric metrics (word count, pace, filler count, approximate face-in-frame ratio) are sent to your server — never the video or audio.</li>
          <li>Presentation metrics (face in frame, centring, movement) are approximate and describe only what is visible. The app makes <b>no</b> claims about emotions, personality or attention.</li>
        </ul>
        <label className="flex items-start gap-3 pt-1"><input type="checkbox" className="w-5 h-5 mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I understand and agree.</span></label>
      </Card>
      <Button full size="lg" disabled={!agree} onClick={start} className="!bg-rose-600 hover:!bg-rose-700"><Mic /> Start AI Interview</Button>
    </div>
  );
}
