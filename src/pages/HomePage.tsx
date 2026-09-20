import { Link } from 'react-router-dom';
import { Flame, Mic, BookOpen, Lightbulb, ListChecks, Timer, NotebookPen, RotateCcw, Newspaper, Target, ChevronRight, CalendarCheck } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useInterviewStore } from '@/store/useInterviewStore';
import { computeStreak, weakTopics, interviewTrend } from '@/services/analyticsService';
import { todaysCurrentAffairs } from '@/services/dailyService';
import { greeting, todayISO, formatDate, weekdayShort } from '@/utils/dates';
import { ProgressBar, Card, SectionTitle } from '@/components/ui';
import { getSubject } from '@/services/contentService';

export default function HomePage() {
  const profile = useUserStore((s) => s.profile);
  const daily = useProgressStore((s) => s.daily);
  const history = useProgressStore((s) => s.questionHistory);
  const sessions = useInterviewStore((s) => s.sessions);
  const today = daily[todayISO()];
  const targets = profile?.dailyTargets ?? { mcqs: 20, mockTests: 1, gk: 10, interviewQuestions: 5, aiInterviews: 1 };
  const streak = computeStreak(daily);
  const ca = todaysCurrentAffairs();
  const weak = weakTopics(history).slice(0, 3);
  const trend = interviewTrend(sessions);

  const items = [
    { key: 'mcqs', label: `${targets.mcqs} MCQs`, done: today?.mcqsAttempted ?? 0, target: targets.mcqs, to: '/supertet/test/new?mode=random' },
    { key: 'mock', label: `${targets.mockTests} mock test`, done: today?.mockTests ?? 0, target: targets.mockTests, to: '/supertet/test/new?mode=full' },
    { key: 'gk', label: `${targets.gk} GK / current affairs`, done: today?.gkRead ?? 0, target: targets.gk, to: '/current-affairs' },
    { key: 'iq', label: `${targets.interviewQuestions} interview questions`, done: today?.interviewQuestionsPracticed ?? 0, target: targets.interviewQuestions, to: '/kvs/questions' },
    { key: 'ai', label: `${targets.aiInterviews} AI video interview`, done: today?.aiInterviews ?? 0, target: targets.aiInterviews, to: '/kvs/interview/new' },
  ].filter((i) => profile?.targetExam === 'both' || (profile?.targetExam === 'kvs' ? ['gk', 'iq', 'ai'].includes(i.key) : ['mcqs', 'mock', 'gk'].includes(i.key)));
  const pct = Math.round((items.reduce((a, i) => a + Math.min(1, i.done / i.target), 0) / items.length) * 100);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5">
        <p className="text-brand-100 text-sm">{formatDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{greeting()}, {profile?.name} 👋</h1>
        <p className="text-brand-100 text-sm">Your preparation dashboard</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="chip bg-white/15 text-white"><Flame size={14} className="text-orange-300" /> {streak.current} day streak</span>
          <div className="flex gap-1 ml-auto">
            {streak.last7.map((d) => <span key={d.date} title={d.date} className={`w-6 h-6 rounded-md grid place-items-center text-[10px] font-bold ${d.active ? 'bg-emerald-400 text-emerald-950' : 'bg-white/15 text-white/70'}`}>{weekdayShort(d.date)[0]}</span>)}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1"><span>Today's progress</span><span className="font-bold">{pct}%</span></div>
          <ProgressBar value={pct} color="bg-emerald-400" />
        </div>
      </section>

      <Card>
        <SectionTitle title="Today's targets" action={<Link to="/plan" className="text-sm font-semibold text-brand-700 inline-flex items-center">Study plan <ChevronRight size={16} /></Link>} />
        <ul className="divide-y divide-surface-border">
          {items.map((i) => {
            const done = i.done >= i.target;
            return (
              <li key={i.key}>
                <Link to={i.to} className="flex items-center gap-3 py-2.5">
                  <span className={`w-6 h-6 rounded-md border-2 grid place-items-center text-xs font-bold ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-border text-transparent'}`}>✓</span>
                  <span className={`flex-1 text-[15px] ${done ? 'line-through text-ink-faint' : 'text-ink'}`}>{i.label}</span>
                  <span className="text-xs text-ink-muted tabular-nums">{Math.min(i.done, i.target)}/{i.target}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      {(profile?.targetExam ?? 'both') !== 'supertet' && (
        <section>
          <SectionTitle title="KVS PRT Interview" subtitle={trend.length ? `Latest AI interview score: ${trend[trend.length - 1].overall}/100` : 'Start with the question bank, then take an AI mock interview.'} />
          <div className="grid grid-cols-3 gap-2.5">
            <Tile to="/kvs/interview/new" icon={<Mic />} label="AI Mock Interview" tone="bg-rose-50 text-rose-700" />
            <Tile to="/kvs/questions" icon={<BookOpen />} label="Interview Questions" tone="bg-indigo-50 text-indigo-700" />
            <Tile to="/kvs/questions?important=1" icon={<Lightbulb />} label="Model Answers" tone="bg-amber-50 text-amber-700" />
          </div>
        </section>
      )}

      {(profile?.targetExam ?? 'both') !== 'kvs' && (
        <section>
          <SectionTitle title="Super TET (UP Assistant Teacher)" subtitle="120 Qs · 120 min · −1 per wrong answer" />
          <div className="grid grid-cols-4 gap-2.5">
            <Tile to="/supertet/test/new?mode=daily" icon={<ListChecks />} label="Daily MCQs" tone="bg-emerald-50 text-emerald-700" />
            <Tile to="/supertet/test/new?mode=full" icon={<Timer />} label="Mock Test" tone="bg-sky-50 text-sky-700" />
            <Tile to="/supertet/notes" icon={<NotebookPen />} label="Study Notes" tone="bg-violet-50 text-violet-700" />
            <Tile to="/supertet/revision" icon={<RotateCcw />} label="Revision" tone="bg-orange-50 text-orange-700" />
          </div>
        </section>
      )}

      <Link to="/current-affairs" className="card p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 grid place-items-center shrink-0"><Newspaper /></span>
        <div className="flex-1 min-w-0">
          <p className="font-bold">Today's GK & Current Affairs</p>
          <p className="text-sm text-ink-muted truncate">{ca.length} updates · latest {ca[0] ? formatDate(ca[0].date, { day: 'numeric', month: 'short' }) : '—'}</p>
        </div>
        <ChevronRight className="text-ink-faint" />
      </Link>

      <Link to="/supertet/test/new?mode=daily" className="card p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0"><Target /></span>
        <div className="flex-1 min-w-0"><p className="font-bold">Today's Challenge</p><p className="text-sm text-ink-muted">20 questions · 20 minutes · same set for everyone today</p></div>
        <ChevronRight className="text-ink-faint" />
      </Link>

      {weak.length > 0 && (
        <Card>
          <SectionTitle title="Your weak areas" subtitle="Based on your actual answers (≥3 attempts, <65%)" action={<Link to="/supertet/revision?tab=weak" className="text-sm font-semibold text-brand-700">Practice</Link>} />
          <ul className="space-y-2.5">
            {weak.map((w) => (
              <li key={w.topicId}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium truncate">{w.name} <span className="text-ink-faint">· {getSubject(w.subjectId)?.nameEn}</span></span><span className="font-bold text-red-600">{w.accuracy}%</span></div>
                <ProgressBar value={w.accuracy} color="bg-red-500" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link to="/plan" className="card p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0"><CalendarCheck /></span>
        <div className="flex-1"><p className="font-bold">Today's {profile?.dailyTargetMinutes ?? 90}-minute plan</p><p className="text-sm text-ink-muted">Auto-built from exam weightage and your weak areas</p></div>
        <ChevronRight className="text-ink-faint" />
      </Link>
    </div>
  );
}

function Tile({ to, icon, label, tone }: { to: string; icon: React.ReactNode; label: string; tone: string }) {
  return (
    <Link to={to} className="card p-3 flex flex-col items-center text-center gap-2 min-h-[92px] justify-center">
      <span className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>{icon}</span>
      <span className="text-[12px] font-semibold leading-tight text-ink">{label}</span>
    </Link>
  );
}
