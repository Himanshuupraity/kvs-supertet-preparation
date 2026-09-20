import type { Difficulty, MockTestConfig, Question, SubjectScore, TestAttempt, TestMode, TestResult } from '@/types/models';
import { getAllQuestions, getAllCurrentAffairs, subjects, syllabusMeta } from './contentService';
import { seededShuffle, shuffle } from '@/utils/seeded';
import { uid } from '@/utils/ids';
import { todayISO, isoWeekKey } from '@/utils/dates';

export interface BuildTestOptions {
  mode: TestMode;
  title?: string;
  subjectIds?: string[];
  topicIds?: string[];
  questionCount?: number;
  timed?: boolean;
  durationMinutes?: number;
  negativeMarking?: boolean;
  difficulty?: Difficulty | 'mixed';
  questionIds?: string[];       // explicit list (revision tests)
  seed?: string;                 // deterministic selection (daily/weekly)
  includeCurrentAffairMcqs?: boolean;
  instantFeedback?: boolean;
}

function pool(opts: BuildTestOptions): Question[] {
  let qs = getAllQuestions();
  if (opts.includeCurrentAffairMcqs !== false) {
    qs = [...qs, ...getAllCurrentAffairs().flatMap((c) => (c.mcq ? [c.mcq] : []))];
  }
  if (opts.questionIds?.length) {
    const set = new Set(opts.questionIds);
    return qs.filter((q) => set.has(q.id));
  }
  if (opts.topicIds?.length) { const t = new Set(opts.topicIds); qs = qs.filter((q) => t.has(q.topicId)); }
  else if (opts.subjectIds?.length) { const s = new Set(opts.subjectIds); qs = qs.filter((q) => s.has(q.subjectId)); }
  if (opts.difficulty && opts.difficulty !== 'mixed') qs = qs.filter((q) => q.difficulty === opts.difficulty);
  return qs;
}

/**
 * For a full-length mock, distribute questions across subjects proportionally to the official paper
 * (25/5/30/8/16/8/8/8/4/8). If the bank has fewer than needed for a subject, take what exists.
 */
function proportionalPick(all: Question[], total: number, seed?: string): Question[] {
  const out: Question[] = [];
  const bySubject = new Map<string, Question[]>();
  for (const q of all) bySubject.set(q.subjectId, [...(bySubject.get(q.subjectId) ?? []), q]);
  for (const s of subjects) {
    const want = Math.round((s.questionsInExam / syllabusMeta.totalQuestions) * total);
    const list = bySubject.get(s.id) ?? [];
    const picked = (seed ? seededShuffle(list, seed + s.id) : shuffle(list)).slice(0, want);
    out.push(...picked);
  }
  return out;
}

export function buildTest(opts: BuildTestOptions): MockTestConfig {
  const candidates = pool(opts);
  const count = Math.min(opts.questionCount ?? candidates.length, candidates.length);
  let chosen: Question[];
  if (opts.questionIds?.length) chosen = candidates;
  else if (opts.mode === 'full' || opts.mode === 'weekly') chosen = proportionalPick(candidates, count, opts.seed);
  else chosen = (opts.seed ? seededShuffle(candidates, opts.seed) : shuffle(candidates)).slice(0, count);

  // keep subject order in full mocks (like the real paper), shuffle otherwise
  const ordered = opts.mode === 'full' || opts.mode === 'weekly'
    ? chosen.sort((a, b) => (subjects.findIndex((s) => s.id === a.subjectId) - subjects.findIndex((s) => s.id === b.subjectId)))
    : chosen;

  const timed = opts.timed ?? true;
  // Official pace: 120 questions in 120 minutes → 1 min/question
  const duration = opts.durationMinutes ?? Math.max(5, Math.round(ordered.length * 1));
  return {
    id: uid('test'),
    mode: opts.mode,
    title: opts.title ?? defaultTitle(opts.mode),
    subjectIds: opts.subjectIds,
    topicIds: opts.topicIds,
    questionCount: ordered.length,
    timed,
    durationMinutes: duration,
    negativeMarking: opts.negativeMarking ?? true,
    marksPerQuestion: syllabusMeta.marksPerQuestion,
    negativeMarks: syllabusMeta.negativeMarking,
    difficulty: opts.difficulty ?? 'mixed',
    questionIds: ordered.map((q) => q.id),
    instantFeedback: opts.instantFeedback ?? false,
    createdAt: new Date().toISOString(),
  };
}

function defaultTitle(mode: TestMode): string {
  switch (mode) {
    case 'full': return 'Full-Length Mock Test';
    case 'subject': return 'Subject Test';
    case 'topic': return 'Topic Test';
    case 'random': return 'Random Practice';
    case 'custom': return 'Custom Test';
    case 'daily': return `Daily Challenge — ${todayISO()}`;
    case 'weekly': return `Weekly Mock — ${isoWeekKey()}`;
    case 'revision': return 'Revision Test';
  }
}

export function createAttempt(config: MockTestConfig): TestAttempt {
  return {
    id: uid('attempt'),
    config,
    answers: Object.fromEntries(config.questionIds.map((id) => [id, { questionId: id, selected: null, markedForReview: false, timeSpentSec: 0, visited: false }])),
    startedAt: new Date().toISOString(),
    currentIndex: 0,
    remainingSec: config.timed ? config.durationMinutes * 60 : 0,
    status: 'in-progress',
  };
}

export function evaluateAttempt(attempt: TestAttempt, questions: Question[]): TestResult {
  const qmap = new Map(questions.map((q) => [q.id, q]));
  let correct = 0, incorrect = 0, unanswered = 0, totalTime = 0;
  const subj = new Map<string, SubjectScore>();
  const topic: Record<string, { correct: number; total: number }> = {};
  for (const id of attempt.config.questionIds) {
    const q = qmap.get(id); const a = attempt.answers[id];
    if (!q) continue;
    totalTime += a?.timeSpentSec ?? 0;
    const ss = subj.get(q.subjectId) ?? { subjectId: q.subjectId, attempted: 0, correct: 0, incorrect: 0, total: 0, accuracy: 0 };
    ss.total++;
    topic[q.topicId] = topic[q.topicId] ?? { correct: 0, total: 0 };
    topic[q.topicId].total++;
    if (!a?.selected) unanswered++;
    else {
      ss.attempted++;
      if (a.selected === q.correct) { correct++; ss.correct++; topic[q.topicId].correct++; }
      else { incorrect++; ss.incorrect++; }
    }
    subj.set(q.subjectId, ss);
  }
  const { marksPerQuestion, negativeMarks, negativeMarking } = attempt.config;
  const score = correct * marksPerQuestion - (negativeMarking ? incorrect * negativeMarks : 0);
  const attempted = correct + incorrect;
  const subjectScores = [...subj.values()].map((s) => ({ ...s, accuracy: s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0 }));
  const recommendedTopics = Object.entries(topic)
    .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .slice(0, 5)
    .map(([k]) => k);
  return {
    score: Math.max(score, -Infinity),
    maxScore: attempt.config.questionIds.length * marksPerQuestion,
    correct, incorrect, unanswered,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    avgTimeSec: attempted ? Math.round(totalTime / attempted) : 0,
    totalTimeSec: totalTime,
    subjectScores,
    topicScores: topic,
    recommendedTopics,
  };
}
