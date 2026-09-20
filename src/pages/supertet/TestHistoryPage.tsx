import { Link } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';
import { useProgressStore } from '@/store/useProgressStore';
import { PageHeader, EmptyState, Button } from '@/components/ui';
import { formatDate } from '@/utils/dates';

export default function TestHistoryPage() {
  const attempts = useProgressStore((s) => s.attempts);
  const del = useProgressStore((s) => s.deleteAttempt);
  const list = Object.values(attempts).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <div className="space-y-4">
      <PageHeader back="/supertet" title="Test history" subtitle={`${list.length} attempts`} />
      {list.length === 0 && <EmptyState title="No tests yet" hint="Take a mock test to see it here." action={<Button to="/supertet/test/new?mode=full">Start a mock</Button>} />}
      <ul className="space-y-2">
        {list.map((a) => {
          const pct = a.result?.maxScore ? Math.round((Math.max(0, a.result.score) / a.result.maxScore) * 100) : null;
          return (
            <li key={a.id} className="card p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{a.config.title}</p>
                <p className="text-xs text-ink-muted">{formatDate(a.startedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {a.config.questionIds.length} Qs · {a.config.timed ? `${a.config.durationMinutes} min` : 'untimed'}</p>
                {a.status === 'submitted' && a.result && <p className="text-sm mt-0.5"><b>{a.result.score}/{a.result.maxScore}</b> <span className="text-ink-muted">({pct}%) · {a.result.accuracy}% accuracy</span></p>}
              </div>
              {a.status === 'in-progress'
                ? <Link to={`/supertet/test/${a.id}`} className="btn-primary !py-2 !px-3 text-sm"><Play size={16} /> Resume</Link>
                : <Link to={`/supertet/test/${a.id}/result`} className="btn-secondary !py-2 !px-3 text-sm">Result</Link>}
              <button type="button" onClick={() => del(a.id)} className="tap grid place-items-center text-ink-faint hover:text-red-600" aria-label="Delete attempt"><Trash2 size={18} /></button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
