import { Router } from 'express';
import { spawn } from 'node:child_process';
import { env } from '../lib/env.js';

/** Trigger the daily refresh over HTTP (for hosted cron services that can only hit a URL). */
export const jobsRouter = Router();
jobsRouter.post('/daily-refresh', (req, res) => {
  if (!env.adminToken || req.headers.authorization !== `Bearer ${env.adminToken}`) return res.status(401).json({ error: 'Unauthorized' });
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/jobs/dailyRefresh.ts'], { cwd: process.cwd(), stdio: 'inherit' });
  child.on('error', (e) => console.error('job spawn failed', e));
  res.json({ started: true, note: 'Job runs in the background; check server logs.' });
});
