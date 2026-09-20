import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, Target, Lightbulb, Users } from 'lucide-react';
import { getNote, getSubject, getQuestion } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { Card, PageHeader, SectionTitle, Button } from '@/components/ui';

export default function NoteDetailPage() {
  const { noteId = '' } = useParams();
  const note = getNote(noteId);
  const touch = useProgressStore((s) => s.touchRecent);
  useEffect(() => { if (note) touch('note', note.id); }, [note, touch]);
  if (!note) return <Navigate to="/supertet/notes" replace />;
  const subject = getSubject(note.subjectId);
  const related = (note.relatedQuestionIds ?? []).map(getQuestion).filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader back="/supertet/notes" title={note.title} subtitle={<span>{subject?.nameEn}{note.titleHi && <span className="hindi"> · {note.titleHi}</span>} · updated {note.updatedAt}</span>} />
      <Card><SectionTitle title="Key concepts" /><ul className="space-y-2">{note.keyConcepts.map((k, i) => <li key={i} className="flex gap-2 text-[15px] leading-relaxed"><span className="text-brand-600 font-bold">→</span><span>{k}</span></li>)}</ul></Card>
      {note.theories && (
        <Card><SectionTitle title="Important theories / frameworks" />
          <div className="space-y-3">{note.theories.map((t) => <div key={t.name} className="rounded-xl bg-surface-muted p-3"><p className="font-semibold mb-1">{t.name}</p><ul className="list-disc pl-5 text-sm space-y-0.5 text-ink-muted">{t.points.map((p, i) => <li key={i}>{p}</li>)}</ul></div>)}</div></Card>
      )}
      {note.educators && (
        <Card><SectionTitle title="Important educators" />
          <ul className="space-y-2">{note.educators.map((e) => <li key={e.name} className="flex gap-2 text-sm"><Users size={16} className="text-ink-faint mt-0.5 shrink-0" /><span><b>{e.name}</b> — {e.contribution}</span></li>)}</ul></Card>
      )}
      <Card className="bg-emerald-50 border-emerald-100"><SectionTitle title="Exam points" /><ul className="space-y-1.5">{note.examPoints.map((k, i) => <li key={i} className="flex gap-2 text-sm"><Target size={16} className="text-emerald-700 mt-0.5 shrink-0" /><span>{k}</span></li>)}</ul></Card>
      <Card className="bg-amber-50 border-amber-100"><SectionTitle title="Common traps" /><ul className="space-y-1.5">{note.commonTraps.map((k, i) => <li key={i} className="flex gap-2 text-sm"><AlertTriangle size={16} className="text-amber-700 mt-0.5 shrink-0" /><span>{k}</span></li>)}</ul></Card>
      {related.length > 0 && (
        <Card><SectionTitle title="Practice MCQs" subtitle={`${related.length} related questions`} />
          <ul className="space-y-1.5 mb-3">{related.slice(0, 5).map((q) => <li key={q!.id} className="text-sm flex gap-2"><Lightbulb size={16} className="text-ink-faint mt-0.5 shrink-0" /><Link to={`/supertet/topic/${q!.topicId}`} className="text-ink hover:text-brand-700">{q!.text}</Link></li>)}</ul>
          <Button to={`/supertet/test/new?mode=revision&ids=${related.map((q) => q!.id).join(',')}`} full variant="secondary">Practise these {related.length} questions</Button></Card>
      )}
      {note.source && <p className="text-xs text-ink-faint">Source: {note.source}</p>}
    </div>
  );
}
