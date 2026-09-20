import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ShieldAlert, ChevronRight, Info } from 'lucide-react';
import type { CurrentAffairCategory } from '@/types/models';
import { getAllCurrentAffairs } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { todayISO, formatDate } from '@/utils/dates';

export const CA_CATEGORIES: { id: CurrentAffairCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'national', label: 'National' }, { id: 'international', label: 'International' }, { id: 'schemes', label: 'Govt schemes' },
  { id: 'education', label: 'Education' }, { id: 'appointments', label: 'Appointments' }, { id: 'awards', label: 'Awards' }, { id: 'sports', label: 'Sports' },
  { id: 'science-tech', label: 'Science & Tech' }, { id: 'important-days', label: 'Important days' }, { id: 'books', label: 'Books/Authors' }, { id: 'reports', label: 'Reports/Indexes' },
  { id: 'economy', label: 'Economy' }, { id: 'polity', label: 'Polity' }, { id: 'uttar-pradesh', label: 'Uttar Pradesh' }, { id: 'initiatives', label: 'Initiatives' }, { id: 'defence', label: 'Defence' },
];

export default function CurrentAffairsPage() {
  const all = getAllCurrentAffairs();
  const read = useProgressStore((s) => s.readCurrentAffairIds);
  const [cat, setCat] = useState<CurrentAffairCategory | 'all'>('all');
  const today = todayISO();
  const list = useMemo(() => all.filter((c) => cat === 'all' || c.category === cat), [all, cat]);
  const byDate = useMemo(() => { const m = new Map<string, typeof list>(); for (const c of list) m.set(c.date, [...(m.get(c.date) ?? []), c]); return [...m.entries()]; }, [list]);
  const newest = all[0]?.publishedOn;
  const withMcq = list.filter((c) => c.mcq);

  return (
    <div className="space-y-4">
      <PageHeader title="Today's GK & Current Affairs" subtitle={<span>{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {all.length} items · {read.length} read</span>} />
      {newest && newest !== today && (
        <Card className="bg-amber-50 border-amber-100 text-sm flex gap-2"><Info size={18} className="text-amber-700 shrink-0" /><span>Latest update was added on <b>{formatDate(newest)}</b>. Every item below carries its own event date — nothing older is presented as today's news. Connect the daily-refresh job (README) for automatic updates.</span></Card>
      )}
      {withMcq.length > 0 && <Button full variant="secondary" to={`/supertet/test/new?mode=revision&ids=${withMcq.map((c) => c.mcq!.id).join(',')}`}>Practise {withMcq.length} current-affairs MCQs</Button>}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {CA_CATEGORIES.map((c) => <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`chip !py-2 !px-3 !text-sm border shrink-0 ${cat === c.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{c.label}</button>)}
      </div>
      {list.length === 0 && <EmptyState title="No items in this category yet" />}
      {byDate.map(([date, items]) => (
        <section key={date}>
          <h2 className="font-bold text-ink mb-2 sticky top-14 lg:top-0 bg-surface-muted py-1">{formatDate(date)}{date === today && <Badge tone="green" className="ml-2">Today</Badge>}</h2>
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id}><Link to={`/current-affairs/${c.id}`} className="card p-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1"><Badge tone="blue">{CA_CATEGORIES.find((x) => x.id === c.category)?.label ?? c.category}</Badge>{c.verified ? <Badge tone="green"><ShieldCheck size={12} /> Official source</Badge> : <Badge tone="amber"><ShieldAlert size={12} /> Verify</Badge>}{c.mcq && <Badge tone="violet">MCQ</Badge>}{read.includes(c.id) && <Badge tone="gray"><CheckCircle2 size={12} /> Read</Badge>}</div>
                  <p className="font-semibold leading-snug">{c.title}</p>
                  <p className="text-sm text-ink-muted line-clamp-2 mt-0.5">{c.summary}</p>
                </div>
                <ChevronRight className="text-ink-faint shrink-0 mt-1" />
              </Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
