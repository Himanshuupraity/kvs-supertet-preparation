import { useState } from 'react';
import type { Difficulty, Question, QuestionType } from '@/types/models';
import { subjects, getTopicsForSubject, getAllQuestions } from '@/services/contentService';
import { isDuplicateOf, questionFingerprint } from '@/services/dedupe';
import { Button } from '@/components/ui';
import { uid } from '@/utils/ids';
import { todayISO } from '@/utils/dates';

const TYPES: QuestionType[] = ['conceptual', 'application', 'scenario', 'fact', 'pedagogy', 'reasoning', 'current-affairs'];

export function QuestionForm({ initial, onSave, onCancel }: { initial?: Question; onSave: (q: Question, isNew: boolean) => void; onCancel: () => void }) {
  const isNew = !initial;
  const [q, setQ] = useState<Question>(initial ?? {
    id: uid('q'), subjectId: subjects[0].id, topicId: subjects[0].topics[0].id, text: '', textHi: '',
    options: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }],
    correct: 'A', explanation: '', difficulty: 'medium', type: 'conceptual', source: '', examRelevance: '', origin: 'practice', tags: [], important: false,
    createdAt: todayISO(), updatedAt: todayISO(),
  });
  const [dup, setDup] = useState<Question | null>(null);
  const topics = getTopicsForSubject(q.subjectId);
  const setOpt = (i: number, patch: Partial<Question['options'][number]>) => setQ({ ...q, options: q.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const valid = q.text.trim() && q.options.every((o) => o.text.trim()) && q.explanation.trim();

  const submit = () => {
    const existing = getAllQuestions().filter((x) => x.id !== q.id);
    const d = isDuplicateOf(q, existing);
    if (d && !dup) { setDup(d); return; }
    onSave({ ...q, tags: q.tags?.filter(Boolean), fingerprint: questionFingerprint(q), updatedAt: todayISO() }, isNew);
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="label">Subject</span><select className="input" value={q.subjectId} onChange={(e) => { const s = subjects.find((x) => x.id === e.target.value)!; setQ({ ...q, subjectId: s.id, topicId: s.topics[0].id }); }}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}</select></label>
        <label className="block"><span className="label">Topic (official syllabus)</span><select className="input" value={q.topicId} onChange={(e) => setQ({ ...q, topicId: e.target.value })}>{topics.map((t) => <option key={t.id} value={t.id}>{t.nameEn}</option>)}</select></label>
      </div>
      <label className="block"><span className="label">Question (English)</span><textarea className="input min-h-[80px]" value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} /></label>
      <label className="block"><span className="label">Question (Hindi, optional)</span><textarea className="input hindi min-h-[60px]" value={q.textHi ?? ''} onChange={(e) => setQ({ ...q, textHi: e.target.value })} /></label>
      {q.options.map((o, i) => (
        <div key={o.key} className="grid grid-cols-[auto_1fr] gap-2 items-start">
          <button type="button" onClick={() => setQ({ ...q, correct: o.key })} className={`w-11 h-11 rounded-xl font-bold ${q.correct === o.key ? 'bg-emerald-500 text-white' : 'bg-surface-muted text-ink-muted'}`} aria-label={`Mark ${o.key} correct`}>{o.key}</button>
          <div className="space-y-1"><input className="input" placeholder={`Option ${o.key}`} value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
            {q.correct !== o.key && <input className="input !py-2 text-sm" placeholder="Why incorrect (shown after answering)" value={o.whyIncorrect ?? ''} onChange={(e) => setOpt(i, { whyIncorrect: e.target.value })} />}</div>
        </div>
      ))}
      <label className="block"><span className="label">Explanation</span><textarea className="input min-h-[80px]" value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} /></label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="block"><span className="label">Difficulty</span><select className="input" value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value as Difficulty })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <label className="block"><span className="label">Type</span><select className="input" value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value as QuestionType })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label className="block"><span className="label">Origin</span><select className="input" value={q.origin} onChange={(e) => setQ({ ...q, origin: e.target.value as Question['origin'] })}><option value="practice">Practice</option><option value="previous-style">Previous-year style</option><option value="official">Official</option><option value="demo">Demo</option></select></label>
        <label className="flex items-center gap-2 mt-6"><input type="checkbox" className="w-5 h-5" checked={!!q.important} onChange={(e) => setQ({ ...q, important: e.target.checked })} /> Important</label>
      </div>
      <label className="block"><span className="label">Source / reference</span><input className="input" value={q.source} onChange={(e) => setQ({ ...q, source: e.target.value })} /></label>
      <label className="block"><span className="label">Exam relevance</span><input className="input" value={q.examRelevance} onChange={(e) => setQ({ ...q, examRelevance: e.target.value })} /></label>
      <label className="block"><span className="label">Tags (comma separated)</span><input className="input" value={(q.tags ?? []).join(', ')} onChange={(e) => setQ({ ...q, tags: e.target.value.split(',').map((t) => t.trim()) })} /></label>
      {dup && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm"><b>Possible duplicate:</b> “{dup.text}” ({dup.id}). Click Save again to add anyway.</div>}
      <div className="flex gap-2"><Button variant="secondary" full onClick={onCancel}>Cancel</Button><Button full onClick={submit} disabled={!valid}>{isNew ? 'Add question' : 'Save changes'}</Button></div>
    </div>
  );
}
