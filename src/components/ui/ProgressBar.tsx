import { cn } from '@/utils/cn';

export function ProgressBar({ value, max = 100, className, color = 'bg-brand-600', label }: { value: number; max?: number; className?: string; color?: string; label?: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-2.5 w-full rounded-full bg-surface-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function accuracyColor(pct: number) {
  return pct >= 75 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
}
