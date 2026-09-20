import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8787),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  aiProvider: (process.env.AI_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai-compatible' : 'none')) as 'anthropic' | 'openai-compatible' | 'none',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5',
  openaiKey: process.env.OPENAI_API_KEY ?? '',
  openaiBase: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  adminToken: process.env.ADMIN_TOKEN ?? '',
  newsApiKey: process.env.NEWS_API_KEY ?? '',
  newsApiUrl: process.env.NEWS_API_URL ?? '',
  // Comma-separated RSS/Atom feed URLs (no key needed). Used when NEWS_API_URL is unset.
  newsFeeds: (process.env.NEWS_FEEDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  // 'bundled' → the daily job writes into src/data/** (commit + redeploy); 'server' → server/data/*.json
  publishTo: (process.env.PUBLISH_TO ?? 'server') as 'server' | 'bundled',
  dailyMcqCount: Number(process.env.DAILY_MCQ_COUNT ?? 10),
  dailyCaMax: Number(process.env.DAILY_CA_MAX ?? 8),
};
