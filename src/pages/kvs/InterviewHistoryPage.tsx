import { Link } from 'react-router-dom';
import { Trash2, ChevronRight } from 'lucide-react';
import { useInterviewStore } from '@/store/useInterviewStore';
import { interviewTrend } from '@/services/analyticsService';
import { Button, Card, EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { TrendLine } from '@/components/charts';
import { formatDate } from '@/utils/dates';

export default function InterviewHistoryPage() {
  const sessions = useInterviewStore((s) => s.sessions);
  const del = useInterviewStore((s) => s.deleteSession);
  const list = Object.values(sessions).filter((s) => s.status !== 'abandoned').sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const trend = interviewTrend(sessions);
  return (
    <div className="space-y-4">
      <PageHeader back="/kvs" title="Interview history" subtitle={`${list.length} sessions`} />
      {trend.length >= 2 && <Card><SectionTitle title="Progress" subtitle="Overall score over time" /><TrendLine data={trend} xKey="idx" yKey="overall" unit="/100" /></Card>}
      {list.length === 0 && <EmptyState title="No interviews yet" action={<Button to="/kvs/interview/new">Start AI interview</Button>} />}
      <ul className="space-y-2">
        {list.map((s, i) => (
          <li key={s.id} className="card p-3.5 flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl grid place-items-center font-extrabold shrink-0 ${s.report ? (s.report.overall >= 70 ? 'bg-emerald-50 text-emerald-700' : s.report.overall >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700') : 'bg-slate-100 text-slate-500'}`}>{s.report ? s.report.overall : '…'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Interview #{list.length - i} <span className="text-ink-muted font-normal capitalize">· {s.mode === 'full' ? 'full mock' : s.mode}</span></p>
              <p className="text-xs text-ink-muted">{formatDate(s.startedAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {s.answers.length} answers{s.report ? ` · Score ${s.report.overall}/100` : ' · in progress'}</p>
            </div>
            <Link to={s.status === 'completed' ? `/kvs/interview/${s.id}/report` : `/kvs/interview/${s.id}`} className="btn-secondary !py-2 !px-3 text-sm">{s.status === 'completed' ? 'Open' : 'Resume'} <ChevronRight size={16} /></Link>
            <button type="button" onClick={() => del(s.id)} className="tap grid place-items-center text-ink-faint hover:text-red-600" aria-label="Delete"><Trash2 size={18} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
