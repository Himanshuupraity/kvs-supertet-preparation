import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bookmark, DailyActivity, QuestionHistoryEntry, TestAttempt } from '@/types/models';
import { todayISO } from '@/utils/dates';

interface ProgressState {
  attempts: Record<string, TestAttempt>;
  questionHistory: Record<string, QuestionHistoryEntry>;
  bookmarks: Bookmark[];
  daily: Record<string, DailyActivity>;
  recentlyStudied: { type: 'topic' | 'note' | 'subject' | 'ca'; id: string; at: string }[];
  readCurrentAffairIds: string[];
  practicedInterviewIds: Record<string, string>; // id -> last practiced at
  completedTargets: Record<string, string[]>; // date -> manual checklist items ticked

  saveAttempt: (a: TestAttempt) => void;
  deleteAttempt: (id: string) => void;
  recordAnswer: (questionId: string, correct: boolean) => void;
  toggleBookmark: (questionId: string, note?: string) => void;
  isBookmarked: (questionId: string) => boolean;
  bumpDaily: (patch: Partial<Omit<DailyActivity, 'date'>>) => void;
  touchRecent: (type: 'topic' | 'note' | 'subject' | 'ca', id: string) => void;
  markCARead: (id: string) => void;
  markInterviewPracticed: (id: string) => void;
  toggleTarget: (key: string) => void;
  resetAll: () => void;
}

function emptyDay(date: string): DailyActivity {
  return { date, mcqsAttempted: 0, mcqsCorrect: 0, mockTests: 0, gkRead: 0, interviewQuestionsPracticed: 0, aiInterviews: 0, studySeconds: 0 };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      attempts: {},
      questionHistory: {},
      bookmarks: [],
      daily: {},
      recentlyStudied: [],
      readCurrentAffairIds: [],
      practicedInterviewIds: {},
      completedTargets: {},

      saveAttempt: (a) => set((s) => ({ attempts: { ...s.attempts, [a.id]: a } })),
      deleteAttempt: (id) => set((s) => { const c = { ...s.attempts }; delete c[id]; return { attempts: c }; }),
      recordAnswer: (questionId, correct) => set((s) => {
        const prev = s.questionHistory[questionId];
        return {
          questionHistory: {
            ...s.questionHistory,
            [questionId]: {
              questionId,
              attempts: (prev?.attempts ?? 0) + 1,
              correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
              lastAnsweredAt: new Date().toISOString(),
              lastCorrect: correct,
            },
          },
        };
      }),
      toggleBookmark: (questionId, note) => set((s) => s.bookmarks.some((b) => b.questionId === questionId)
        ? { bookmarks: s.bookmarks.filter((b) => b.questionId !== questionId) }
        : { bookmarks: [{ questionId, addedAt: new Date().toISOString(), note }, ...s.bookmarks] }),
      isBookmarked: (questionId) => get().bookmarks.some((b) => b.questionId === questionId),
      bumpDaily: (patch) => set((s) => {
        const d = todayISO();
        const cur = s.daily[d] ?? emptyDay(d);
        const next: DailyActivity = { ...cur };
        (Object.keys(patch) as (keyof typeof patch)[]).forEach((k) => {
          const v = patch[k];
          if (typeof v === 'number') (next as unknown as Record<string, number>)[k] = (cur as unknown as Record<string, number>)[k] + v;
        });
        return { daily: { ...s.daily, [d]: next } };
      }),
      touchRecent: (type, id) => set((s) => ({
        recentlyStudied: [{ type, id, at: new Date().toISOString() }, ...s.recentlyStudied.filter((r) => !(r.type === type && r.id === id))].slice(0, 30),
      })),
      markCARead: (id) => {
        if (get().readCurrentAffairIds.includes(id)) return;
        set((s) => ({ readCurrentAffairIds: [...s.readCurrentAffairIds, id] }));
        get().bumpDaily({ gkRead: 1 });
      },
      markInterviewPracticed: (id) => {
        const already = !!get().practicedInterviewIds[id];
        set((s) => ({ practicedInterviewIds: { ...s.practicedInterviewIds, [id]: new Date().toISOString() } }));
        if (!already) get().bumpDaily({ interviewQuestionsPracticed: 1 });
      },
      toggleTarget: (key) => set((s) => {
        const d = todayISO();
        const cur = s.completedTargets[d] ?? [];
        return { completedTargets: { ...s.completedTargets, [d]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] } };
      }),
      resetAll: () => set({ attempts: {}, questionHistory: {}, bookmarks: [], daily: {}, recentlyStudied: [], readCurrentAffairIds: [], practicedInterviewIds: {}, completedTargets: {} }),
    }),
    { name: 'prt-prep-progress-v1' },
  ),
);
