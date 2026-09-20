import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import type { Difficulty, TestMode } from '@/types/models';
import { subjects, syllabusMeta, getAllQuestions, getSubject, getTopic } from '@/services/contentService';
import { buildTest, createAttempt } from '@/services/testService';
import { dailyChallengeConfig, weeklyMockConfig } from '@/services/dailyService';
import { useProgressStore } from '@/store/useProgressStore';
import { Button, Card, PageHeader, SectionTitle } from '@/components/ui';
import { todayISO, isoWeekKey } from '@/utils/dates';

const MODE_INFO: Record<TestMode, { title: string; desc: string }> = {
  full: { title: 'Full-Length Mock Test', desc: `Simulates the real paper: ${syllabusMeta.totalQuestions} questions in ${syllabusMeta.durationMinutes} minutes, subjects in official proportion, −1 negative marking.` },
  subject: { title: 'Subject Test', desc: 'All questions from one subject, timed at 1 minute per question.' },
  topic: { title: 'Topic Test', desc: 'Questions from a single syllabus topic.' },
  random: { title: 'Random Practice', desc: 'Mixed questions with instant explanations after each answer.' },
  custom: { title: 'Custom Test', desc: 'Choose subjects, number of questions, difficulty, timer and negative marking.' },
  daily: { title: "Today's Daily Challenge", desc: '20 questions, 20 minutes. The same set is served to everyone for the whole day.' },
  weekly: { title: 'Weekly Super TET Mock', desc: '60 questions in 60 minutes, proportional to the official paper. New set every week.' },
  revision: { title: 'Revision Test', desc: 'Built from your wrong/bookmarked questions.' },
};

