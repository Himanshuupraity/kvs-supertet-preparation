import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types/models';
import { uid } from '@/utils/ids';

interface UserState {
  profile: UserProfile | null;
  onboarded: boolean;
  setProfile: (p: Partial<UserProfile>) => void;
  completeOnboarding: (p: Pick<UserProfile, 'name' | 'targetExam' | 'studyGoal' | 'dailyTargetMinutes'>) => void;
  reset: () => void;
}

export const defaultTargets = { mcqs: 20, mockTests: 1, gk: 10, interviewQuestions: 5, aiInterviews: 1 };

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      onboarded: false,
      setProfile: (p) => set((s) => ({ profile: s.profile ? { ...s.profile, ...p } : s.profile })),
      completeOnboarding: (p) => set({
        onboarded: true,
        profile: {
          id: uid('user'),
          name: p.name.trim() || 'Aspirant',
          targetExam: p.targetExam,
          studyGoal: p.studyGoal,
          dailyTargetMinutes: p.dailyTargetMinutes,
          dailyTargets: defaultTargets,
          language: 'bilingual',
          createdAt: new Date().toISOString(),
          saveRecordingsByDefault: false,
        },
      }),
      reset: () => set({ profile: null, onboarded: false }),
    }),
    { name: 'prt-prep-user-v1' },
  ),
);
