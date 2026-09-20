import { useSearchParams } from 'react-router-dom';
import { useProgressStore } from '@/store/useProgressStore';
import { useInterviewStore } from '@/store/useInterviewStore';
import { overallStats, subjectPerformance, topicPerformance, scoreTrend, weeklyActivity, interviewTrend, computeStreak } from '@/services/analyticsService';
import { Card, PageHeader, SectionTitle, StatTile, ProgressBar, accuracyColor, EmptyState } from '@/components/ui';
import { TrendLine, Bars, SkillRadar } from '@/components/charts';
import { MAXES, LABELS } from '@/services/interviewService';
import { getSubject } from '@/services/contentService';
import { lastNDays } from '@/utils/dates';

export default function AnalyticsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'kvs' ? 'kvs' : 'supertet';
  const { questionHistory, attempts, daily } = useProgressStore();
  const sessions = useInterviewStore((s) => s.sessions);
  const stats = overallStats(questionHistory, attempts);
  const subj = subjectPerformance(questionHistory);
  const topics = topicPerformance(questionHistory).filter((t) => t.attempted >= 2).sort((a, b) => a.accuracy - b.accuracy);
  const trend = scoreTrend(attempts);
  const week = weeklyActivity(daily, 7);
  const month = lastNDays(30).reduce((a, d) => ({ mcqs: a.mcqs + (daily[d]?.mcqsAttempted ?? 0), correct: a.correct + (daily[d]?.mcqsCorrect ?? 0), minutes: a.minutes + Math.round((daily[d]?.studySeconds ?? 0) / 60) }), { mcqs: 0, correct: 0, minutes: 0 });
  const streak = computeStreak(daily);
  const iv = interviewTrend(sessions);
  const lastIv = iv[iv.length - 1];
  const lastSession = lastIv ? sessions[lastIv.id] : undefined;

  return (
    <div className="space-y-4">
      <PageHeader title="Performance analytics" />
      <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-surface-border">
        <button type="button" onClick={() => setSp({})} className={`py-2 rounded-lg font-semibold text-sm ${tab === 'supertet' ? 'bg-brand-600 text-white' : 'text-ink-muted'}`}>Super TET</button>
        <button type="button" onClick={() => setSp({ tab: 'kvs' })} className={`py-2 rounded-lg font-semibold text-sm ${tab === 'kvs' ? 'bg-rose-600 text-white' : 'text-ink-muted'}`}>KVS Interview</button>
      </div>

      {tab === 'supertet' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatTile label="Accuracy" value={`${stats.accuracy}%`} sub={`${stats.correct} correct · ${stats.incorrect} wrong`} />
            <StatTile label="Attempted" value={stats.attempted} sub="unique answers counted" />
            <StatTile label="Avg test score" value={`${stats.avgScorePct}%`} sub={`${stats.tests} tests`} />
            <StatTile label="Avg time" value={`${stats.avgTimeSec}s`} sub="per question (target ≤60s)" />
          </div>
          <Card><SectionTitle title="This week" subtitle={`${streak.current}-day streak · 30-day: ${month.mcqs} MCQs, ${month.minutes} min`} /><Bars data={week} xKey="day" yKey="mcqs" unit=" MCQs" /></Card>
          {trend.length >= 2 ? <Card><SectionTitle title="Mock test score trend" subtitle="% of maximum marks" /><TrendLine data={trend} xKey="idx" yKey="pct" /></Card> : <EmptyState title="Take two or more tests to see your score trend" />}
          <Card>
            <SectionTitle title="Subject performance" />
            <ul className="space-y-2.5">{subj.map((s) => <li key={s.subjectId}><div className="flex justify-between text-sm mb-0.5"><span>{s.name}</span><span className="tabular-nums text-ink-muted">{s.correct}/{s.attempted} · <b className="text-ink">{s.attempted ? `${s.accuracy}%` : '—'}</b></span></div><ProgressBar value={s.attempted ? s.accuracy : 0} color={s.attempted ? accuracyColor(s.accuracy) : 'bg-surface-border'} /></li>)}</ul>
          </Card>
          {topics.length > 0 && (
            <Card>
              <SectionTitle title="Topic performance" subtitle="Weakest first (≥2 attempts)" />
              <ul className="space-y-2">{topics.slice(0, 15).map((t) => <li key={t.topicId}><div className="flex justify-between text-sm mb-0.5"><span className="truncate">{t.name} <span className="text-ink-faint">· {getSubject(t.subjectId)?.code}</span></span><b className={t.accuracy < 60 ? 'text-red-600' : t.accuracy < 75 ? 'text-amber-600' : 'text-emerald-700'}>{t.accuracy}%</b></div><ProgressBar value={t.accuracy} color={accuracyColor(t.accuracy)} /></li>)}</ul>
            </Card>
          )}
        </>
      )}

      {tab === 'kvs' && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Interviews" value={iv.length} />
            <StatTile label="Latest score" value={lastIv ? lastIv.overall : '—'} sub="/100" />
            <StatTile label="Best score" value={iv.length ? Math.max(...iv.map((x) => x.overall)) : '—'} sub="/100" />
          </div>
          {iv.length === 0 && <EmptyState title="No AI interviews yet" hint="Complete an AI mock interview to see analytics." />}
          {iv.length >= 2 && (
            <>
              <Card><SectionTitle title="Interview score history" /><TrendLine data={iv} xKey="idx" yKey="overall" unit="/100" /></Card>
              <Card><SectionTitle title="Content vs communication" subtitle="Average per interview (out of 30 and 15)" />
                <TrendLine data={iv} xKey="idx" yKey="content" unit="/30" domain={[0, 30]} height={160} />
                <TrendLine data={iv} xKey="idx" yKey="communication" unit="/15" domain={[0, 15]} height={160} /></Card>
              <Card><SectionTitle title="Teaching methodology · relevance · delivery" />
                <TrendLine data={iv} xKey="idx" yKey="teaching" unit="/10" domain={[0, 10]} height={140} />
                <TrendLine data={iv} xKey="idx" yKey="relevance" unit="/20" domain={[0, 20]} height={140} />
                <TrendLine data={iv} xKey="idx" yKey="delivery" unit="/10" domain={[0, 10]} height={140} /></Card>
            </>
          )}
          {lastSession?.report && (
            <>
              <Card><SectionTitle title="Latest skill profile" /><SkillRadar data={(Object.keys(MAXES) as (keyof typeof MAXES)[]).map((k) => ({ skill: LABELS[k].split(' ')[0], value: lastSession.report!.breakdownAvg[k], max: MAXES[k] }))} /></Card>
              <Card className="bg-amber-50 border-amber-100"><SectionTitle title="Weak areas (latest)" /><ul className="text-sm space-y-1">{lastSession.report.improveAreas.length ? lastSession.report.improveAreas.map((s) => <li key={s}>• {s}</li>) : <li>None below 65% — great.</li>}</ul></Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
