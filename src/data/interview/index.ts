import type { InterviewCategory, InterviewQuestion } from '@/types/models';
import categories from './categories.json';
import q1 from './questions-1.json';
import q2 from './questions-2.json';

export const interviewCategories = categories as InterviewCategory[];
export const bundledInterviewQuestions: InterviewQuestion[] = [
  ...(q1 as InterviewQuestion[]),
  ...(q2 as InterviewQuestion[]),
];

/** Structure of a full mock interview (15–20 questions) — sections in order with categories to draw from. */
export const fullMockStructure: { section: string; categoryIds: string[]; count: number }[] = [
  { section: 'Introduction', categoryIds: ['intro'], count: 2 },
  { section: 'Motivation', categoryIds: ['why-kvs', 'why-you'], count: 2 },
  { section: 'Teaching Philosophy & Methodology', categoryIds: ['methodology', 'experiential', 'competency'], count: 2 },
  { section: 'Child Psychology', categoryIds: ['child-psych'], count: 2 },
  { section: 'Classroom Scenarios', categoryIds: ['classroom-mgmt', 'remedial', 'gifted', 'difficult', 'discipline'], count: 3 },
  { section: 'Subject Pedagogy', categoryIds: ['evs', 'maths', 'hindi', 'english', 'fln'], count: 2 },
  { section: 'NEP / NCF / Assessment', categoryIds: ['nep', 'ncf', 'assessment', 'inclusive'], count: 2 },
  { section: 'KVS & Education Awareness', categoryIds: ['kvs-org', 'awareness', 'policy-current', 'digital'], count: 2 },
  { section: 'Situational', categoryIds: ['situational', 'parents'], count: 2 },
  { section: 'Closing', categoryIds: ['closing'], count: 1 },
];
