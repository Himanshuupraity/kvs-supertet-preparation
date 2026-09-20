import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InterviewSession } from '@/types/models';

interface InterviewState {
  sessions: Record<string, InterviewSession>;
  saveSession: (s: InterviewSession) => void;
  deleteSession: (id: string) => void;
  resetAll: () => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      sessions: {},
      saveSession: (s) => set((st) => ({ sessions: { ...st.sessions, [s.id]: s } })),
      deleteSession: (id) => set((st) => { const c = { ...st.sessions }; delete c[id]; return { sessions: c }; }),
      resetAll: () => set({ sessions: {} }),
    }),
    { name: 'prt-prep-interviews-v1' },
  ),
);
