import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function StatTile({ label, value, sub, icon, className }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('card p-3.5 flex flex-col gap-1 min-w-0', className)}>
      <div className="flex items-center justify-between text-ink-muted text-xs font-medium"><span className="truncate">{label}</span>{icon}</div>
      <div className="text-2xl font-extrabold text-ink leading-none tabular-nums">{value}</div>
      {sub && <div className="text-xs text-ink-faint truncate">{sub}</div>}
    </div>
  );
}
