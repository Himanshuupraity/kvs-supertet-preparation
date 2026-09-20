import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, Sparkles } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { useProgressStore } from '@/store/useProgressStore';
import { generateStudyPlan } from '@/services/studyPlanService';
import { weakTopics } from '@/services/analyticsService';
import { personalizedRecommendation } from '@/services/aiService';
import { Card, PageHeader, SectionTitle } from '@/components/ui';
import { colorFor } from '@/services/contentService';

export default function StudyPlanPage() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const history = useProgressStore((s) => s.questionHistory);
  const attempts = useProgressStore((s) => s.attempts);
  const completed = useProgressStore((s) => s.completedTargets);
  const toggle = useProgressStore((s) => s.toggleTarget);
  const minutes = profile?.dailyTargetMinutes ?? 90;
  const plan = useMemo(() => generateStudyPlan(minutes, history, profile), [minutes, history, profile]);
  const weak = weakTopics(history);
  const [aiText, setAiText] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const done = completed[today] ?? [];

  useEffect(() => {
    const scores = Object.values(attempts).filter((a) => a.result).map((a) => Math.round((Math.max(0, a.result!.score) / a.result!.maxScore) * 100));
    personalizedRecommendation({ weakTopics: weak.slice(0, 5).map((w) => ({ name: w.name, accuracy: w.accuracy })), recentScores: scores.slice(-5), minutes }).then(setAiText);
  }, [attempts, minutes, weak.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <PageHeader title={`Today's ${minutes}-minute plan`} subtitle="Built from official exam weightage and your actual weak areas. Change the duration to regenerate." />
      <Card>
        <label className="block"><span className="label flex items-center gap-2"><Clock size={16} /> Study duration: <b>{minutes} min</b></span>
          <input type="range" min={30} max={240} step={15} value={minutes} onChange={(e) => setProfile({ dailyTargetMinutes: +e.target.value })} className="w-full accent-brand-600" /></label>
      </Card>
      <ul className="space-y-2">
        {plan.map((b, i) => {
          const key = `plan-${i}-${b.subjectId}`; const isDone = done.includes(key);
          const c = ['ca', 'gk', 'kvs'].includes(b.subjectId) ? null : colorFor(b.subjectId);
          return (
            <li key={key} className="card p-3.5 flex items-center gap-3">
              <button type="button" onClick={() => toggle(key)} aria-pressed={isDone} className={`w-7 h-7 rounded-lg border-2 grid place-items-center text-sm font-bold shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-border text-transparent'}`}>✓</button>
              <div className={`w-14 text-center shrink-0 rounded-lg py-1.5 font-bold text-sm ${c ? `${c.bg} ${c.text}` : b.subjectId === 'kvs' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{b.minutes}<span className="text-[10px] block font-medium">min</span></div>
              <div className="flex-1 min-w-0"><p className={`font-semibold ${isDone ? 'line-through text-ink-faint' : ''}`}>{b.label}</p><p className="text-xs text-ink-muted">{b.reason}</p></div>
              <Link to={b.route} className="tap grid place-items-center text-ink-faint" aria-label="Open"><ChevronRight /></Link>
            </li>
          );
        })}
      </ul>
      {aiText && <Card className="bg-violet-50 border-violet-100"><SectionTitle title="AI recommendation" /><p className="text-sm whitespace-pre-line flex gap-2"><Sparkles size={16} className="text-violet-600 shrink-0 mt-0.5" />{aiText}</p></Card>}
      <Card className="text-sm text-ink-muted">
        <p className="font-semibold text-ink mb-1">How the plan is built</p>
        <p>Each subject's time ∝ (questions in the official paper) × (1 + weakness), with a 40% boost for subjects below 65% accuracy. Current affairs gets ~15% because 25 of 120 questions are GK/current events; KVS interview gets ~22% when it is a target. Subjects you have not practised get a small exploration boost.</p>
      </Card>
    </div>
  );
}
