import { getAllQuestions, getAllCurrentAffairs, getInterviewQuestions, getNotes, subjects, getTopic } from './contentService';
import { normalizeText } from '@/utils/text';

export interface SearchResults {
  topics: { id: string; subjectId: string; name: string }[];
  questions: ReturnType<typeof getAllQuestions>;
  interview: ReturnType<typeof getInterviewQuestions>;
  currentAffairs: ReturnType<typeof getAllCurrentAffairs>;
  notes: ReturnType<typeof getNotes>;
}

export function globalSearch(query: string, limit = 12): SearchResults {
  const q = normalizeText(query);
  const empty: SearchResults = { topics: [], questions: [], interview: [], currentAffairs: [], notes: [] };
  if (q.length < 2) return empty;
  const terms = q.split(' ').filter(Boolean);
  const match = (...fields: (string | undefined)[]) => {
    const hay = normalizeText(fields.filter(Boolean).join(' '));
    return terms.every((t) => hay.includes(t));
  };
  return {
    topics: subjects.flatMap((s) => s.topics.filter((t) => match(t.nameEn, t.nameHi, s.nameEn, ...(t.subtopics ?? []))).map((t) => ({ id: t.id, subjectId: s.id, name: t.nameEn }))).slice(0, limit),
    questions: getAllQuestions().filter((x) => match(x.text, x.textHi, x.explanation, ...(x.tags ?? []), getTopic(x.topicId)?.nameEn)).slice(0, limit),
    interview: getInterviewQuestions().filter((x) => match(x.question, x.questionHi, ...x.keyPoints, ...x.keywords)).slice(0, limit),
    currentAffairs: getAllCurrentAffairs().filter((x) => match(x.title, x.summary, x.whyItMatters, ...(x.tags ?? []))).slice(0, limit),
    notes: getNotes().filter((x) => match(x.title, ...x.keyConcepts, ...x.examPoints)).slice(0, limit),
  };
}
