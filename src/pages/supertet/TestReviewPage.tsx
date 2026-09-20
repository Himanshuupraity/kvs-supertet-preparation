import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useProgressStore } from '@/store/useProgressStore';
import { getQuestion } from '@/services/contentService';
import { PageHeader } from '@/components/ui';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { OptionList } from '@/components/exam/OptionList';
import { ExplanationPanel } from '@/components/exam/ExplanationPanel';

type Filter = 'all' | 'wrong' | 'unanswered' | 'marked' | 'correct';

export default function TestReviewPage() {
  const { attemptId = '' } = useParams();
  const attempt = useProgressStore((s) => s.attempts[attemptId]);
  const { toggleBookmark, bookmarks } = useProgressStore();
  const [filter, setFilter] = useState<Filter>('wrong');
  if (!attempt || attempt.status !== 'submitted') return <Navigate to="/supertet" replace />;

  const items = attempt.config.questionIds.map((id, i) => ({ q: getQuestion(id), a: attempt.answers[id], i })).filter((x) => x.q);
  const counts = {
    all: items.length,
    wrong: items.filter((x) => x.a.selected && x.a.selected !== x.q!.correct).length,
    unanswered: items.filter((x) => !x.a.selected).length,
    marked: items.filter((x) => x.a.markedForReview).length,
    correct: items.filter((x) => x.a.selected === x.q!.correct).length,
  };
  const shown = items.filter((x) => filter === 'all' || (filter === 'wrong' && x.a.selected && x.a.selected !== x.q!.correct) || (filter === 'unanswered' && !x.a.selected) || (filter === 'marked' && x.a.markedForReview) || (filter === 'correct' && x.a.selected === x.q!.correct));

  return (
    <div className="space-y-4">
      <PageHeader back={`/supertet/test/${attemptId}/result`} title="Review answers" subtitle={attempt.config.title} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {(['wrong', 'unanswered', 'marked', 'correct', 'all'] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`chip !py-2 !px-3 !text-sm border capitalize shrink-0 ${filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{f} ({counts[f]})</button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-center text-ink-muted py-10">Nothing in this filter.</p>}
      <div className="space-y-5">
        {shown.map(({ q, a, i }) => (
          <div key={q!.id} className="space-y-2">
            <QuestionCard q={q!} index={i} total={items.length} marked={a.markedForReview} bookmarked={bookmarks.some((b) => b.questionId === q!.id)} onBookmark={() => toggleBookmark(q!.id)} />
            <OptionList options={q!.options} selected={a.selected} correct={q!.correct} />
            <ExplanationPanel q={q!} selected={a.selected} />
            <p className="text-xs text-ink-faint text-right">Time spent: {a.timeSpentSec}s</p>
          </div>
        ))}
      </div>
    </div>
  );
}
