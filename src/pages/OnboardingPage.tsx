import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, Mic, BookOpen } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui';

export default function OnboardingPage() {
  const complete = useUserStore((s) => s.completeOnboarding);
  const onboarded = useUserStore((s) => s.onboarded);
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [target, setTarget] = useState<'both' | 'kvs' | 'supertet'>('both');
  const [goal, setGoal] = useState('Clear KVS PRT interview and UP Assistant Teacher exam 2026');
  const [minutes, setMinutes] = useState(90);

  if (onboarded) return <Navigate to="/" replace />;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-brand-700 to-brand-900 text-white flex flex-col">
      <div className="flex-1 px-6 pt-14 pb-6 max-w-md w-full mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-white/15 grid place-items-center mb-5"><GraduationCap size={30} /></div>
        <h1 className="text-3xl font-extrabold leading-tight">Your PRT preparation, in one place.</h1>
        <p className="mt-2 text-brand-100">KVS PRT interview practice with AI video mock interviews, plus the UP Assistant Teacher (Super TET) exam built from the official UPESSC syllabus.</p>
        <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); complete({ name, targetExam: target, studyGoal: goal, dailyTargetMinutes: minutes }); nav('/', { replace: true }); }}>
          <div>
            <label className="block text-sm font-medium text-brand-100 mb-1" htmlFor="name">Your name</label>
            <input id="name" className="input text-ink" placeholder="e.g. Priya" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          </div>
          <div>
            <p className="block text-sm font-medium text-brand-100 mb-1">Target</p>
            <div className="grid grid-cols-3 gap-2">
              {([['both', 'Both', GraduationCap], ['kvs', 'KVS Interview', Mic], ['supertet', 'Super TET', BookOpen]] as const).map(([v, l, Icon]) => (
                <button key={v} type="button" onClick={() => setTarget(v)} className={`rounded-xl p-3 text-sm font-semibold flex flex-col items-center gap-1 border-2 ${target === v ? 'bg-white text-brand-800 border-white' : 'border-white/30 text-white'}`}><Icon size={20} />{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-100 mb-1" htmlFor="goal">Study goal</label>
            <input id="goal" className="input text-ink" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-100 mb-1" htmlFor="mins">Daily study time: <span className="font-bold text-white">{minutes} min</span></label>
            <input id="mins" type="range" min={30} max={240} step={15} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full accent-white" />
          </div>
          <Button type="submit" full size="lg" className="!bg-white !text-brand-800 hover:!bg-brand-50">Start preparing</Button>
          <p className="text-xs text-brand-200 text-center">Progress is saved on this device. No account needed.</p>
        </form>
      </div>
    </main>
  );
}
