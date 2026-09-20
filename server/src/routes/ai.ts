import { Router } from 'express';
import { z } from 'zod';
import { getProvider } from '../providers/index.js';
import { EvaluationSchema, FollowUpSchema } from '../lib/schemas.js';
import { EVALUATOR_SYSTEM, FOLLOWUP_SYSTEM, RECOMMEND_SYSTEM } from '../lib/prompts.js';

export const aiRouter = Router();

aiRouter.get('/health', (_req, res) => {
  const p = getProvider();
  res.json({ ok: true, provider: p?.name ?? null, model: p?.model ?? null });
});

const EvaluateBody = z.object({
  question: z.string(), keyPoints: z.array(z.string()), checking: z.array(z.string()).optional(),
  transcript: z.string().min(1), durationSec: z.number(),
  communication: z.object({ wordCount: z.number(), wordsPerMinute: z.number(), fillerWords: z.number(), fillerRatio: z.number(), repeatedPhrases: z.number(), sentenceCount: z.number() }).partial(),
  presentation: z.object({ faceVisibleRatio: z.number().nullable(), centeredRatio: z.number().nullable(), motionScore: z.number().nullable(), supported: z.boolean() }).partial().nullable(),
});

aiRouter.post('/evaluate', async (req, res) => {
  const p = getProvider();
  if (!p) return res.status(503).json({ error: 'AI provider not configured' });
  const body = EvaluateBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const b = body.data;
  const user = `QUESTION: ${b.question}
KEY POINTS EXPECTED: ${b.keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}
${b.checking?.length ? `INTERVIEWER IS CHECKING: ${b.checking.join('; ')}` : ''}
DURATION: ${b.durationSec} seconds
OBJECTIVE METRICS: ${JSON.stringify(b.communication)}
PRESENTATION METRICS (observable only, may be null): ${JSON.stringify(b.presentation)}

TRANSCRIPT:
"""${b.transcript}"""`;
  try {
    const out = await p.structured({ system: EVALUATOR_SYSTEM, user, schema: EvaluationSchema });
    const bd = out.breakdown;
    bd.total = Math.round(bd.contentKnowledge + bd.relevance + bd.communication + bd.structure + bd.delivery + bd.teachingApproach + bd.examples);
    res.json(out);
  } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});

aiRouter.post('/follow-up', async (req, res) => {
  const p = getProvider();
  if (!p) return res.status(503).json({ error: 'AI provider not configured' });
  const body = z.object({ question: z.string(), transcript: z.string(), missingPoints: z.array(z.string()).optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  try {
    const out = await p.structured({ system: FOLLOWUP_SYSTEM, user: `QUESTION: ${body.data.question}\nMISSED POINTS: ${(body.data.missingPoints ?? []).join('; ') || 'none'}\nTRANSCRIPT: """${body.data.transcript}"""`, schema: FollowUpSchema, maxTokens: 300 });
    res.json(out);
  } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});

aiRouter.post('/recommend', async (req, res) => {
  const p = getProvider();
  if (!p) return res.status(503).json({ error: 'AI provider not configured' });
  const body = z.object({ weakTopics: z.array(z.object({ name: z.string(), accuracy: z.number() })), recentScores: z.array(z.number()), minutes: z.number() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  try {
    const text = await p.text({ system: RECOMMEND_SYSTEM, user: JSON.stringify(body.data), maxTokens: 400 });
    res.json({ text });
  } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});
