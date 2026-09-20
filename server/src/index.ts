import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env.js';
import { aiRouter } from './routes/ai.js';
import { contentRouter } from './routes/content.js';
import { jobsRouter } from './routes/jobs.js';

const app = express();
app.use(cors({ origin: env.corsOrigin.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/ai', rateLimit({ windowMs: 60_000, limit: 30 }));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/ai', aiRouter);
app.use('/api/content', contentRouter);
app.use('/api/jobs', jobsRouter);

app.listen(env.port, () => console.log(`PRT Prep API listening on http://localhost:${env.port} (AI provider: ${env.aiProvider})`));
