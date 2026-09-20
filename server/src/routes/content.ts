import { Router, type Request, type Response, type NextFunction } from 'express';
import { env } from '../lib/env.js';
import { fileStore, type Collection } from '../lib/store.js';

/**
 * Content API consumed by the admin panel and the daily job.
 * GET is public (the app can fetch fresh content); mutations need the admin bearer token.
 */
export const contentRouter = Router();
const COLLECTIONS: Collection[] = ['questions', 'currentAffairs', 'interviewQuestions', 'dailySets'];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!env.adminToken) return res.status(503).json({ error: 'ADMIN_TOKEN not configured on server' });
  if (req.headers.authorization !== `Bearer ${env.adminToken}`) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
function collection(req: Request, res: Response): Collection | null {
  const c = req.params.collection as Collection;
  if (!COLLECTIONS.includes(c)) { res.status(404).json({ error: 'Unknown collection' }); return null; }
  return c;
}

contentRouter.get('/:collection', async (req, res) => {
  const c = collection(req, res); if (!c) return;
  res.json(await fileStore.list(c));
});
contentRouter.post('/:collection', requireAdmin, async (req, res) => {
  const c = collection(req, res); if (!c) return;
  const item = req.body as { id?: string };
  if (!item?.id) return res.status(400).json({ error: 'id required' });
  res.json(await fileStore.upsert(c, item as { id: string }));
});
contentRouter.delete('/:collection/:id', requireAdmin, async (req, res) => {
  const c = collection(req, res); if (!c) return;
  res.json({ removed: await fileStore.remove(c, req.params.id as string) });
});
