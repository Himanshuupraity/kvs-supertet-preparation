import { Clock } from 'lucide-react';
import { secondsToClock } from '@/utils/dates';
import { cn } from '@/utils/cn';

export function Timer({ remaining, timed }: { remaining: number; timed: boolean }) {
  const low = timed && remaining <= 300;
  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold tabular-nums text-sm', low ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-white text-ink border border-surface-border')} aria-live={low ? 'assertive' : 'off'}>
      <Clock size={16} /> {timed ? secondsToClock(remaining) : 'Untimed'}
    </div>
  );
}
