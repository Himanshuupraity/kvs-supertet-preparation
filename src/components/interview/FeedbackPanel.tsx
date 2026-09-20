import type { InterviewFeedback } from '@/types/models';
import { CheckCircle2, AlertCircle, ListOrdered, Dumbbell, Activity, Sparkles } from 'lucide-react';
import { LABELS, MAXES } from '@/services/interviewService';
import { ProgressBar, Badge } from '@/components/ui';

export function ScoreBreakdownList({ b }: { b: InterviewFeedback['breakdown'] }) {
  return (
    <ul className="space-y-2">
      {(Object.keys(MAXES) as (keyof typeof MAXES)[]).map((k) => {
        const pct = (b[k] / MAXES[k]) * 100;
        return (
          <li key={k}>
            <div className="flex justify-between text-sm mb-0.5"><span>{LABELS[k]}</span><span className="tabular-nums font-semibold">{b[k]}<span className="text-ink-faint">/{MAXES[k]}</span></span></div>
            <ProgressBar value={pct} color={pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
          </li>
        );
      })}
    </ul>
  );
}

export function FeedbackPanel({ fb, sampleAnswer }: { fb: InterviewFeedback; sampleAnswer?: string }) {
  const c = fb.communication;
  return (
    <div className="space-y-3">
      <div className="card p-4 flex items-center gap-4">
        <div className="w-20 h-20 rounded-full grid place-items-center border-[6px] border-rose-500 shrink-0"><span className="text-2xl font-extrabold tabular-nums">{fb.breakdown.total}</span></div>
        <div className="flex-1">
          <p className="font-bold text-lg">Score {fb.breakdown.total}/100</p>
          <p className="text-xs text-ink-muted">Evaluated by {fb.evaluatedBy === 'ai' ? 'AI (LLM) + on-device metrics' : 'built-in rubric (offline)'}. Scores are transparent — see the breakdown.</p>
          <Badge tone={fb.evaluatedBy === 'ai' ? 'violet' : 'gray'} className="mt-1"><Sparkles size={12} /> {fb.evaluatedBy === 'ai' ? 'AI evaluation' : 'Rubric evaluation'}</Badge>
        </div>
      </div>
      <div className="card p-4"><p className="font-bold mb-2">Score breakdown</p><ScoreBreakdownList b={fb.breakdown} /></div>
      <div className="card p-4">
        <p className="font-bold mb-2 flex items-center gap-2"><Activity size={18} className="text-ink-muted" /> Communication metrics</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric v={c.wordCount} l="words" /><Metric v={`${c.durationSec}s`} l="duration" /><Metric v={c.wordsPerMinute} l="words/min" />
          <Metric v={c.fillerWords} l="filler words" /><Metric v={c.repeatedPhrases} l="repeated phrases" /><Metric v={c.sentenceCount} l="sentences" />
        </div>
        {fb.presentation && (
          <div className="mt-3 text-xs text-ink-muted">
            <p className="font-semibold text-ink mb-1">Presentation (observable only)</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric v={fb.presentation.faceVisibleRatio === null ? 'n/a' : `${Math.round(fb.presentation.faceVisibleRatio * 100)}%`} l="face in frame" />
              <Metric v={fb.presentation.centeredRatio === null ? 'n/a' : `${Math.round(fb.presentation.centeredRatio * 100)}%`} l="facing camera" />
              <Metric v={fb.presentation.motionScore === null ? 'n/a' : fb.presentation.motionScore < 0.15 ? 'steady' : fb.presentation.motionScore < 0.35 ? 'some' : 'high'} l="movement" />
            </div>
            <p className="mt-1.5">{fb.presentation.note}</p>
          </div>
        )}
      </div>
      <Block icon={<CheckCircle2 className="text-emerald-600" />} title="Strong areas" items={fb.strengths} cls="bg-emerald-50 border-emerald-100" />
      <Block icon={<AlertCircle className="text-amber-600" />} title="Areas to improve" items={fb.improvements.length ? fb.improvements : ['Nothing major — keep the same quality and add one more example.']} cls="bg-amber-50 border-amber-100" />
      {fb.missingPoints.length > 0 && <Block icon={<AlertCircle className="text-red-600" />} title="What was missing from your answer" items={fb.missingPoints} cls="bg-red-50 border-red-100" />}
      <div className="card p-4">
        <p className="font-bold mb-2 flex items-center gap-2"><ListOrdered size={18} className="text-brand-600" /> Better answer structure</p>
        <ol className="space-y-1.5">{fb.betterStructure.map((s, i) => <li key={i} className="flex gap-2 text-sm"><span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold grid place-items-center shrink-0">{i + 1}</span>{s}</li>)}</ol>
        {sampleAnswer && <details className="mt-3"><summary className="text-sm font-semibold text-brand-700 cursor-pointer">Show a model answer (after reflecting on the gaps above)</summary><p className="text-sm leading-relaxed mt-2 whitespace-pre-line">{sampleAnswer}</p></details>}
      </div>
      <Block icon={<Dumbbell className="text-violet-600" />} title="Recommended practice" items={fb.recommendedPractice} cls="bg-violet-50 border-violet-100" />
    </div>
  );
}

function Metric({ v, l }: { v: string | number; l: string }) { return <div className="rounded-lg bg-surface-muted py-2"><p className="font-bold tabular-nums">{v}</p><p className="text-[11px] text-ink-muted">{l}</p></div>; }
function Block({ icon, title, items, cls }: { icon: React.ReactNode; title: string; items: string[]; cls: string }) {
  return <div className={`card p-4 ${cls}`}><p className="font-bold mb-2 flex items-center gap-2">{icon} {title}</p><ul className="space-y-1.5">{items.map((s, i) => <li key={i} className="text-sm flex gap-2"><span>•</span><span>{s}</span></li>)}</ul></div>;
}
