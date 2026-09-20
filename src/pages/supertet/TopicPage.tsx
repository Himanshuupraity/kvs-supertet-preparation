import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getTopic, getSubject, getQuestionsByTopic, getNotes } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { Button, EmptyState, PageHeader, Card } from '@/components/ui';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { OptionList } from '@/components/exam/OptionList';
import { ExplanationPanel } from '@/components/exam/ExplanationPanel';
import { Link } from 'react-router-dom';

/** Topic page: browse & practise questions one by one with instant feedback. */
export default function TopicPage() {
  const { topicId = '' } = useParams();
  const topic = getTopic(topicId);
  const subject = topic ? getSubject(topic.subjectId) : undefined;
  const questions = getQuestionsByTopic(topicId);
  const notes = getNotes().filter((n) => n.topicId === topicId || (n.subjectId === topic?.subjectId && !n.topicId));
  const { recordAnswer, toggleBookmark, bookmarks, bumpDaily, touchRecent } = useProgressStore();
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  useEffect(() => { if (topic) touchRecent('topic', topic.id); }, [topic, touchRecent]);
  if (!topic || !subject) return <Navigate to="/supertet" replace />;

  const answer = (qid: string, k: 'A' | 'B' | 'C' | 'D', correct: string) => {
    if (answers[qid]) return;
    setAnswers((a) => ({ ...a, [qid]: k }));
    recordAnswer(qid, k === correct);
    bumpDaily({ mcqsAttempted: 1, mcqsCorrect: k === correct ? 1 : 0 });
  };

  return (
    <div className="space-y-4">
      <PageHeader back={`/supertet/subject/${subject.id}`} title={topic.nameEn} subtitle={<span className="hindi">{topic.nameHi} · {subject.nameEn}</span>} />
      {topic.subtopics && <Card className="p-3.5 text-sm"><p className="font-semibold mb-1">Sub-topics</p><p className="text-ink-muted">{topic.subtopics.join(' · ')}</p></Card>}
      {notes.length > 0 && <Card className="p-3.5 text-sm"><p className="font-semibold mb-1">Related notes</p>{notes.map((n) => <Link key={n.id} to={`/supertet/notes/${n.id}`} className="block text-brand-700 font-medium">{n.title}</Link>)}</Card>}
      {questions.length >= 5 && <Button to={`/supertet/test/new?mode=topic&topic=${topic.id}`}><Play size={18} /> Timed topic test ({questions.length} Qs)</Button>}
      {questions.length === 0 ? (
        <EmptyState title="No practice questions yet for this topic" hint="Questions are mapped to exact syllabus topics. Add some via Admin → Questions, or connect the backend question generator." />
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <QuestionCard q={q} index={i} total={questions.length} bookmarked={bookmarks.some((b) => b.questionId === q.id)} onBookmark={() => toggleBookmark(q.id)} />
              <OptionList options={q.options} selected={answers[q.id] ?? null} correct={answers[q.id] ? q.correct : undefined} onSelect={(k) => answer(q.id, k, q.correct)} />
              {answers[q.id] && <ExplanationPanel q={q} selected={answers[q.id]} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
