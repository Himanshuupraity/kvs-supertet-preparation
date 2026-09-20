import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Star, Download, Upload, Copy, Lock, RotateCcw } from 'lucide-react';
import type { CurrentAffair, InterviewQuestion, Question } from '@/types/models';
import { useContentStore } from '@/store/useContentStore';
import { getAllQuestions, getAllCurrentAffairs, getInterviewQuestions, getInterviewCategories, subjects, getSubject, getTopic } from '@/services/contentService';
import { findDuplicates } from '@/services/dedupe';
import { Button, Card, Modal, PageHeader, Badge, SectionTitle } from '@/components/ui';
import { QuestionForm } from './QuestionForm';
import { uid } from '@/utils/ids';
import { todayISO } from '@/utils/dates';
import { CA_CATEGORIES } from '@/pages/currentAffairs/CurrentAffairsPage';

type Tab = 'questions' | 'ca' | 'interview' | 'dupes' | 'data';
const PIN = import.meta.env.VITE_ADMIN_PIN;

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(!PIN);
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState<Tab>('questions');
  if (!unlocked) return (
    <div className="max-w-sm mx-auto space-y-4"><PageHeader title="Admin" /><Card className="space-y-3"><p className="text-sm flex gap-2"><Lock size={18} /> Enter the admin PIN (set via VITE_ADMIN_PIN).</p><input type="password" inputMode="numeric" className="input" value={pin} onChange={(e) => setPin(e.target.value)} /><Button full onClick={() => pin === PIN && setUnlocked(true)}>Unlock</Button></Card></div>
  );
  return (
    <div className="space-y-4">
      <PageHeader title="Admin / Content management" subtitle="Changes are stored locally (browser). With the backend connected, the same actions call /api/content — see README." />
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {([['questions', 'Questions'], ['ca', 'Current affairs'], ['interview', 'Interview Qs'], ['dupes', 'Duplicates'], ['data', 'Export / Import']] as [Tab, string][]).map(([t, l]) => <button key={t} type="button" onClick={() => setTab(t)} className={`chip !py-2 !px-3 !text-sm border shrink-0 ${tab === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{l}</button>)}
      </div>
      {tab === 'questions' && <QuestionsAdmin />}
      {tab === 'ca' && <CurrentAffairsAdmin />}
      {tab === 'interview' && <InterviewAdmin />}
      {tab === 'dupes' && <DupesAdmin />}
      {tab === 'data' && <DataAdmin />}
    </div>
  );
}

function QuestionsAdmin() {
  const store = useContentStore();
  const [editing, setEditing] = useState<Question | null | 'new'>(null);
  const [subject, setSubject] = useState('all');
  const [q, setQ] = useState('');
  const all = getAllQuestions();
  const list = useMemo(() => all.filter((x) => (subject === 'all' || x.subjectId === subject) && (!q || x.text.toLowerCase().includes(q.toLowerCase()) || x.id.includes(q))), [all, subject, q]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="all">All subjects ({all.length})</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}</select><Button onClick={() => setEditing('new')}><Plus size={18} /> Add</Button></div>
      <input className="input" placeholder="Search text or id…" value={q} onChange={(e) => setQ(e.target.value)} />
      {store.deletedQuestionIds.length > 0 && <p className="text-xs text-ink-muted">{store.deletedQuestionIds.length} bundled question(s) hidden. <button type="button" className="underline" onClick={() => store.deletedQuestionIds.forEach(store.restoreQuestion)}>Restore all</button></p>}
      <ul className="space-y-2">
        {list.map((x) => (
          <li key={x.id} className="card p-3 flex items-start gap-2">
            <div className="flex-1 min-w-0"><p className="text-sm font-medium leading-snug">{x.text}</p><p className="text-xs text-ink-muted mt-0.5">{x.id} · {getSubject(x.subjectId)?.code} · {getTopic(x.topicId)?.nameEn} · {x.difficulty}{store.addedQuestions.some((a) => a.id === x.id) && ' · added locally'}{store.editedQuestions[x.id] && ' · edited locally'}</p></div>
            <button type="button" onClick={() => store.setImportant(x.id, !x.important)} className={`tap grid place-items-center rounded-lg ${x.important ? 'text-amber-500' : 'text-ink-faint'}`} aria-label="Toggle important"><Star size={18} fill={x.important ? 'currentColor' : 'none'} /></button>
            <button type="button" onClick={() => setEditing(x)} className="tap grid place-items-center rounded-lg text-ink-muted" aria-label="Edit"><Pencil size={18} /></button>
            <button type="button" onClick={() => confirm('Delete this question?') && store.deleteQuestion(x.id)} className="tap grid place-items-center rounded-lg text-ink-faint hover:text-red-600" aria-label="Delete"><Trash2 size={18} /></button>
          </li>
        ))}
      </ul>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add question' : 'Edit question'}>
        {editing !== null && <QuestionForm initial={editing === 'new' ? undefined : editing} onSave={(nq, isNew) => { store.upsertQuestion(nq, isNew); setEditing(null); }} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function CurrentAffairsAdmin() {
  const store = useContentStore();
  const [editing, setEditing] = useState<CurrentAffair | null>(null);
  const list = getAllCurrentAffairs();
  const blank = (): CurrentAffair => ({ id: uid('ca'), date: todayISO(), publishedOn: todayISO(), category: 'national', title: '', summary: '', whyItMatters: '', source: { name: '', type: 'official' }, verified: false, tags: [] });
  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing(blank())}><Plus size={18} /> Add current affair</Button>
      <ul className="space-y-2">{list.map((c) => (
        <li key={c.id} className="card p-3 flex items-start gap-2">
          <div className="flex-1 min-w-0"><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-ink-muted">{c.date} · {c.category} · {c.verified ? 'verified' : 'unverified'}{c.mcq ? ' · has MCQ' : ''}</p></div>
          <button type="button" onClick={() => setEditing(c)} className="tap grid place-items-center text-ink-muted" aria-label="Edit"><Pencil size={18} /></button>
          <button type="button" onClick={() => confirm('Delete?') && store.deleteCurrentAffair(c.id)} className="tap grid place-items-center text-ink-faint hover:text-red-600" aria-label="Delete"><Trash2 size={18} /></button>
        </li>))}</ul>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Current affair">
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">Event date</span><input type="date" className="input" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
              <label className="block"><span className="label">Category</span><select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as CurrentAffair['category'] })}>{CA_CATEGORIES.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            </div>
            <label className="block"><span className="label">Title</span><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label className="block"><span className="label">Summary</span><textarea className="input min-h-[80px]" value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></label>
            <label className="block"><span className="label">Why it matters</span><textarea className="input min-h-[60px]" value={editing.whyItMatters} onChange={(e) => setEditing({ ...editing, whyItMatters: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">Source name</span><input className="input" value={editing.source.name} onChange={(e) => setEditing({ ...editing, source: { ...editing.source, name: e.target.value } })} /></label>
              <label className="block"><span className="label">Source URL</span><input className="input" value={editing.source.url ?? ''} onChange={(e) => setEditing({ ...editing, source: { ...editing.source, url: e.target.value } })} /></label>
            </div>
            <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-5 h-5" checked={editing.source.type === 'official'} onChange={(e) => setEditing({ ...editing, source: { ...editing.source, type: e.target.checked ? 'official' : 'secondary' } })} /> Official source</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-5 h-5" checked={editing.verified} onChange={(e) => setEditing({ ...editing, verified: e.target.checked })} /> Verified</label></div>
            <p className="text-xs text-ink-faint">To attach an MCQ, add it under Questions with type "current-affairs" and reference it in the JSON export, or use the backend content API.</p>
            <div className="flex gap-2"><Button variant="secondary" full onClick={() => setEditing(null)}>Cancel</Button><Button full disabled={!editing.title || !editing.summary || !editing.date} onClick={() => { const isNew = !list.some((c) => c.id === editing.id); store.upsertCurrentAffair({ ...editing, publishedOn: editing.publishedOn || todayISO() }, isNew); setEditing(null); }}>Save</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InterviewAdmin() {
  const store = useContentStore();
  const cats = getInterviewCategories();
  const [editing, setEditing] = useState<InterviewQuestion | null>(null);
  const list = getInterviewQuestions();
  const blank = (): InterviewQuestion => ({ id: uid('iq'), categoryId: cats[0].id, question: '', level: 'standard', checking: [], keyPoints: [], keywords: [], commonMistakes: [], answerStructure: [], sampleAnswer: '', followUps: [], createdAt: todayISO(), updatedAt: todayISO() });
  const lines = (v: string[]) => v.join('\n'); const parse = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing(blank())}><Plus size={18} /> Add interview question</Button>
      <ul className="space-y-2">{list.map((x) => (
        <li key={x.id} className="card p-3 flex items-start gap-2">
          <div className="flex-1 min-w-0"><p className="text-sm font-medium">{x.question}</p><p className="text-xs text-ink-muted">{cats.find((c) => c.id === x.categoryId)?.name} · {x.level}</p></div>
          <button type="button" onClick={() => store.upsertInterviewQuestion({ ...x, important: !x.important }, store.addedInterviewQuestions.some((a) => a.id === x.id))} className={`tap grid place-items-center ${x.important ? 'text-amber-500' : 'text-ink-faint'}`} aria-label="Important"><Star size={18} fill={x.important ? 'currentColor' : 'none'} /></button>
          <button type="button" onClick={() => setEditing(x)} className="tap grid place-items-center text-ink-muted" aria-label="Edit"><Pencil size={18} /></button>
          <button type="button" onClick={() => confirm('Delete?') && store.deleteInterviewQuestion(x.id)} className="tap grid place-items-center text-ink-faint hover:text-red-600" aria-label="Delete"><Trash2 size={18} /></button>
        </li>))}</ul>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Interview question">
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">Category</span><select className="input" value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="block"><span className="label">Level</span><select className="input" value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value as InterviewQuestion['level'] })}><option value="beginner">Beginner</option><option value="standard">Standard</option><option value="advanced">Advanced</option></select></label>
            </div>
            <label className="block"><span className="label">Question</span><textarea className="input" value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} /></label>
            <label className="block"><span className="label">Question (Hindi)</span><textarea className="input hindi" value={editing.questionHi ?? ''} onChange={(e) => setEditing({ ...editing, questionHi: e.target.value })} /></label>
            {([['checking', 'What interviewer checks (one per line)'], ['keyPoints', 'Key points (one per line)'], ['keywords', 'Keywords for rubric (one per line, lowercase)'], ['commonMistakes', 'Common mistakes'], ['answerStructure', 'Answer structure steps'], ['followUps', 'Follow-up questions']] as const).map(([k, l]) => (
              <label key={k} className="block"><span className="label">{l}</span><textarea className="input min-h-[70px] text-sm" value={lines(editing[k])} onChange={(e) => setEditing({ ...editing, [k]: parse(e.target.value) })} /></label>
            ))}
            <label className="block"><span className="label">Sample answer</span><textarea className="input min-h-[100px]" value={editing.sampleAnswer} onChange={(e) => setEditing({ ...editing, sampleAnswer: e.target.value })} /></label>
            <div className="flex gap-2"><Button variant="secondary" full onClick={() => setEditing(null)}>Cancel</Button><Button full disabled={!editing.question || editing.keyPoints.length === 0} onClick={() => { store.upsertInterviewQuestion({ ...editing, updatedAt: todayISO() }, !list.some((x) => x.id === editing.id)); setEditing(null); }}>Save</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DupesAdmin() {
  const store = useContentStore();
  const all = getAllQuestions();
  const [threshold, setThreshold] = useState(0.7);
  const rep = useMemo(() => findDuplicates([...all, ...store.addedQuestions.filter((a) => !all.some((x) => x.id === a.id))], threshold), [all, store.addedQuestions, threshold]);
  return (
    <div className="space-y-3">
      <Card className="text-sm"><p>Exact duplicates are removed automatically at load (fingerprint = normalised text + options). Near-duplicates below are flagged by text similarity for manual review.</p>
        <label className="block mt-2"><span className="label">Similarity threshold: {Math.round(threshold * 100)}%</span><input type="range" min={0.5} max={0.95} step={0.05} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-full accent-brand-600" /></label></Card>
      {rep.exact.length === 0 && rep.near.length === 0 && <Card className="text-sm text-emerald-700">No duplicates found among {all.length} questions at this threshold.</Card>}
      {rep.near.map(({ a, b, similarity }, i) => (
        <Card key={i} className="text-sm space-y-2">
          <Badge tone="amber"><Copy size={12} /> {Math.round(similarity * 100)}% similar</Badge>
          <p><b>{a.id}:</b> {a.text}</p><p><b>{b.id}:</b> {b.text}</p>
          <div className="flex gap-2"><Button size="sm" variant="danger" onClick={() => store.deleteQuestion(b.id)}><Trash2 size={14} /> Remove {b.id}</Button><Button size="sm" variant="secondary" onClick={() => store.deleteQuestion(a.id)}>Remove {a.id}</Button></div>
        </Card>
      ))}
    </div>
  );
}

function DataAdmin() {
  const store = useContentStore();
  const [msg, setMsg] = useState('');
  const exportJson = () => {
    const data = { exportedAt: new Date().toISOString(), questions: getAllQuestions(), currentAffairs: getAllCurrentAffairs(), interviewQuestions: getInterviewQuestions() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `prt-prep-content-${todayISO()}.json`; a.click();
  };
  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as { questions?: Question[]; currentAffairs?: CurrentAffair[]; interviewQuestions?: InterviewQuestion[] };
      const existingQ = new Set(getAllQuestions().map((q) => q.id)); const existingCA = new Set(getAllCurrentAffairs().map((c) => c.id)); const existingIQ = new Set(getInterviewQuestions().map((q) => q.id));
      let n = 0;
      for (const q of data.questions ?? []) { store.upsertQuestion(q, !existingQ.has(q.id)); n++; }
      for (const c of data.currentAffairs ?? []) { store.upsertCurrentAffair(c, !existingCA.has(c.id)); n++; }
      for (const iq of data.interviewQuestions ?? []) { store.upsertInterviewQuestion(iq, !existingIQ.has(iq.id)); n++; }
      setMsg(`Imported ${n} items.`);
    } catch (e) { setMsg(`Import failed: ${(e as Error).message}`); }
  };
  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <SectionTitle title="Export" subtitle="Download all content (bundled + local changes) as JSON. Commit the relevant parts into src/data/ to ship them to every user." />
        <Button onClick={exportJson}><Download size={18} /> Export content JSON</Button>
      </Card>
      <Card className="space-y-3">
        <SectionTitle title="Import" subtitle="Upload a JSON file with { questions, currentAffairs, interviewQuestions } — e.g. produced by the server's daily refresh job." />
        <label className="btn-secondary cursor-pointer"><Upload size={18} /> Choose file<input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></label>
        {msg && <p className="text-sm">{msg}</p>}
      </Card>
      <Card className="space-y-3">
        <SectionTitle title="Reset local content changes" subtitle="Removes locally added/edited/deleted content; bundled content is restored." />
        <Button variant="danger" onClick={() => confirm('Reset all local content changes?') && store.resetAll()}><RotateCcw size={18} /> Reset</Button>
      </Card>
    </div>
  );
}
