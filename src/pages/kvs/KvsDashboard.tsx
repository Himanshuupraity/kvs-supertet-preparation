import { Link } from 'react-router-dom';
import { Mic, BookOpen, Star, BarChart3, Building2, ChevronRight, History, MonitorPlay } from 'lucide-react';
import { useInterviewStore } from '@/store/useInterviewStore';
import { useProgressStore } from '@/store/useProgressStore';
import { getInterviewQuestions } from '@/services/contentService';
import { readinessScore } from '@/services/interviewService';
import { interviewTrend } from '@/services/analyticsService';
import { Button, Card, PageHeader, SectionTitle, StatTile, ProgressBar } from '@/components/ui';
import { TrendLine } from '@/components/charts';
import kvsInfo from '@/data/kvs/kvs-info.json';

export default function KvsDashboard() {
  const sessions = useInterviewStore((s) => s.sessions);
  const practiced = useProgressStore((s) => s.practicedInterviewIds);
  const qs = getInterviewQuestions();
  const list = Object.values(sessions).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const completed = list.filter((s) => s.status === 'completed' && s.report);
  const avg = completed.length ? Math.round(completed.reduce((a, s) => a + s.report!.overall, 0) / completed.length) : 0;
  const readiness = readinessScore(list, Object.keys(practiced).length, qs.length);
  const trend = interviewTrend(sessions);
  const inProgress = list.find((s) => s.status === 'in-progress');
  const latest = kvsInfo.currentRecruitment.verifiedFacts[0];

  return (
    <div className="space-y-5">
      <PageHeader title="KVS PRT Interview Preparation" subtitle="Question bank with model-answer guidance, AI video mock interviews and progress tracking." />
      <Card className="bg-gradient-to-br from-rose-600 to-rose-800 text-white border-0">
        <div className="flex items-center justify-between"><p className="font-semibold">Interview readiness</p><span className="text-3xl font-extrabold">{readiness}%</span></div>
        <ProgressBar value={readiness} color="bg-white" className="mt-2" />
        <p className="text-xs text-rose-100 mt-2">Combines recent AI interview scores, question-bank coverage and number of mocks completed.</p>
      </Card>
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Practice Qs" value={qs.length} sub={`${Object.keys(practiced).length} practised`} />
        <StatTile label="AI interviews" value={completed.length} />
        <StatTile label="Average score" value={completed.length ? `${avg}` : '—'} sub={completed.length ? '/100' : 'take your first mock'} />
      </div>
      {inProgress && <Card className="bg-amber-50 border-amber-100 flex items-center gap-3"><div className="flex-1 text-sm"><b>Interview in progress</b> — {inProgress.answers.length}/{inProgress.plannedQuestionIds.length} answered</div><Button size="sm" to={`/kvs/interview/${inProgress.id}`}>Resume</Button></Card>}
      <div className="grid grid-cols-2 gap-2.5">
        <Button to="/kvs/interview/new" size="lg" className="col-span-2 !bg-rose-600 hover:!bg-rose-700"><Mic /> Start AI Interview</Button>
        <Button variant="secondary" to="/kvs/questions"><BookOpen size={18} /> Interview Questions</Button>
        <Button variant="secondary" to="/kvs/questions?important=1"><Star size={18} /> Important Questions</Button>
        <Button variant="secondary" to="/kvs/interview/history"><History size={18} /> Interview History</Button>
        <Button variant="secondary" to="/analytics?tab=kvs"><BarChart3 size={18} /> My Performance</Button>
        <Button variant="secondary" to="/kvs/reference" className="col-span-2"><MonitorPlay size={18} /> Reference Interviews (videos)</Button>
      </div>
      {trend.length >= 2 && <Card><SectionTitle title="Score progress" subtitle="Overall score per AI interview" /><TrendLine data={trend} xKey="idx" yKey="overall" unit="/100" /></Card>}
      <Link to="/kvs/about" className="card p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0"><Building2 /></span>
        <div className="flex-1 min-w-0"><p className="font-bold">About KVS & current recruitment (01/2025)</p><p className="text-sm text-ink-muted line-clamp-2">{latest.fact}</p></div>
        <ChevronRight className="text-ink-faint shrink-0" />
      </Link>
    </div>
  );
}
