import type { InterviewFeedback, InterviewQuestion, PresentationMetrics } from '@/types/models';
import { rubricEvaluate } from './evaluationService';

/**
 * Provider-agnostic AI client. The browser NEVER holds an API key; it calls the
 * backend (server/) which talks to Anthropic/OpenAI/etc. If the backend is not
 * reachable or AI is disabled, callers fall back to the offline rubric.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const AI_ENABLED = (import.meta.env.VITE_AI_ENABLED ?? 'auto') !== 'false';

let healthCache: { at: number; ok: boolean } | null = null;

export async function aiAvailable(): Promise<boolean> {
  if (!AI_ENABLED) return false;
  if (healthCache && Date.now() - healthCache.at < 60_000) return healthCache.ok;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`${BASE}/ai/health`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = r.ok ? await r.json() : { ok: false };
    healthCache = { at: Date.now(), ok: !!j.ok && !!j.provider };
  } catch { healthCache = { at: Date.now(), ok: false }; }
  return healthCache.ok;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`AI request failed: ${r.status}`);
  return r.json() as Promise<T>;
}

export interface EvaluateInput { question: InterviewQuestion; transcript: string; durationSec: number; presentation: PresentationMetrics | null; }

/** Evaluate an answer — AI if available, otherwise rubric. Always returns a result. */
export async function evaluateAnswer(input: EvaluateInput): Promise<InterviewFeedback> {
  const local = rubricEvaluate(input.transcript, input.durationSec, input.question, input.presentation);
  if (!(await aiAvailable())) return local;
  try {
    const ai = await post<Partial<InterviewFeedback>>('/ai/evaluate', {
      question: input.question.question,
      keyPoints: input.question.keyPoints,
      checking: input.question.checking,
      transcript: input.transcript,
      durationSec: input.durationSec,
      communication: local.communication,
      presentation: input.presentation,
    });
    // merge: AI narrative + scores, local metrics kept as ground truth
    return {
      ...local,
      ...ai,
      breakdown: ai.breakdown ?? local.breakdown,
      communication: local.communication,
      presentation: input.presentation,
      betterStructure: ai.betterStructure ?? local.betterStructure,
      evaluatedBy: 'ai',
    };
  } catch (e) {
    console.warn('AI evaluation failed, using rubric', e);
    return local;
  }
}

/** Dynamic follow-up. Returns null if AI unavailable (caller uses the question tree). */
export async function generateFollowUp(question: string, transcript: string, feedback: InterviewFeedback): Promise<string | null> {
  if (!(await aiAvailable())) return null;
  try {
    const r = await post<{ followUp: string | null }>('/ai/follow-up', { question, transcript, missingPoints: feedback.missingPoints });
    return r.followUp?.trim() || null;
  } catch { return null; }
}

export interface StudyRecommendationInput { weakTopics: { name: string; accuracy: number }[]; recentScores: number[]; minutes: number; }
export async function personalizedRecommendation(input: StudyRecommendationInput): Promise<string | null> {
  if (!(await aiAvailable())) return null;
  try { const r = await post<{ text: string }>('/ai/recommend', input); return r.text; } catch { return null; }
}
