import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flag, LayoutGrid, Send, X } from 'lucide-react';
import type { TestAttempt } from '@/types/models';
import { useProgressStore } from '@/store/useProgressStore';
import { getQuestion } from '@/services/contentService';
import { evaluateAttempt } from '@/services/testService';
import { Timer } from '@/components/exam/Timer';
import { OptionList } from '@/components/exam/OptionList';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { ExplanationPanel } from '@/components/exam/ExplanationPanel';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { Button, Modal } from '@/components/ui';
import { useSwipe } from '@/hooks/useSwipe';

export default function TestRunnerPage() {
  const { attemptId = '' } = useParams();
  const nav = useNavigate();
  const stored = useProgressStore((s) => s.attempts[attemptId]);
  const { saveAttempt, recordAnswer, bumpDaily, toggleBookmark, bookmarks } = useProgressStore();
  const [attempt, setAttempt] = useState<TestAttempt | undefined>(stored);
  const [palette, setPalette] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);
  const enteredAt = useRef(Date.now());
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const questions = useMemo(() => (attempt ? attempt.config.questionIds.map((id) => getQuestion(id)).filter(Boolean) : []), [attempt?.config.questionIds]) as NonNullable<ReturnType<typeof getQuestion>>[];
  const idx = attempt?.currentIndex ?? 0;
  const q = questions[idx];

  // accumulate time spent on current question
  const flushTime = useCallback((a: TestAttempt): TestAttempt => {
    const id = a.config.questionIds[a.currentIndex];
    const spent = Math.round((Date.now() - enteredAt.current) / 1000);
    enteredAt.current = Date.now();
    const ans = a.answers[id];
    return ans ? { ...a, answers: { ...a.answers, [id]: { ...ans, visited: true, timeSpentSec: ans.timeSpentSec + spent } } } : a;
  }, []);

  const submit = useCallback((a: TestAttempt) => {
    const flushed = flushTime(a);
    const result = evaluateAttempt(flushed, questions);
    const final: TestAttempt = { ...flushed, status: 'submitted', submittedAt: new Date().toISOString(), result };
    attemptRef.current = final; // prevent the unmount auto-save from overwriting the submitted attempt
    setAttempt(final);
    saveAttempt(final);
    if (final.config.mode !== 'random' && final.config.questionIds.length >= 20) bumpDaily({ mockTests: 1 });
    bumpDaily({ studySeconds: result.totalTimeSec });
    nav(`/supertet/test/${a.id}/result`, { replace: true });
  }, [flushTime, questions, saveAttempt, bumpDaily, nav]);

  // timer
  useEffect(() => {
    if (!attempt || !attempt.config.timed || attempt.status !== 'in-progress') return;
    const t = setInterval(() => {
      setAttempt((a) => {
        if (!a) return a;
        if (a.remainingSec <= 1) { clearInterval(t); setTimeout(() => submit({ ...a, remainingSec: 0 }), 0); return { ...a, remainingSec: 0 }; }
        return { ...a, remainingSec: a.remainingSec - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [attempt?.id, attempt?.config.timed, attempt?.status, submit]);

  // persist periodically & on unload (resume support)
  useEffect(() => {
    const save = () => { const a = attemptRef.current; if (a && a.status === 'in-progress') saveAttempt(flushTime(a)); };
    const t = setInterval(save, 10000);
    window.addEventListener('pagehide', save);
    return () => { clearInterval(t); window.removeEventListener('pagehide', save); save(); };
  }, [saveAttempt, flushTime]);

  const update = (fn: (a: TestAttempt) => TestAttempt) => setAttempt((a) => (a ? fn(a) : a));
  const go = (i: number) => update((a) => ({ ...flushTime(a), currentIndex: Math.max(0, Math.min(a.config.questionIds.length - 1, i)) }));
  const next = () => go(idx + 1); const prev = () => go(idx - 1);
  const swipe = useSwipe(next, prev);

  const select = (k: 'A' | 'B' | 'C' | 'D') => {
    if (!attempt || !q) return;
    const already = attempt.answers[q.id]?.selected;
    if (attempt.config.instantFeedback && already) return; // locked after reveal in practice mode
    update((a) => ({ ...a, answers: { ...a.answers, [q.id]: { ...a.answers[q.id], selected: k, visited: true } } }));
    if (!already) { recordAnswer(q.id, k === q.correct); bumpDaily({ mcqsAttempted: 1, mcqsCorrect: k === q.correct ? 1 : 0 }); }
    else if (already !== k) { recordAnswer(q.id, k === q.correct); }
  };
  const clear = () => q && update((a) => ({ ...a, answers: { ...a.answers, [q.id]: { ...a.answers[q.id], selected: null } } }));
  const mark = () => q && update((a) => ({ ...a, answers: { ...a.answers, [q.id]: { ...a.answers[q.id], markedForReview: !a.answers[q.id].markedForReview, visited: true } } }));

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev();
      else if (['1', '2', '3', '4'].includes(e.key)) select((['A', 'B', 'C', 'D'] as const)[+e.key - 1]);
      else if (e.key.toLowerCase() === 'm') mark();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });

  if (!stored) return <Navigate to="/supertet" replace />;
  if (stored.status === 'submitted') return <Navigate to={`/supertet/test/${attemptId}/result`} replace />;
  if (!attempt || !q) return null;

  const total = questions.length;
  const ans = attempt.answers[q.id];
  const unanswered = attempt.config.questionIds.filter((id) => !attempt.answers[id]?.selected).length;
  const marked = attempt.config.questionIds.filter((id) => attempt.answers[id]?.markedForReview).length;
  const revealed = attempt.config.instantFeedback && !!ans?.selected;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-surface-border pt-[var(--safe-top)]">
        <div className="max-w-3xl mx-auto px-3 h-14 flex items-center gap-2">
          <button type="button" onClick={() => setQuitConfirm(true)} className="tap grid place-items-center rounded-xl text-ink-muted" aria-label="Exit test"><X size={22} /></button>
          <div className="flex-1 min-w-0"><p className="text-xs text-ink-muted truncate">{attempt.config.title}</p><p className="font-bold text-sm">Question {idx + 1} of {total}</p></div>
          <Timer remaining={attempt.remainingSec} timed={attempt.config.timed} />
          <button type="button" onClick={() => setPalette(true)} className="tap grid place-items-center rounded-xl text-ink-muted" aria-label="Question palette"><LayoutGrid size={22} /></button>
        </div>
        <div className="h-1 bg-surface-border"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} /></div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-3 py-4 space-y-3" {...swipe}>
        <QuestionCard q={q} index={idx} total={total} showMeta={false} marked={ans?.markedForReview} onMark={mark} bookmarked={bookmarks.some((b) => b.questionId === q.id)} onBookmark={() => toggleBookmark(q.id)} />
        <OptionList options={q.options} selected={ans?.selected ?? null} correct={revealed ? q.correct : undefined} onSelect={select} />
        {revealed && <ExplanationPanel q={q} selected={ans.selected} />}
        {!revealed && ans?.selected && <button type="button" onClick={clear} className="text-sm text-ink-muted underline">Clear response</button>}
        <p className="text-center text-xs text-ink-faint">Swipe left/right or use ← → keys · 1–4 to answer · M to mark</p>
      </div>

      <footer className="sticky bottom-0 z-30 bg-white border-t border-surface-border pb-[var(--safe-bottom)]">
        <div className="max-w-3xl mx-auto px-3 py-2.5 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <Button variant="secondary" onClick={prev} disabled={idx === 0}><ChevronLeft size={18} /> Previous</Button>
          <button type="button" onClick={mark} className={`tap px-3 rounded-xl font-semibold text-sm inline-flex items-center gap-1.5 ${ans?.markedForReview ? 'bg-violet-100 text-violet-800' : 'bg-surface-muted text-ink-muted'}`}><Flag size={16} /><span className="hidden xs:inline">Review</span></button>
          {idx === total - 1
            ? <Button onClick={() => setConfirm(true)}><Send size={18} /> Submit</Button>
            : <Button onClick={next}>{ans?.selected ? 'Next' : 'Skip'} <ChevronRight size={18} /></Button>}
        </div>
      </footer>

      <Modal open={palette} onClose={() => setPalette(false)} title="Questions">
        <QuestionPalette ids={attempt.config.questionIds} answers={attempt.answers} current={idx} onJump={(i) => { go(i); setPalette(false); }} />
        <div className="mt-4"><Button full onClick={() => { setPalette(false); setConfirm(true); }}><Send size={18} /> Submit test</Button></div>
      </Modal>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Submit test?">
        <div className="text-sm space-y-1 mb-4">
          <p>Answered: <b>{total - unanswered}</b> / {total}</p>
          {unanswered > 0 && <p className="text-amber-700 font-semibold">You still have {unanswered} unanswered question{unanswered > 1 ? 's' : ''}.</p>}
          {marked > 0 && <p className="text-violet-700">{marked} marked for review.</p>}
          {attempt.config.negativeMarking && <p className="text-ink-muted">Unanswered questions carry no penalty; wrong answers deduct {attempt.config.negativeMarks} mark.</p>}
        </div>
        <div className="flex gap-2"><Button variant="secondary" full onClick={() => setConfirm(false)}>Continue test</Button><Button full onClick={() => submit(attempt)}>Submit</Button></div>
      </Modal>

      <Modal open={quitConfirm} onClose={() => setQuitConfirm(false)} title="Leave test?">
        <p className="text-sm text-ink-muted mb-4">Your progress is saved — you can resume this test from Test History. Or submit now to see your result.</p>
        <div className="flex gap-2"><Button variant="secondary" full onClick={() => { saveAttempt(flushTime(attempt)); nav('/supertet'); }}>Save & exit</Button><Button full onClick={() => submit(attempt)}>Submit now</Button></div>
      </Modal>
    </div>
  );
}
