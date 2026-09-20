import type { CurrentAffair } from '@/types/models';
import sep2026 from './2026-09.json';

/**
 * Bundled current-affairs archive. New months are added as separate files by the daily refresh job
 * (see server/src/jobs/dailyRefresh.ts) or by the admin panel (stored in localStorage until synced).
 */
export const bundledCurrentAffairs: CurrentAffair[] = [...(sep2026 as CurrentAffair[])];
