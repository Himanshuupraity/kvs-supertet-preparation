import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrentAffair, InterviewQuestion, Question } from '@/types/models';

/**
 * Admin/content overrides layered on top of bundled JSON.
 * In production this store is replaced by API calls to the backend (see server/ and supabase/schema.sql);
 * the shape is kept identical so the UI does not change.
 */
interface ContentState {
  addedQuestions: Question[];
  editedQuestions: Record<string, Question>;
  deletedQuestionIds: string[];
  importantOverrides: Record<string, boolean>;

  addedCurrentAffairs: CurrentAffair[];
  editedCurrentAffairs: Record<string, CurrentAffair>;
  deletedCurrentAffairIds: string[];

  addedInterviewQuestions: InterviewQuestion[];
  editedInterviewQuestions: Record<string, InterviewQuestion>;
  deletedInterviewQuestionIds: string[];

  upsertQuestion: (q: Question, isNew: boolean) => void;
  deleteQuestion: (id: string) => void;
  restoreQuestion: (id: string) => void;
  setImportant: (id: string, val: boolean) => void;

  upsertCurrentAffair: (ca: CurrentAffair, isNew: boolean) => void;
  deleteCurrentAffair: (id: string) => void;

  upsertInterviewQuestion: (iq: InterviewQuestion, isNew: boolean) => void;
  deleteInterviewQuestion: (id: string) => void;

  resetAll: () => void;
}

const initial = {
  addedQuestions: [], editedQuestions: {}, deletedQuestionIds: [], importantOverrides: {},
  addedCurrentAffairs: [], editedCurrentAffairs: {}, deletedCurrentAffairIds: [],
  addedInterviewQuestions: [], editedInterviewQuestions: {}, deletedInterviewQuestionIds: [],
};

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      ...initial,
      upsertQuestion: (q, isNew) => set((s) => isNew
        ? { addedQuestions: [...s.addedQuestions.filter((x) => x.id !== q.id), q] }
        : s.addedQuestions.some((x) => x.id === q.id)
          ? { addedQuestions: s.addedQuestions.map((x) => (x.id === q.id ? q : x)) }
          : { editedQuestions: { ...s.editedQuestions, [q.id]: q } }),
      deleteQuestion: (id) => set((s) => ({
        deletedQuestionIds: s.deletedQuestionIds.includes(id) ? s.deletedQuestionIds : [...s.deletedQuestionIds, id],
        addedQuestions: s.addedQuestions.filter((x) => x.id !== id),
      })),
      restoreQuestion: (id) => set((s) => ({ deletedQuestionIds: s.deletedQuestionIds.filter((x) => x !== id) })),
      setImportant: (id, val) => set((s) => ({ importantOverrides: { ...s.importantOverrides, [id]: val } })),

      upsertCurrentAffair: (ca, isNew) => set((s) => isNew
        ? { addedCurrentAffairs: [...s.addedCurrentAffairs.filter((x) => x.id !== ca.id), ca] }
        : s.addedCurrentAffairs.some((x) => x.id === ca.id)
          ? { addedCurrentAffairs: s.addedCurrentAffairs.map((x) => (x.id === ca.id ? ca : x)) }
          : { editedCurrentAffairs: { ...s.editedCurrentAffairs, [ca.id]: ca } }),
      deleteCurrentAffair: (id) => set((s) => ({
        deletedCurrentAffairIds: [...new Set([...s.deletedCurrentAffairIds, id])],
        addedCurrentAffairs: s.addedCurrentAffairs.filter((x) => x.id !== id),
      })),

      upsertInterviewQuestion: (iq, isNew) => set((s) => isNew
        ? { addedInterviewQuestions: [...s.addedInterviewQuestions.filter((x) => x.id !== iq.id), iq] }
        : s.addedInterviewQuestions.some((x) => x.id === iq.id)
          ? { addedInterviewQuestions: s.addedInterviewQuestions.map((x) => (x.id === iq.id ? iq : x)) }
          : { editedInterviewQuestions: { ...s.editedInterviewQuestions, [iq.id]: iq } }),
      deleteInterviewQuestion: (id) => set((s) => ({
        deletedInterviewQuestionIds: [...new Set([...s.deletedInterviewQuestionIds, id])],
        addedInterviewQuestions: s.addedInterviewQuestions.filter((x) => x.id !== id),
      })),

      resetAll: () => set(initial),
    }),
    { name: 'prt-prep-content-v1' },
  ),
);