export default function TestSetupPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const saveAttempt = useProgressStore((s) => s.saveAttempt);
  const attempts = useProgressStore((s) => s.attempts);
  const mode = (sp.get('mode') as TestMode) || 'custom';
  const presetSubject = sp.get('subject'); const presetTopic = sp.get('topic');
  const presetIds = sp.get('ids')?.split(',').filter(Boolean);

  const [subjectIds, setSubjectIds] = useState<string[]>(presetSubject ? [presetSubject] : subjects.map((s) => s.id));
  const [count, setCount] = useState(Number(sp.get('count')) || (mode === 'random' ? 15 : 30));
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [timed, setTimed] = useState(mode !== 'random');
  const [negative, setNegative] = useState(true);
  const [instant, setInstant] = useState(mode === 'random' || sp.get('instant') === '1');

  const available = useMemo(() => {
    const all = getAllQuestions();
    if (presetTopic) return all.filter((q) => q.topicId === presetTopic).length;
    const set = new Set(subjectIds);
    return all.filter((q) => set.has(q.subjectId) && (difficulty === 'mixed' || q.difficulty === difficulty)).length;
  }, [subjectIds, difficulty, presetTopic]);

  const alreadyDone = mode === 'daily'
    ? Object.values(attempts).find((a) => a.config.mode === 'daily' && a.config.title.endsWith(todayISO()) && a.status === 'submitted')
    : mode === 'weekly' ? Object.values(attempts).find((a) => a.config.mode === 'weekly' && a.config.title.endsWith(isoWeekKey()) && a.status === 'submitted') : undefined;

  const start = () => {
    let config;
    if (mode === 'daily') config = dailyChallengeConfig();
    else if (mode === 'weekly') config = weeklyMockConfig();
    else if (mode === 'full') config = buildTest({ mode: 'full', questionCount: syllabusMeta.totalQuestions, durationMinutes: syllabusMeta.durationMinutes, timed: true, negativeMarking: true });
    else if (mode === 'revision' && presetIds?.length) config = buildTest({ mode: 'revision', questionIds: presetIds, timed, negativeMarking: negative, instantFeedback: instant, includeCurrentAffairMcqs: true });
    else if (mode === 'topic' && presetTopic) config = buildTest({ mode: 'topic', topicIds: [presetTopic], timed, negativeMarking: negative, instantFeedback: instant, title: `Topic Test — ${getTopic(presetTopic)?.nameEn ?? ''}` });
    else if (mode === 'subject' && presetSubject) config = buildTest({ mode: 'subject', subjectIds: [presetSubject], timed, negativeMarking: negative, instantFeedback: instant, title: `Subject Test — ${getSubject(presetSubject)?.nameEn ?? ''}` });
    else config = buildTest({ mode: mode === 'random' ? 'random' : 'custom', subjectIds, questionCount: count, difficulty, timed, negativeMarking: negative, instantFeedback: instant });
    if (config.questionIds.length === 0) return;
    const attempt = createAttempt(config);
    saveAttempt(attempt);
    nav(`/supertet/test/${attempt.id}`, { replace: true });
  };

  const info = MODE_INFO[mode];
  const showSubjectPicker = mode === 'custom' || mode === 'random';
  const showCount = showSubjectPicker;
  const fixed = mode === 'full' || mode === 'daily' || mode === 'weekly';

  return (
    <div className="space-y-4">
      <PageHeader back="/supertet" title={info.title} subtitle={info.desc} />
      {alreadyDone && (
        <Card className="bg-emerald-50 border-emerald-100 text-sm flex gap-2"><Info size={18} className="text-emerald-700 shrink-0" /><span>You already completed this {mode} set. You can retake it, or <button type="button" className="underline font-semibold" onClick={() => nav(`/supertet/test/${alreadyDone.id}/result`)}>view your result</button>.</span></Card>
      )}
      {showSubjectPicker && (
        <Card>
          <SectionTitle title="Subjects" action={<button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setSubjectIds(subjectIds.length === subjects.length ? [] : subjects.map((s) => s.id))}>{subjectIds.length === subjects.length ? 'Clear' : 'Select all'}</button>} />
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => { const on = subjectIds.includes(s.id); return (
              <button key={s.id} type="button" onClick={() => setSubjectIds(on ? subjectIds.filter((x) => x !== s.id) : [...subjectIds, s.id])} aria-pressed={on}
                className={`chip !py-2 !px-3 !text-sm border ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink border-surface-border'}`}>{s.code} <span className="hidden sm:inline">· {s.nameEn}</span></button>
            ); })}
          </div>
        </Card>
      )}
      {!fixed && (
        <Card className="space-y-4">
          {showCount && (
            <label className="block"><span className="label">Number of questions: <b>{Math.min(count, available)}</b> <span className="text-ink-faint">(available: {available})</span></span>
              <input type="range" min={5} max={Math.max(5, Math.min(120, available))} step={5} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full accent-brand-600" /></label>
          )}
          {showSubjectPicker && (
            <label className="block"><span className="label">Difficulty</span>
              <div className="grid grid-cols-4 gap-2">{(['mixed', 'easy', 'medium', 'hard'] as const).map((d) => <button key={d} type="button" onClick={() => setDifficulty(d)} className={`rounded-xl py-2.5 text-sm font-semibold border capitalize ${difficulty === d ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{d}</button>)}</div></label>
          )}
          <Toggle label="Timed (1 min / question)" checked={timed} onChange={setTimed} />
          <Toggle label={`Negative marking (−${syllabusMeta.negativeMarking} per wrong)`} checked={negative} onChange={setNegative} />
          <Toggle label="Show explanation after each answer (practice mode)" checked={instant} onChange={setInstant} />
        </Card>
      )}
      {fixed && (
        <Card className="text-sm text-ink-muted space-y-1">
          <p><b className="text-ink">Timer:</b> {mode === 'full' ? `${syllabusMeta.durationMinutes} min` : mode === 'daily' ? '20 min' : '60 min'} · <b className="text-ink">Negative marking:</b> −{syllabusMeta.negativeMarking}</p>
          <p>Questions are drawn proportionally: {subjects.map((s) => `${s.code} ${s.questionsInExam}`).join(', ')} per 120. Where the bank has fewer questions for a subject, the paper will be shorter — add questions via Admin to reach full length.</p>
        </Card>
      )}
      <div className="sticky bottom-[calc(76px+var(--safe-bottom))] lg:bottom-4">
        <Button full size="lg" onClick={start} disabled={!fixed && available === 0}><Play size={20} /> Start test</Button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 min-h-[44px]">
      <span className="text-sm font-medium">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`w-12 h-7 rounded-full p-0.5 transition ${checked ? 'bg-brand-600' : 'bg-surface-border'}`}><span className={`block w-6 h-6 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} /></button>
    </label>
  );
}
