import type { QuestionHistoryEntry, StudyPlanBlock, UserProfile } from '@/types/models';
import { subjects } from './contentService';
import { weakSubjects, subjectPerformance } from './analyticsService';

/**
 * Builds a daily plan proportional to (a) exam weightage and (b) weakness.
 * Fixed blocks: current affairs + KVS interview (when target includes KVS).
 */
export function generateStudyPlan(totalMinutes: number, history: Record<string, QuestionHistoryEntry>, profile: UserProfile | null): StudyPlanBlock[] {
  const blocks: StudyPlanBlock[] = [];
  const target = profile?.targetExam ?? 'both';
  let remaining = totalMinutes;

  const caMin = Math.max(10, Math.round(totalMinutes * 0.15));
  blocks.push({ subjectId: 'ca', label: "Today's GK & Current Affairs", minutes: caMin, reason: '25 of 120 questions are GK/current events — daily reading compounds.', route: '/current-affairs' });
  remaining -= caMin;

  if (target !== 'supertet') {
    const kvsMin = Math.max(15, Math.round(totalMinutes * 0.22));
    blocks.push({ subjectId: 'kvs', label: 'KVS Interview practice (2 questions aloud + 1 model answer)', minutes: kvsMin, reason: 'Speaking practice daily builds fluency and confidence.', route: '/kvs' });
    remaining -= kvsMin;
  }

  if (target !== 'kvs') {
    const perf = subjectPerformance(history);
    const weak = weakSubjects(history);
    // weight = exam share × weakness multiplier
    const weights = subjects.map((s) => {
      const p = perf.find((x) => x.subjectId === s.id);
      const isWeak = weak.some((w) => w.subjectId === s.id);
      const weaknessMult = p && p.attempted >= 5 ? (1 + (100 - p.accuracy) / 100) : 1.2; // unexplored subjects get slight boost
      return { s, w: s.questionsInExam * weaknessMult * (isWeak ? 1.4 : 1), acc: p?.accuracy, attempted: p?.attempted ?? 0 };
    }).sort((a, b) => b.w - a.w);
    const top = weights.slice(0, remaining >= 60 ? 4 : 3);
    const totalW = top.reduce((a, b) => a + b.w, 0);
    for (const t of top) {
      const mins = Math.max(10, Math.round((t.w / totalW) * remaining / 5) * 5);
      const reason = t.attempted >= 5
        ? (t.acc !== undefined && t.acc < 65 ? `Weak area — ${t.acc}% accuracy so far.` : `${t.acc}% accuracy; high exam weight (${t.s.questionsInExam} Qs).`)
        : `Not practised enough yet; carries ${t.s.questionsInExam} questions in the exam.`;
      blocks.push({ subjectId: t.s.id, label: t.s.nameEn, minutes: mins, reason, route: `/supertet/subject/${t.s.id}` });
    }
  }
  // normalise to total
  const sum = blocks.reduce((a, b) => a + b.minutes, 0);
  if (sum !== totalMinutes && blocks.length) blocks[blocks.length - 1].minutes += totalMinutes - sum;
  return blocks;
}
