import { Link, Navigate, useParams } from 'react-router-dom';
import { RotateCcw, ListChecks, Trophy } from 'lucide-react';
import { useProgressStore } from '@/store/useProgressStore';
import { getSubject, getTopic } from '@/services/contentService';
import { Button, Card, SectionTitle, StatTile, ProgressBar, accuracyColor, PageHeader } from '@/components/ui';
import { formatDate } from '@/utils/dates';

export default function TestResultPage() {
  const { attemptId = '' } = useParams();
  const attempt = useProgressStore((s) => s.attempts[attemptId]);
  if (!attempt) return <Navigate to="/supertet" replace />;
  if (attempt.status !== 'submitted' || !attempt.result) return <Navigate to={`/supertet/test/${attemptId}`} replace />;
  const r = attempt.result;
  const pct = r.maxScore ? Math.round((Math.max(0, r.score) / r.maxScore) * 100) : 0;

  return (
    <div className="space-y-4">
      <PageHeader back="/supertet" title="Test Completed 🎉" subtitle={`${attempt.config.title} · ${formatDate(attempt.submittedAt!, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`} />
      <Card className="text-center bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
        <Trophy className="mx-auto mb-1 text-amber-300" />
        <p className="text-brand-100 text-sm">Score</p>
        <p className="text-5xl font-extrabold tabular-nums">{r.score}<span className="text-2xl text-brand-200">/{r.maxScore}</span></p>
        <p className="text-brand-100 mt-1">{pct}% of maximum · accuracy {r.accuracy}%</p>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Correct" value={r.correct} className="!bg-emerald-50" />
        <StatTile label="Incorrect" value={r.incorrect} sub={attempt.config.negativeMarking ? `−${r.incorrect * attempt.config.negativeMarks} marks` : undefined} className="!bg-red-50" />
        <StatTile label="Unanswered" value={r.unanswered} />
        <StatTile label="Avg time" value={`${r.avgTimeSec}s`} sub="per attempted question" />
      </div>
      <Card>
        <SectionTitle title="Subject performance" />
        <ul className="space-y-3">
          {r.subjectScores.map((s) => (
            <li key={s.subjectId}>
              <div className="flex justify-between text-sm mb-1"><span className="font-medium">{getSubject(s.subjectId)?.nameEn}</span><span className="tabular-nums text-ink-muted">{s.correct}/{s.total} · <b className="text-ink">{s.attempted ? s.accuracy : 0}%</b></span></div>
              <ProgressBar value={s.attempted ? s.accuracy : 0} color={s.attempted ? accuracyColor(s.accuracy) : 'bg-surface-border'} />
            </li>
          ))}
        </ul>
      </Card>
      {r.recommendedTopics.length > 0 && (
        <Card>
          <SectionTitle title="Recommended revision" subtitle="Topics below 60% in this test" />
          <ol className="list-decimal pl-5 space-y-1.5">
            {r.recommendedTopics.map((t) => <li key={t}><Link to={`/supertet/topic/${t}`} className="text-brand-700 font-medium">{getTopic(t)?.nameEn ?? t}</Link> <span className="text-xs text-ink-faint">({r.topicScores[t].correct}/{r.topicScores[t].total})</span></li>)}
          </ol>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" to={`/supertet/test/${attempt.id}/review`}><ListChecks size={18} /> Review mistakes</Button>
        <Button to={`/supertet/test/new?mode=${['daily', 'weekly'].includes(attempt.config.mode) ? 'full' : attempt.config.mode}`}><RotateCcw size={18} /> Take another test</Button>
      </div>
    </div>
  );
}
