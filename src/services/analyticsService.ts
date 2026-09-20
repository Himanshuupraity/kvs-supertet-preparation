import type { InterviewSession, QuestionHistoryEntry, TestAttempt } from '@/types/models';
import { getAllQuestions, getTopic, getSubject, subjects } from './contentService';
import { lastNDays } from '@/utils/dates';

export interface TopicPerformance { topicId: string; subjectId: string; name: string; attempted: number; correct: number; accuracy: number; }
export interface SubjectPerformance { subjectId: string; name: string; attempted: number; correct: number; accuracy: number; }

export function subjectPerformance(history: Record<string, QuestionHistoryEntry>): SubjectPerformance[] {
  const qmap = new Map(getAllQuestions().map((q) => [q.id, q]));
  const agg = new Map<string, { attempted: number; correct: number }>();
  for (const h of Object.values(history)) {
    const q = qmap.get(h.questionId); if (!q) continue;
    const a = agg.get(q.subjectId) ?? { attempted: 0, correct: 0 };
    a.attempted += h.attempts; a.correct += h.correct; agg.set(q.subjectId, a);
  }
  return subjects.map((s) => {
    const a = agg.get(s.id) ?? { attempted: 0, correct: 0 };
    return { subjectId: s.id, name: s.nameEn, attempted: a.attempted, correct: a.correct, accuracy: a.attempted ? Math.round((a.correct / a.attempted) * 100) : 0 };
  });
}

export function topicPerformance(history: Record<string, QuestionHistoryEntry>): TopicPerformance[] {
  const qmap = new Map(getAllQuestions().map((q) => [q.id, q]));
  const agg = new Map<string, { subjectId: string; attempted: number; correct: number }>();
  for (const h of Object.values(history)) {
    const q = qmap.get(h.questionId); if (!q) continue;
    const a = agg.get(q.topicId) ?? { subjectId: q.subjectId, attempted: 0, correct: 0 };
    a.attempted += h.attempts; a.correct += h.correct; agg.set(q.topicId, a);
  }
  return [...agg.entries()].map(([topicId, a]) => ({
    topicId, subjectId: a.subjectId, name: getTopic(topicId)?.nameEn ?? topicId,
    attempted: a.attempted, correct: a.correct, accuracy: Math.round((a.correct / a.attempted) * 100),
  }));
}

/** Weak areas: topics/subjects with ≥3 attempts and accuracy < 65%, sorted ascending. */
export function weakTopics(history: Record<string, QuestionHistoryEntry>, minAttempts = 3, threshold = 65): TopicPerformance[] {
  return topicPerformance(history).filter((t) => t.attempted >= minAttempts && t.accuracy < threshold).sort((a, b) => a.accuracy - b.accuracy);
}
export function weakSubjects(history: Record<string, QuestionHistoryEntry>, minAttempts = 5, threshold = 65): SubjectPerformance[] {
  return subjectPerformance(history).filter((s) => s.attempted >= minAttempts && s.accuracy < threshold).sort((a, b) => a.accuracy - b.accuracy);
}

export function overallStats(history: Record<string, QuestionHistoryEntry>, attempts: Record<string, TestAttempt>) {
  const hs = Object.values(history);
  const attempted = hs.reduce((a, h) => a + h.attempts, 0);
  const correct = hs.reduce((a, h) => a + h.correct, 0);
  const submitted = Object.values(attempts).filter((a) => a.status === 'submitted' && a.result);
  const avgScorePct = submitted.length
    ? Math.round(submitted.reduce((a, t) => a + (t.result!.maxScore ? (Math.max(0, t.result!.score) / t.result!.maxScore) * 100 : 0), 0) / submitted.length)
    : 0;
  const avgTime = submitted.length ? Math.round(submitted.reduce((a, t) => a + t.result!.avgTimeSec, 0) / submitted.length) : 0;
  return { attempted, correct, incorrect: attempted - correct, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0, tests: submitted.length, avgScorePct, avgTimeSec: avgTime };
}

export function scoreTrend(attempts: Record<string, TestAttempt>) {
  return Object.values(attempts)
    .filter((a) => a.status === 'submitted' && a.result)
    .sort((a, b) => a.submittedAt!.localeCompare(b.submittedAt!))
    .map((a, i) => ({ idx: i + 1, label: a.config.title.slice(0, 18), pct: a.result!.maxScore ? Math.round((Math.max(0, a.result!.score) / a.result!.maxScore) * 100) : 0, date: a.submittedAt!.slice(0, 10) }));
}

export function weeklyActivity(daily: Record<string, { mcqsAttempted: number; mcqsCorrect: number; studySeconds: number }>, days = 7) {
  return lastNDays(days).map((d) => ({ date: d, day: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }), mcqs: daily[d]?.mcqsAttempted ?? 0, correct: daily[d]?.mcqsCorrect ?? 0, minutes: Math.round((daily[d]?.studySeconds ?? 0) / 60) }));
}

export function computeStreak(daily: Record<string, { mcqsAttempted: number; gkRead: number; interviewQuestionsPracticed: number; aiInterviews: number; mockTests: number }>): { current: number; last7: { date: string; active: boolean }[] } {
  const active = (d: string) => { const x = daily[d]; return !!x && (x.mcqsAttempted > 0 || x.gkRead > 0 || x.interviewQuestionsPracticed > 0 || x.aiInterviews > 0 || x.mockTests > 0); };
  const days = lastNDays(400);
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (active(days[i])) current++;
    else if (i === days.length - 1) continue; // today not yet active doesn't break streak
    else break;
  }
  return { current, last7: lastNDays(7).map((d) => ({ date: d, active: active(d) })) };
}

export function interviewTrend(sessions: Record<string, InterviewSession>) {
  return Object.values(sessions)
    .filter((s) => s.status === 'completed' && s.report)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s, i) => ({
      idx: i + 1, id: s.id, date: s.startedAt.slice(0, 10), overall: s.report!.overall,
      content: s.report!.breakdownAvg.contentKnowledge, relevance: s.report!.breakdownAvg.relevance,
      communication: s.report!.breakdownAvg.communication, delivery: s.report!.breakdownAvg.delivery,
      teaching: s.report!.breakdownAvg.teachingApproach, structure: s.report!.breakdownAvg.structure,
    }));
}

export function subjectName(id: string) { return getSubject(id)?.nameEn ?? id; }
