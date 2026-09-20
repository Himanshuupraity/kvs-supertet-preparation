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
