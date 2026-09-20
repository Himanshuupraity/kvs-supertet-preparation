import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Mic, CheckCircle2, AlertTriangle, ListOrdered, Target, MessageCircleQuestion } from 'lucide-react';
import { getInterviewQuestion, getInterviewCategories } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { Button, Card, PageHeader, SectionTitle, Badge } from '@/components/ui';

export default function InterviewQuestionDetailPage() {
  const { id = '' } = useParams();
  const q = getInterviewQuestion(id);
  const { practicedInterviewIds, markInterviewPracticed } = useProgressStore();
  const [showSample, setShowSample] = useState(false);
  if (!q) return <Navigate to="/kvs/questions" replace />;
  const cat = getInterviewCategories().find((c) => c.id === q.categoryId);
  const done = !!practicedInterviewIds[q.id];

  return (
    <div className="space-y-4">
      <PageHeader back="/kvs/questions" title={q.question} subtitle={<span>{cat?.name} · <Badge tone="blue">{q.level}</Badge>{q.questionHi && q.questionHi !== q.question && <span className="block hindi mt-1">{q.questionHi}</span>}</span>} />
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant={done ? 'secondary' : 'primary'} onClick={() => markInterviewPracticed(q.id)}><CheckCircle2 size={18} /> {done ? 'Practised ✓' : 'Mark as practised'}</Button>
        <Button variant="secondary" to={`/kvs/interview/new?question=${q.id}`}><Mic size={18} /> Answer on video</Button>
      </div>
      <Card><SectionTitle title="What the interviewer is checking" /><ul className="space-y-1.5">{q.checking.map((c, i) => <li key={i} className="flex gap-2 text-[15px]"><Target size={16} className="text-brand-600 mt-1 shrink-0" />{c}</li>)}</ul></Card>
      <Card className="bg-emerald-50 border-emerald-100"><SectionTitle title="Key points to include" /><ul className="space-y-1.5">{q.keyPoints.map((c, i) => <li key={i} className="flex gap-2 text-[15px]"><CheckCircle2 size={16} className="text-emerald-700 mt-1 shrink-0" />{c}</li>)}</ul></Card>
      <Card className="bg-amber-50 border-amber-100"><SectionTitle title="Common mistakes" /><ul className="space-y-1.5">{q.commonMistakes.map((c, i) => <li key={i} className="flex gap-2 text-[15px]"><AlertTriangle size={16} className="text-amber-700 mt-1 shrink-0" />{c}</li>)}</ul></Card>
      <Card><SectionTitle title="Sample answer structure" /><ol className="space-y-1.5">{q.answerStructure.map((c, i) => <li key={i} className="flex gap-2 text-[15px]"><span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold grid place-items-center shrink-0">{i + 1}</span>{c}</li>)}</ol></Card>
      <Card>
        <SectionTitle title="Example answer" subtitle="Try answering aloud first, then compare. Do not memorise word-for-word — the board notices." action={<button type="button" onClick={() => setShowSample(!showSample)} className="btn-ghost text-sm">{showSample ? <><EyeOff size={16} /> Hide</> : <><Eye size={16} /> Reveal</>}</button>} />
        {showSample ? <p className="text-[15px] leading-relaxed whitespace-pre-line">{q.sampleAnswer}</p> : <div className="rounded-xl bg-surface-muted p-6 text-center text-sm text-ink-muted"><ListOrdered className="mx-auto mb-1" />Answer it yourself first, using the structure above.</div>}
      </Card>
      {q.followUps.length > 0 && <Card><SectionTitle title="Likely follow-up questions" /><ul className="space-y-1.5">{q.followUps.map((f, i) => <li key={i} className="flex gap-2 text-[15px]"><MessageCircleQuestion size={16} className="text-violet-600 mt-1 shrink-0" />{f}</li>)}</ul></Card>}
      {q.source && <p className="text-xs text-ink-faint">Reference: {q.source} · updated {q.updatedAt}</p>}
      <Link to={`/kvs/questions?cat=${q.categoryId}`} className="text-sm text-brand-700 font-medium">More questions in {cat?.name} →</Link>
    </div>
  );
}
