import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useProgressStore } from '@/store/useProgressStore';
import { getAllQuestions, getQuestion, getTopic, getSubject, getNote, getAllCurrentAffairs } from '@/services/contentService';
import { weakTopics } from '@/services/analyticsService';
import { PageHeader, EmptyState, Button, ProgressBar } from '@/components/ui';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { ExplanationPanel } from '@/components/exam/ExplanationPanel';
import { OptionList } from '@/components/exam/OptionList';

const TABS = [
  { id: 'wrong', label: 'Wrong' }, { id: 'bookmarked', label: 'Bookmarked' }, { id: 'weak', label: 'Weak topics' },
  { id: 'recent', label: 'Recent' }, { id: 'important', label: 'Important' }, { id: 'unattempted', label: 'Not attempted' }, { id: 'mistakes', label: 'Mock mistakes' },
] as const;
type Tab = typeof TABS[number]['id'];

export default function RevisionPage() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'wrong';
  const { questionHistory, bookmarks, recentlyStudied, attempts, toggleBookmark } = useProgressStore();
  const [open, setOpen] = useState<string | null>(null);
  const all = useMemo(() => [...getAllQuestions(), ...getAllCurrentAffairs().flatMap((c) => (c.mcq ? [c.mcq] : []))], []);

  const wrong = all.filter((q) => questionHistory[q.id] && !questionHistory[q.id].lastCorrect);
  const marked = bookmarks.map((b) => getQuestion(b.questionId)).filter(Boolean) as typeof all;
  const important = all.filter((q) => q.important);
  const unattempted = all.filter((q) => !questionHistory[q.id]);
  const mockMistakeIds = new Set(Object.values(attempts).filter((a) => a.status === 'submitted' && a.config.questionIds.length >= 20).flatMap((a) => a.config.questionIds.filter((id) => a.answers[id]?.selected && a.answers[id].selected !== getQuestion(id)?.correct)));
  const mistakes = all.filter((q) => mockMistakeIds.has(q.id));
  const weak = weakTopics(questionHistory);

  const list = tab === 'wrong' ? wrong : tab === 'bookmarked' ? marked : tab === 'important' ? important : tab === 'unattempted' ? unattempted : tab === 'mistakes' ? mistakes : [];

  return (
    <div className="space-y-4">
      <PageHeader back="/supertet" title="Revision Center" subtitle="Everything you need to revisit, in one place." />
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {TABS.map((t) => <button key={t.id} type="button" onClick={() => setSp({ tab: t.id })} className={`chip !py-2 !px-3 !text-sm border shrink-0 ${tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{t.label}</button>)}
      </div>

      {tab === 'weak' && (weak.length === 0
        ? <EmptyState title="No weak topics identified yet" hint="Attempt at least 3 questions in a topic; topics below 65% accuracy appear here." />
        : <ul className="space-y-2">{weak.map((w) => (
          <li key={w.topicId} className="card p-3.5">
            <div className="flex justify-between items-center gap-2 mb-1.5"><div><p className="font-semibold">{w.name}</p><p className="text-xs text-ink-muted">{getSubject(w.subjectId)?.nameEn} · {w.correct}/{w.attempted} correct</p></div><span className="font-bold text-red-600 tabular-nums">{w.accuracy}%</span></div>
            <ProgressBar value={w.accuracy} color="bg-red-500" />
            <div className="flex gap-2 mt-2"><Link to={`/supertet/topic/${w.topicId}`} className="btn-secondary !py-2 !px-3 text-sm">Study topic</Link><Link to={`/supertet/test/new?mode=topic&topic=${w.topicId}`} className="btn-primary !py-2 !px-3 text-sm"><Play size={14} /> Practice</Link></div>
          </li>))}</ul>)}

      {tab === 'recent' && (recentlyStudied.length === 0
        ? <EmptyState title="Nothing studied recently" />
        : <ul className="space-y-2">{recentlyStudied.map((r) => {
          const label = r.type === 'topic' ? getTopic(r.id)?.nameEn : r.type === 'note' ? getNote(r.id)?.title : r.type === 'subject' ? getSubject(r.id)?.nameEn : r.id;
          const to = r.type === 'topic' ? `/supertet/topic/${r.id}` : r.type === 'note' ? `/supertet/notes/${r.id}` : r.type === 'subject' ? `/supertet/subject/${r.id}` : `/current-affairs/${r.id}`;
          return <li key={r.type + r.id}><Link to={to} className="card p-3.5 flex justify-between"><span className="font-medium">{label}</span><span className="text-xs text-ink-faint capitalize">{r.type}</span></Link></li>;
        })}</ul>)}

      {['wrong', 'bookmarked', 'important', 'unattempted', 'mistakes'].includes(tab) && (
        list.length === 0 ? <EmptyState title="Nothing here yet" hint={tab === 'wrong' ? 'Questions you answer incorrectly will collect here.' : tab === 'bookmarked' ? 'Tap the bookmark icon on any question.' : undefined} />
          : <>
            <Button full to={`/supertet/test/new?mode=revision&ids=${list.slice(0, 60).map((q) => q.id).join(',')}`}><Play size={18} /> Practise {Math.min(list.length, 60)} questions as a test</Button>
            <ul className="space-y-3">{list.map((q) => (
              <li key={q.id} className="space-y-2">
                <button type="button" className="w-full text-left" onClick={() => setOpen(open === q.id ? null : q.id)}>
                  <QuestionCard q={q} bookmarked={bookmarks.some((b) => b.questionId === q.id)} onBookmark={() => toggleBookmark(q.id)} />
                </button>
                {open === q.id && <><OptionList options={q.options} selected={null} correct={q.correct} /><ExplanationPanel q={q} selected={null} /></>}
              </li>))}</ul>
          </>)}
    </div>
  );
}
