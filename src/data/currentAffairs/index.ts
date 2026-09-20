import type { CurrentAffair } from '@/types/models';

/**
 * Bundled current-affairs archive — one file per month (YYYY-MM.json). Every file in this folder is
 * loaded automatically, so the daily refresh job (server/src/jobs/dailyRefresh.ts, run by
 * .github/workflows/daily-refresh.yml) can add new months without touching this file.
 */
const months = import.meta.glob<CurrentAffair[]>('./*.json', { eager: true, import: 'default' });

export const bundledCurrentAffairs: CurrentAffair[] = Object.keys(months)
  .sort()
  .flatMap((k) => months[k]);
