import type { Question } from '@/types/models';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

export function ExplanationPanel({ q, selected }: { q: Question; selected: 'A' | 'B' | 'C' | 'D' | null }) {
  const correctOpt = q.options.find((o) => o.key === q.correct)!;
  const isCorrect = selected === q.correct;
  return (
    <div className="card p-4 space-y-3">
      <div className={`flex items-center gap-2 font-bold ${isCorrect ? 'text-emerald-700' : selected ? 'text-red-700' : 'text-ink-muted'}`}>
        {isCorrect ? <CheckCircle2 /> : selected ? <XCircle /> : <BookOpen />}
        {isCorrect ? 'Correct ✓' : selected ? `Incorrect — correct answer is ${q.correct}` : `Not attempted — correct answer is ${q.correct}`}
      </div>
      <p className="text-[15px]"><span className="font-semibold">{q.correct}. </span>{correctOpt.text}</p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-1">Explanation</p>
        <p className="text-[15px] leading-relaxed text-ink">{q.explanation}</p>
      </div>
      {q.options.some((o) => o.whyIncorrect) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-1">Why other options are incorrect</p>
          <ul className="space-y-1.5">
            {q.options.filter((o) => o.key !== q.correct).map((o) => (
              <li key={o.key} className="text-sm text-ink-muted flex gap-2"><span className="font-bold text-ink shrink-0">{o.key} —</span><span>{o.whyIncorrect ?? 'Does not match the correct answer.'}</span></li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-2 text-xs text-ink-muted pt-1 border-t border-surface-border">
        <p><span className="font-semibold">Source/Reference:</span> {q.source}</p>
        <p><span className="font-semibold">Exam relevance:</span> {q.examRelevance}</p>
      </div>
    </div>
  );
}
