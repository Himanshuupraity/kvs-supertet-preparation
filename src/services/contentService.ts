import type { CurrentAffair, InterviewCategory, InterviewQuestion, Question, StudyNote, Subject, SyllabusMeta, Topic } from '@/types/models';
import syllabus from '@/data/syllabus/supertet-syllabus.json';
import { bundledQuestions } from '@/data/questions';
import { bundledInterviewQuestions, interviewCategories } from '@/data/interview';
import { bundledCurrentAffairs } from '@/data/currentAffairs';
import { bundledNotes } from '@/data/notes';
import { useContentStore } from '@/store/useContentStore';
import { dedupeQuestions } from './dedupe';

/**
 * Single access point for all content. Components never import JSON directly.
 * Merges bundled content with admin overrides from useContentStore.
 * Swap the internals for API calls when the backend is connected.
 */

export const syllabusMeta: SyllabusMeta = syllabus.meta as SyllabusMeta;
export const subjects: Subject[] = (syllabus.subjects as Subject[]).slice().sort((a, b) => a.order - b.order);

const topicIndex = new Map<string, Topic>();
for (const s of subjects) for (const t of s.topics) topicIndex.set(t.id, t);
const subjectIndex = new Map(subjects.map((s) => [s.id, s]));

export function getSubject(id: string): Subject | undefined { return subjectIndex.get(id); }
export function getTopic(id: string): Topic | undefined { return topicIndex.get(id); }
export function getTopicsForSubject(subjectId: string): Topic[] { return subjectIndex.get(subjectId)?.topics ?? []; }

export function getAllQuestions(): Question[] {
  const s = useContentStore.getState();
  const deleted = new Set(s.deletedQuestionIds);
  const merged = [
    ...bundledQuestions.map((q) => s.editedQuestions[q.id] ?? q),
    ...s.addedQuestions,
  ]
    .filter((q) => !deleted.has(q.id))
    .map((q) => (q.id in s.importantOverrides ? { ...q, important: s.importantOverrides[q.id] } : q));
  return dedupeQuestions(merged);
}

export function getQuestion(id: string): Question | undefined {
  return getAllQuestions().find((q) => q.id === id) ?? getAllCurrentAffairs().find((c) => c.mcq?.id === id)?.mcq;
}

export function getQuestionsBySubject(subjectId: string): Question[] {
  return getAllQuestions().filter((q) => q.subjectId === subjectId);
}
export function getQuestionsByTopic(topicId: string): Question[] {
  return getAllQuestions().filter((q) => q.topicId === topicId);
}

export function getInterviewCategories(): InterviewCategory[] { return interviewCategories; }
export function getInterviewQuestions(): InterviewQuestion[] {
  const s = useContentStore.getState();
  const deleted = new Set(s.deletedInterviewQuestionIds);
  return [...bundledInterviewQuestions.map((q) => s.editedInterviewQuestions[q.id] ?? q), ...s.addedInterviewQuestions]
    .filter((q) => !deleted.has(q.id));
}
export function getInterviewQuestion(id: string): InterviewQuestion | undefined {
  return getInterviewQuestions().find((q) => q.id === id);
}

export function getAllCurrentAffairs(): CurrentAffair[] {
  const s = useContentStore.getState();
  const deleted = new Set(s.deletedCurrentAffairIds);
  return [...bundledCurrentAffairs.map((c) => s.editedCurrentAffairs[c.id] ?? c), ...s.addedCurrentAffairs]
    .filter((c) => !deleted.has(c.id))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
export function getCurrentAffair(id: string): CurrentAffair | undefined {
  return getAllCurrentAffairs().find((c) => c.id === id);
}

export function getNotes(): StudyNote[] { return bundledNotes; }
export function getNote(id: string): StudyNote | undefined { return bundledNotes.find((n) => n.id === id); }
export function getNotesForSubject(subjectId: string): StudyNote[] { return bundledNotes.filter((n) => n.subjectId === subjectId); }

/** Subject colour helper used across cards (tailwind class fragments). */
export const subjectColorClasses: Record<string, { bg: string; text: string; ring: string; solid: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', solid: 'bg-amber-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', solid: 'bg-violet-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', solid: 'bg-rose-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', solid: 'bg-emerald-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200', solid: 'bg-sky-500' },
  lime: { bg: 'bg-lime-50', text: 'text-lime-700', ring: 'ring-lime-200', solid: 'bg-lime-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200', solid: 'bg-indigo-500' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', ring: 'ring-fuchsia-200', solid: 'bg-fuchsia-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-200', solid: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', solid: 'bg-orange-500' },
};
export function colorFor(subjectId: string) {
  return subjectColorClasses[getSubject(subjectId)?.color ?? 'sky'] ?? subjectColorClasses.sky;
}
