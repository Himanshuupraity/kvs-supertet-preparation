import { env } from '../lib/env.js';
import type { AIProvider } from './types.js';
import { anthropicProvider } from './anthropic.js';
import { openAICompatibleProvider } from './openaiCompatible.js';

let cached: AIProvider | null | undefined;
export function getProvider(): AIProvider | null {
  if (cached !== undefined) return cached;
  if (env.aiProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) cached = anthropicProvider(env.anthropicModel);
  else if (env.aiProvider === 'openai-compatible' && env.openaiKey) cached = openAICompatibleProvider(env.openaiKey, env.openaiBase, env.openaiModel);
  else cached = null;
  return cached;
}
