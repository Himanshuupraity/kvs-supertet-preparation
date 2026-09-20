import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { globalSearch } from '@/services/searchService';
import { PageHeader, EmptyState, SectionTitle, Badge } from '@/components/ui';
import { getSubject } from '@/services/contentService';

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  useEffect(() => { const t = setTimeout(() => setSp(q ? { q } : {}, { replace: true }), 300); return () => clearTimeout(t); }, [q, setSp]);
  const res = useMemo(() => globalSearch(q), [q]);
  const total = res.topics.length + res.questions.length + res.interview.length + res.currentAffairs.length + res.notes.length;

  return (
    <div className="space-y-4">
      <PageHeader title="Search" subtitle="Topics, MCQs, interview questions, current affairs and notes" />
      <div className="relative">
        <SearchIcon size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input autoFocus className="input pl-11 pr-10 text-[16px]" placeholder='Try "NEP 2020", "Piaget", "fractions", "ODOP"…' value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 tap grid place-items-center text-ink-faint" aria-label="Clear"><X size={18} /></button>}
      </div>
      {q.length < 2 && <div className="flex flex-wrap gap-2">{['NEP 2020', 'Piaget', 'RTE Act', 'NIPUN Bharat', 'Fractions', 'Uttar Pradesh', 'Inclusive education', 'Kathak'].map((s) => <button key={s} type="button" onClick={() => setQ(s)} className="chip !py-2 !px-3 !text-sm bg-white border border-surface-border">{s}</button>)}</div>}
      {q.length >= 2 && total === 0 && <EmptyState title={`No results for “${q}”`} hint="Try a shorter keyword or a Hindi term." />}
      {res.interview.length > 0 && <section><SectionTitle title={`Interview questions (${res.interview.length})`} /><ul className="space-y-2">{res.interview.map((x) => <li key={x.id}><Link to={`/kvs/questions/${x.id}`} className="card p-3 block"><p className="font-medium">{x.question}</p><Badge tone="blue" className="mt-1">{x.level}</Badge></Link></li>)}</ul></section>}
      {res.questions.length > 0 && <section><SectionTitle title={`MCQs (${res.questions.length})`} /><ul className="space-y-2">{res.questions.map((x) => <li key={x.id}><Link to={`/supertet/topic/${x.topicId}`} className="card p-3 block"><p className="font-medium">{x.text}</p><p className="text-xs text-ink-muted mt-1">{getSubject(x.subjectId)?.nameEn} · {x.difficulty}</p></Link></li>)}</ul></section>}
      {res.currentAffairs.length > 0 && <section><SectionTitle title={`Current affairs (${res.currentAffairs.length})`} /><ul className="space-y-2">{res.currentAffairs.map((x) => <li key={x.id}><Link to={`/current-affairs/${x.id}`} className="card p-3 block"><p className="font-medium">{x.title}</p><p className="text-xs text-ink-muted mt-1">{x.date}</p></Link></li>)}</ul></section>}
      {res.notes.length > 0 && <section><SectionTitle title={`Study notes (${res.notes.length})`} /><ul className="space-y-2">{res.notes.map((x) => <li key={x.id}><Link to={`/supertet/notes/${x.id}`} className="card p-3 block font-medium">{x.title}</Link></li>)}</ul></section>}
      {res.topics.length > 0 && <section><SectionTitle title={`Syllabus topics (${res.topics.length})`} /><ul className="space-y-2">{res.topics.map((x) => <li key={x.id}><Link to={`/supertet/topic/${x.id}`} className="card p-3 block"><p className="font-medium">{x.name}</p><p className="text-xs text-ink-muted">{getSubject(x.subjectId)?.nameEn}</p></Link></li>)}</ul></section>}
    </div>
  );
}
