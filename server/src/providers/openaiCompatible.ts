import type { z } from 'zod';
import type { AIProvider } from './types.js';

/** Minimal OpenAI-compatible chat-completions client (works with OpenAI, Azure, Groq, Ollama, etc.). */
export function openAICompatibleProvider(apiKey: string, baseUrl: string, model: string): AIProvider {
  async function chat(system: string, user: string, maxTokens: number, json: boolean): Promise<string> {
    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.3, ...(json ? { response_format: { type: 'json_object' } } : {}), messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!r.ok) throw new Error(`Provider error ${r.status}: ${await r.text()}`);
    const data = (await r.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? '';
  }
  return {
    name: 'openai-compatible', model,
    async structured<T>({ system, user, schema, maxTokens = 4000 }: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T> {
      const raw = await chat(`${system}\nRespond ONLY with a JSON object matching this schema: ${JSON.stringify(zodToHint(schema))}`, user, maxTokens, true);
      const parsed = schema.safeParse(JSON.parse(raw.replace(/^```json|```$/g, '').trim()));
      if (!parsed.success) throw new Error('Schema validation failed: ' + parsed.error.message);
      return parsed.data;
    },
    text: ({ system, user, maxTokens = 2000 }) => chat(system, user, maxTokens, false),
  };
}

function zodToHint(schema: z.ZodType): unknown {
  // zod v4 exposes JSON schema conversion
  try { return (schema as unknown as { toJSONSchema?: () => unknown }).toJSONSchema?.() ?? 'see instructions'; } catch { return 'see instructions'; }
}
