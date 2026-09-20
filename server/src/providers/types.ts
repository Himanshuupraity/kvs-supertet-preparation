import type { z } from 'zod';

/**
 * Provider-agnostic interface. Every provider must return JSON that validates
 * against the given Zod schema. Swap providers via AI_PROVIDER env var.
 */
export interface AIProvider {
  name: string;
  model: string;
  /** Generate a structured object matching `schema`. */
  structured<T>(opts: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>;
  /** Plain text generation. */
  text(opts: { system: string; user: string; maxTokens?: number }): Promise<string>;
}
