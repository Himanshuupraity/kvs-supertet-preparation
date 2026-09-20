import { Link, useParams, Navigate } from 'react-router-dom';
import { ChevronRight, Play, NotebookPen } from 'lucide-react';
import { getSubject, getQuestionsByTopic, getQuestionsBySubject, getNotesForSubject } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { topicPerformance } from '@/services/analyticsService';
import { Button, Card, PageHeader, SectionTitle, ProgressBar, accuracyColor } from '@/components/ui';
import { useEffect } from 'react';

export default function SubjectPage() {
  const { subjectId = '' } = useParams();
  const subject = getSubject(subjectId);
  const history = useProgressStore((s) => s.questionHistory);
  const touch = useProgressStore((s) => s.touchRecent);
  useEffect(() => { if (subject) touch('subject', subject.id); }, [subject, touch]);
  if (!subject) return <Navigate to="/supertet" replace />;
  const tp = topicPerformance(history);
  const bank = getQuestionsBySubject(subject.id).length;
  const notes = getNotesForSubject(subject.id);

  return (
    <div className="space-y-4">
      <PageHeader back="/supertet" title={subject.nameEn} subtitle={<span className="hindi">{subject.nameHi} · {subject.questionsInExam} questions · {subject.marksInExam} marks in exam</span>} />
      <div className="grid grid-cols-2 gap-2.5">
        <Button to={`/supertet/test/new?mode=subject&subject=${subject.id}`} disabled={bank === 0}><Play size={18} /> Subject test</Button>
        <Button variant="secondary" to={`/supertet/test/new?mode=random&subject=${subject.id}&count=10&instant=1`} disabled={bank === 0}>Quick practice (10)</Button>
      </div>
      {notes.length > 0 && (
        <Card className="p-3.5">
          <SectionTitle title="Study notes" />
          <ul className="space-y-1.5">{notes.map((n) => <li key={n.id}><Link to={`/supertet/notes/${n.id}`} className="flex items-center gap-2 text-brand-700 font-medium"><NotebookPen size={16} />{n.title}</Link></li>)}</ul>
        </Card>
      )}
      <section>
        <SectionTitle title={`Topics (${subject.topics.length})`} subtitle="Exactly as listed in the official syllabus" />
        <ul className="space-y-2">
          {subject.topics.map((t) => {
            const n = getQuestionsByTopic(t.id).length;
            const p = tp.find((x) => x.topicId === t.id);
            return (
              <li key={t.id}>
                <Link to={`/supertet/topic/${t.id}`} className="card p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-snug">{t.nameEn}</p>
                    <p className="text-xs text-ink-muted hindi">{t.nameHi}</p>
                    {t.subtopics && <p className="text-xs text-ink-faint truncate mt-0.5">{t.subtopics.join(' · ')}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <ProgressBar value={p?.accuracy ?? 0} color={p ? accuracyColor(p.accuracy) : 'bg-surface-border'} />
                      <span className="text-xs text-ink-muted shrink-0 tabular-nums">{p ? `${p.accuracy}%` : '—'} · {n} Qs</span>
                    </div>
                  </div>
                  <ChevronRight className="text-ink-faint shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
