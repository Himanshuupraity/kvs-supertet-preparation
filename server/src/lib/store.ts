import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Content persistence. Default: JSON files in server/data (zero-setup).
 * To use PostgreSQL/Supabase, implement the same interface with SQL from ../../supabase/schema.sql
 * and swap it in here — routes do not change.
 */
export interface ContentStore {
  list<T>(collection: Collection): Promise<T[]>;
  upsert<T extends { id: string }>(collection: Collection, item: T): Promise<T>;
  remove(collection: Collection, id: string): Promise<boolean>;
}
export type Collection = 'questions' | 'currentAffairs' | 'interviewQuestions' | 'dailySets';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export const fileStore: ContentStore = {
  async list<T>(c: Collection): Promise<T[]> {
    try { return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${c}.json`), 'utf8')) as T[]; } catch { return []; }
  },
  async upsert<T extends { id: string }>(c: Collection, item: T): Promise<T> {
    const all = await this.list<T>(c);
    const i = all.findIndex((x) => x.id === item.id);
    if (i >= 0) all[i] = item; else all.push(item);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${c}.json`), JSON.stringify(all, null, 2));
    return item;
  },
  async remove(c: Collection, id: string) {
    const all = await this.list<{ id: string }>(c);
    const next = all.filter((x) => x.id !== id);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${c}.json`), JSON.stringify(next, null, 2));
    return next.length !== all.length;
  },
};

/**
 * Bundled store — writes straight into the frontend's src/data/** so a static deploy (Vercel)
 * picks new content up on the next build. Current affairs go to one file per month
 * (src/data/currentAffairs/YYYY-MM.json, auto-loaded by index.ts); generated MCQs to
 * src/data/questions/generated.json. Other collections fall back to server/data.
 */
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
function bundledPath(c: Collection, item?: { date?: string; createdAt?: string }): string | null {
  if (c === 'currentAffairs') {
    const month = (item?.date ?? new Date().toISOString()).slice(0, 7);
    return path.join(REPO_ROOT, 'src/data/currentAffairs', `${month}.json`);
  }
  if (c === 'questions') return path.join(REPO_ROOT, 'src/data/questions/generated.json');
  return null;
}
async function readJson<T>(file: string): Promise<T[]> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T[]; } catch { return []; }
}
export const bundledStore: ContentStore = {
  async list<T>(c: Collection): Promise<T[]> {
    if (c === 'currentAffairs') {
      const dir = path.join(REPO_ROOT, 'src/data/currentAffairs');
      const files = (await fs.readdir(dir)).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();
      const all: T[] = [];
      for (const f of files) all.push(...(await readJson<T>(path.join(dir, f))));
      return all;
    }
    if (c === 'questions') {
      const dir = path.join(REPO_ROOT, 'src/data/questions');
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
      const all: T[] = [];
      for (const f of files) all.push(...(await readJson<T>(path.join(dir, f))));
      return all;
    }
    return fileStore.list<T>(c);
  },
  async upsert<T extends { id: string }>(c: Collection, item: T): Promise<T> {
    const file = bundledPath(c, item as { date?: string });
    if (!file) return fileStore.upsert(c, item);
    const all = await readJson<T>(file);
    const i = all.findIndex((x) => x.id === item.id);
    if (i >= 0) all[i] = item; else all.push(item);
    await fs.writeFile(file, JSON.stringify(all, null, 2) + '\n');
    return item;
  },
  async remove(c: Collection, id: string) {
    const file = bundledPath(c);
    if (!file) return fileStore.remove(c, id);
    const all = await readJson<{ id: string }>(file);
    const next = all.filter((x) => x.id !== id);
    await fs.writeFile(file, JSON.stringify(next, null, 2) + '\n');
    return next.length !== all.length;
  },
};
