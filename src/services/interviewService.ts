import type { InterviewMode, InterviewQuestion, InterviewReport, InterviewSession, ScoreBreakdown } from '@/types/models';
import { getInterviewQuestions, getInterviewCategories } from './contentService';
import { fullMockStructure } from '@/data/interview';
import { shuffle } from '@/utils/seeded';
import { uid } from '@/utils/ids';

const MODE_COUNTS: Record<InterviewMode, number> = { beginner: 5, standard: 8, advanced: 10, full: 18 };

export function planSession(mode: InterviewMode): InterviewSession {
  const all = getInterviewQuestions();
  let planned: InterviewQuestion[] = [];
  if (mode === 'full') {
    const used = new Set<string>();
    for (const sec of fullMockStructure) {
      const pool = shuffle(all.filter((q) => sec.categoryIds.includes(q.categoryId) && !used.has(q.id)));
      for (const q of pool.slice(0, sec.count)) { planned.push(q); used.add(q.id); }
    }
  } else {
    const levels: InterviewQuestion['level'][] = mode === 'beginner' ? ['beginner', 'standard'] : mode === 'standard' ? ['standard', 'beginner', 'advanced'] : ['advanced', 'standard'];
    const intro = all.find((q) => q.categoryId === 'intro' && q.id === 'iq-001');
    const rest = shuffle(all.filter((q) => q.id !== intro?.id && q.categoryId !== 'closing' && levels.includes(q.level)))
      .sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level));
    // ensure category diversity: at most 1 per category first pass
    const seen = new Set<string>(); const diverse: InterviewQuestion[] = []; const spare: InterviewQuestion[] = [];
    for (const q of rest) { if (seen.has(q.categoryId)) spare.push(q); else { seen.add(q.categoryId); diverse.push(q); } }
    planned = [intro!, ...shuffle(diverse), ...spare].filter(Boolean).slice(0, MODE_COUNTS[mode]);
  }
  return {
    id: uid('iv'), mode, startedAt: new Date().toISOString(), answers: [], plannedQuestionIds: planned.map((q) => q.id),
    overallScore: null, report: null, status: 'in-progress',
  };
}

const KEYS: (keyof Omit<ScoreBreakdown, 'total'>)[] = ['contentKnowledge', 'relevance', 'communication', 'structure', 'delivery', 'teachingApproach', 'examples'];
export const MAXES: Record<keyof Omit<ScoreBreakdown, 'total'>, number> = { contentKnowledge: 30, relevance: 20, communication: 15, structure: 10, delivery: 10, teachingApproach: 10, examples: 5 };
export const LABELS: Record<keyof Omit<ScoreBreakdown, 'total'>, string> = { contentKnowledge: 'Content knowledge', relevance: 'Answer relevance', communication: 'Communication', structure: 'Structure', delivery: 'Confidence / delivery', teachingApproach: 'Teaching approach', examples: 'Examples / practicality' };

export function buildReport(session: InterviewSession): InterviewReport {
  const evaluated = session.answers.filter((a) => a.feedback);
  const avg: ScoreBreakdown = { contentKnowledge: 0, relevance: 0, communication: 0, structure: 0, delivery: 0, teachingApproach: 0, examples: 0, total: 0 };
  if (evaluated.length) {
    for (const k of KEYS) avg[k] = Math.round((evaluated.reduce((s, a) => s + a.feedback!.breakdown[k], 0) / evaluated.length) * 10) / 10;
    avg.total = Math.round(evaluated.reduce((s, a) => s + a.feedback!.breakdown.total, 0) / evaluated.length);
  }
  const pctOf = (k: keyof typeof MAXES) => (avg[k] / MAXES[k]) * 100;
  const ranked = KEYS.map((k) => ({ k, pct: pctOf(k) })).sort((a, b) => b.pct - a.pct);
  const strong = ranked.filter((r) => r.pct >= 65).slice(0, 3).map((r) => `${LABELS[r.k]} — ${Math.round(r.pct)}%`);
  const improve = ranked.filter((r) => r.pct < 65).slice(-3).reverse().map((r) => `${LABELS[r.k]} — ${Math.round(r.pct)}%`);

  const cats = getInterviewCategories();
  const catScores: Record<string, number> = {};
  const qs = getInterviewQuestions();
  for (const c of cats) {
    const ans = evaluated.filter((a) => qs.find((q) => q.id === a.questionId)?.categoryId === c.id);
    if (ans.length) catScores[c.name] = Math.round(ans.reduce((s, a) => s + a.feedback!.breakdown.total, 0) / ans.length);
  }

  const allMissing = evaluated.flatMap((a) => a.feedback!.missingPoints);
  const practice = new Set<string>();
  if (pctOf('examples') < 60) practice.add('Prepare 5 classroom stories (a weak reader, a discipline incident, a parent meeting, an inclusive-education moment, an activity that worked) and use one in every answer.');
  if (pctOf('structure') < 60) practice.add('Practise the PREP structure — Point, Reason, Example, Point — for 10 questions a day.');
  if (pctOf('communication') < 60) practice.add('Record 1-minute answers and count filler words; aim for under 3 per minute.');
  if (pctOf('contentKnowledge') < 60) practice.add('Revise NEP 2020, NCF-FS 2022, NIPUN Bharat, RTE and RPwD Act key points from the Study Notes.');
  if (pctOf('teachingApproach') < 60) practice.add('When answering, always say what YOU would do in the classroom, step by step, with TLM and assessment.');
  if (pctOf('delivery') < 60) practice.add('Sit at eye level with the camera, pause before answering, and keep gestures small.');
  const weakestCats = Object.entries(catScores).sort((a, b) => a[1] - b[1]).slice(0, 2);
  for (const [c, s] of weakestCats) if (s < 65) practice.add(`Re-practise "${c}" questions (scored ${s}/100).`);
  if (allMissing.length) practice.add(`Frequently missed points: ${[...new Set(allMissing)].slice(0, 3).join('; ')}.`);

  return { overall: avg.total, breakdownAvg: avg, strongAreas: strong, improveAreas: improve, recommendedPractice: [...practice], categoryScores: catScores };
}

export function readinessScore(sessions: InterviewSession[], practicedCount: number, totalQuestions: number): number {
  const completed = sessions.filter((s) => s.status === 'completed' && s.report);
  const recent = completed.slice(-3);
  const scorePart = recent.length ? recent.reduce((a, s) => a + s.report!.overall, 0) / recent.length : 0;
  const coverage = totalQuestions ? Math.min(1, practicedCount / totalQuestions) : 0;
  const volume = Math.min(1, completed.length / 5);
  return Math.round(0.6 * scorePart + 25 * coverage + 15 * volume);
}
