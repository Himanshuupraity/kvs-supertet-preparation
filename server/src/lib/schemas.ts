import { z } from 'zod';

/** Shared schemas for AI structured outputs. Mirrors src/types/models.ts on the frontend. */
export const ScoreBreakdownSchema = z.object({
  contentKnowledge: z.number().min(0).max(30),
  relevance: z.number().min(0).max(20),
  communication: z.number().min(0).max(15),
  structure: z.number().min(0).max(10),
  delivery: z.number().min(0).max(10),
  teachingApproach: z.number().min(0).max(10),
  examples: z.number().min(0).max(5),
  total: z.number().min(0).max(100),
});

export const EvaluationSchema = z.object({
  breakdown: ScoreBreakdownSchema,
  strengths: z.array(z.string()).min(1).max(5),
  improvements: z.array(z.string()).max(6),
  missingPoints: z.array(z.string()).max(6),
  betterStructure: z.array(z.string()).min(3).max(7),
  recommendedPractice: z.array(z.string()).min(1).max(5),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const FollowUpSchema = z.object({ followUp: z.string().nullable() });

export const McqSchema = z.object({
  text: z.string(),
  textHi: z.string(),
  options: z.array(z.object({ key: z.enum(['A', 'B', 'C', 'D']), text: z.string(), whyIncorrect: z.string().nullable() })).length(4),
  correct: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.enum(['conceptual', 'application', 'scenario', 'fact', 'pedagogy', 'reasoning', 'current-affairs']),
  source: z.string(),
  examRelevance: z.string(),
});
export const McqBatchSchema = z.object({ questions: z.array(McqSchema) });

export const CurrentAffairSummarySchema = z.object({
  title: z.string(), titleHi: z.string(), summary: z.string(), whyItMatters: z.string(),
  category: z.enum(['national', 'international', 'schemes', 'education', 'appointments', 'awards', 'sports', 'science-tech', 'important-days', 'books', 'reports', 'economy', 'polity', 'uttar-pradesh', 'initiatives', 'defence']),
  mcq: McqSchema.nullable(),
});
