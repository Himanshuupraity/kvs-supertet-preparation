import type { TestAnswer } from '@/types/models';
import { cn } from '@/utils/cn';

export function paletteState(a: TestAnswer | undefined): 'answered' | 'marked' | 'answered-marked' | 'visited' | 'not-visited' {
  if (!a) return 'not-visited';
  if (a.selected && a.markedForReview) return 'answered-marked';
  if (a.selected) return 'answered';
  if (a.markedForReview) return 'marked';
  return a.visited ? 'visited' : 'not-visited';
}

const styles: Record<ReturnType<typeof paletteState>, string> = {
  answered: 'bg-emerald-500 text-white', marked: 'bg-violet-500 text-white', 'answered-marked': 'bg-violet-500 text-white ring-2 ring-emerald-400',
  visited: 'bg-red-100 text-red-700', 'not-visited': 'bg-white text-ink-muted border border-surface-border',
};

export function QuestionPalette({ ids, answers, current, onJump }: { ids: string[]; answers: Record<string, TestAnswer>; current: number; onJump: (i: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {ids.map((id, i) => (
          <button key={id} type="button" onClick={() => onJump(i)} aria-label={`Question ${i + 1}, ${paletteState(answers[id]).replace('-', ' ')}`}
            className={cn('h-10 rounded-lg text-sm font-bold', styles[paletteState(answers[id])], i === current && 'outline outline-2 outline-brand-600 outline-offset-1')}>{i + 1}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-ink-muted">
        <Legend cls="bg-emerald-500" label="Answered" /><Legend cls="bg-violet-500" label="Marked" /><Legend cls="bg-red-100 border border-red-200" label="Skipped" /><Legend cls="bg-white border border-surface-border" label="Not visited" />
      </div>
    </div>
  );
}
function Legend({ cls, label }: { cls: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className={cn('w-3.5 h-3.5 rounded', cls)} />{label}</span>; }
