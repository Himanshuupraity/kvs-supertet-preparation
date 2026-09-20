import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { AIProvider } from './types.js';

export function anthropicProvider(model: string): AIProvider {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  return {
    name: 'anthropic',
    model,
    async structured<T>({ system, user, schema, maxTokens = 4000 }: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T> {
      const res = await client.messages.parse({
        model, max_tokens: maxTokens, system,
        messages: [{ role: 'user', content: user }],
        output_config: { format: zodOutputFormat(schema as never) },
      });
      if (res.stop_reason === 'refusal') throw new Error('Model refused the request');
      if (!res.parsed_output) throw new Error('Structured output parsing failed');
      return res.parsed_output as T;
    },
    async text({ system, user, maxTokens = 2000 }) {
      const res = await client.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
      return res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n').trim();
    },
  };
}
