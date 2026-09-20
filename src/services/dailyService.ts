import type { Question } from '@/types/models';
import { getAllQuestions, getAllCurrentAffairs } from './contentService';
import { seededShuffle } from '@/utils/seeded';
import { todayISO, isoWeekKey } from '@/utils/dates';
import { buildTest } from './testService';

/**
 * Deterministic daily/weekly selections. The same content is shown for the whole day
 * across devices without a server. When the backend daily-refresh job is connected,
 * the server can pin an explicit list of question IDs for the day instead.
 */
export function todaysPracticeQuestions(n = 10, date = todayISO()): Question[] {
  const all = getAllQuestions();
  // prefer questions added/updated recently, then fill with the rest
  const recent = all.filter((q) => q.updatedAt >= addDaysISO(date, -14));
  const rest = all.filter((q) => !recent.includes(q));
  const pick = [...seededShuffle(recent, 'today-' + date), ...seededShuffle(rest, 'today-fill-' + date)];
  return pick.slice(0, n);
}

export function dailyChallengeConfig(date = todayISO()) {
  return buildTest({ mode: 'daily', questionCount: 20, timed: true, durationMinutes: 20, seed: 'daily-' + date, title: `Daily Challenge — ${date}` });
}

export function weeklyMockConfig(week = isoWeekKey()) {
  return buildTest({ mode: 'weekly', questionCount: 60, timed: true, durationMinutes: 60, seed: 'weekly-' + week, title: `Weekly Super TET Mock — ${week}` });
}

export function todaysCurrentAffairs(date = todayISO()) {
  const all = getAllCurrentAffairs();
  const today = all.filter((c) => c.publishedOn === date || c.date === date);
  return today.length ? today : all.slice(0, 10);
}

function addDaysISO(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return todayISO(d);
}
