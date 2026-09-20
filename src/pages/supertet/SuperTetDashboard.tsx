import { Link } from 'react-router-dom';
import { Timer, ListChecks, Shuffle, SlidersHorizontal, NotebookPen, RotateCcw, History, CalendarDays, ChevronRight } from 'lucide-react';
import { subjects, syllabusMeta, getQuestionsBySubject, colorFor } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { subjectPerformance, overallStats } from '@/services/analyticsService';
import { Card, SectionTitle, StatTile, ProgressBar, accuracyColor, PageHeader, SubjectIcon } from '@/components/ui';

export default function SuperTetDashboard() {
  const history = useProgressStore((s) => s.questionHistory);
  const attempts = useProgressStore((s) => s.attempts);
  const perf = subjectPerformance(history);
  const stats = overallStats(history, attempts);

  return (
    <div className="space-y-5">
      <PageHeader title="Super TET Preparation" subtitle={<span>{syllabusMeta.examNameHi} · <Link to="/sources" className="underline">official syllabus</Link></span>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Attempted" value={stats.attempted} />
        <StatTile label="Accuracy" value={`${stats.accuracy}%`} />
        <StatTile label="Mock tests" value={stats.tests} />
        <StatTile label="Avg score" value={`${stats.avgScorePct}%`} sub={stats.avgTimeSec ? `${stats.avgTimeSec}s / question` : undefined} />
      </div>

      <section>
        <SectionTitle title="Mock tests" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Mode to="/supertet/test/new?mode=full" icon={<Timer />} title="Full-length mock" sub={`${syllabusMeta.totalQuestions} Qs · ${syllabusMeta.durationMinutes} min`} tone="bg-sky-50 text-sky-700" />
          <Mode to="/supertet/test/new?mode=daily" icon={<ListChecks />} title="Daily Challenge" sub="20 Qs · same for everyone today" tone="bg-emerald-50 text-emerald-700" />
          <Mode to="/supertet/test/new?mode=weekly" icon={<CalendarDays />} title="Weekly Mock" sub="60 Qs · proportional to paper" tone="bg-violet-50 text-violet-700" />
          <Mode to="/supertet/test/new?mode=random" icon={<Shuffle />} title="Random practice" sub="Instant explanations" tone="bg-amber-50 text-amber-700" />
          <Mode to="/supertet/test/new?mode=custom" icon={<SlidersHorizontal />} title="Custom test" sub="Pick subjects, count, timer" tone="bg-rose-50 text-rose-700" />
          <Mode to="/supertet/test/history" icon={<History />} title="Test history" sub={`${stats.tests} completed`} tone="bg-slate-100 text-slate-700" />
        </div>
      </section>

      <section>
        <SectionTitle title="Subjects" subtitle="Weightage from the official paper (questions × 3 marks)" />
        <ul className="space-y-2">
          {subjects.map((s) => {
            const p = perf.find((x) => x.subjectId === s.id)!;
            const c = colorFor(s.id);
            const bank = getQuestionsBySubject(s.id).length;
            return (
              <li key={s.id}>
                <Link to={`/supertet/subject/${s.id}`} className="card p-3.5 flex items-center gap-3">
                  <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${c.bg} ${c.text}`}><SubjectIcon name={s.icon} size={22} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2"><p className="font-semibold truncate">{s.nameEn}</p><span className="text-xs font-bold text-ink-muted shrink-0">{s.questionsInExam} Qs · {s.marksInExam} marks</span></div>
                    <p className="text-xs text-ink-muted hindi truncate">{s.nameHi} · {s.topics.length} topics · {bank} practice Qs</p>
                    <div className="flex items-center gap-2 mt-1.5"><ProgressBar value={p.accuracy} color={p.attempted ? accuracyColor(p.accuracy) : 'bg-surface-border'} /><span className="text-xs font-bold tabular-nums w-10 text-right">{p.attempted ? `${p.accuracy}%` : '—'}</span></div>
                  </div>
                  <ChevronRight className="text-ink-faint shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Link to="/supertet/notes" className="card p-4 flex items-center gap-3"><NotebookPen className="text-violet-600" /><span className="font-semibold">Study Notes</span></Link>
        <Link to="/supertet/revision" className="card p-4 flex items-center gap-3"><RotateCcw className="text-orange-600" /><span className="font-semibold">Revision Center</span></Link>
      </div>

      <Card className="text-xs text-ink-muted">
        <p className="font-semibold text-ink mb-1">Exam pattern (official, accessed {syllabusMeta.sourceAccessedOn})</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>{syllabusMeta.totalQuestions} MCQs · {syllabusMeta.durationMinutes} minutes · {syllabusMeta.marksPerQuestion} marks each · −{syllabusMeta.negativeMarking} per wrong answer</li>
          {syllabusMeta.levelNotes.map((n) => <li key={n}>{n}</li>)}
          <li>{syllabusMeta.paperLanguage}</li>
        </ul>
      </Card>
    </div>
  );
}

function Mode({ to, icon, title, sub, tone }: { to: string; icon: React.ReactNode; title: string; sub: string; tone: string }) {
  return (
    <Link to={to} className="card p-3.5 flex flex-col gap-2 min-h-[104px]">
      <span className={`w-9 h-9 rounded-lg grid place-items-center ${tone}`}>{icon}</span>
      <div><p className="font-semibold text-sm leading-tight">{title}</p><p className="text-xs text-ink-muted mt-0.5">{sub}</p></div>
    </Link>
  );
}
