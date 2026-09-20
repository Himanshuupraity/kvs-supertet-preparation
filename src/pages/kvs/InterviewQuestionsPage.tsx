import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { getInterviewCategories, getInterviewQuestions } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { PageHeader, Badge, EmptyState } from '@/components/ui';
import { normalizeText } from '@/utils/text';

export default function InterviewQuestionsPage() {
  const [sp, setSp] = useSearchParams();
  const cats = getInterviewCategories();
  const all = getInterviewQuestions();
  const practiced = useProgressStore((s) => s.practicedInterviewIds);
  const cat = sp.get('cat') ?? 'all';
  const important = sp.get('important') === '1';
  const [query, setQuery] = useState('');

  const list = useMemo(() => all.filter((q) => (cat === 'all' || q.categoryId === cat) && (!important || q.important) && (!query || normalizeText(q.question + ' ' + (q.questionHi ?? '') + ' ' + q.keyPoints.join(' ')).includes(normalizeText(query)))), [all, cat, important, query]);
  const groups = cats.map((c) => ({ c, qs: list.filter((q) => q.categoryId === c.id) })).filter((g) => g.qs.length);

  return (
    <div className="space-y-4">
      <PageHeader back="/kvs" title={important ? 'Important interview questions' : 'Interview question bank'} subtitle={`${all.length} questions · ${Object.keys(practiced).length} practised · each has what the board checks, key points, mistakes, structure and a sample answer`} />
      <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input className="input pl-10" placeholder="Search questions…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <Chip on={!important} onClick={() => setSp({ cat })}>All</Chip>
        <Chip on={important} onClick={() => setSp({ cat, important: '1' })}><Star size={14} /> Important</Chip>
        <span className="w-px bg-surface-border shrink-0 my-1" />
        <Chip on={cat === 'all'} onClick={() => setSp(important ? { important: '1' } : {})}>All categories</Chip>
        {cats.map((c) => <Chip key={c.id} on={cat === c.id} onClick={() => setSp(important ? { cat: c.id, important: '1' } : { cat: c.id })}>{c.name}</Chip>)}
      </div>
      {groups.length === 0 && <EmptyState title="No matching questions" />}
      {groups.map(({ c, qs }) => (
        <section key={c.id}>
          <h2 className="font-bold text-ink mb-1.5">{c.name} <span className="text-ink-faint font-medium text-sm">({qs.length})</span></h2>
          <p className="text-xs text-ink-muted mb-2">{c.description}</p>
          <ul className="space-y-2">
            {qs.map((q) => (
              <li key={q.id}><Link to={`/kvs/questions/${q.id}`} className="card p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{q.question}</p>
                  {q.questionHi && q.questionHi !== q.question && <p className="text-xs text-ink-muted hindi truncate mt-0.5">{q.questionHi}</p>}
                  <div className="flex gap-1.5 mt-1.5"><Badge tone={q.level === 'beginner' ? 'green' : q.level === 'standard' ? 'blue' : 'violet'}>{q.level}</Badge>{q.important && <Badge tone="amber"><Star size={12} /> Important</Badge>}{practiced[q.id] && <Badge tone="green"><CheckCircle2 size={12} /> Practised</Badge>}</div>
                </div>
                <ChevronRight className="text-ink-faint shrink-0" />
              </Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`chip !py-2 !px-3 !text-sm border shrink-0 ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{children}</button>;
}
