import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-2xl bg-surface-muted grid place-items-center text-ink-faint">{icon ?? <Inbox />}</div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-muted max-w-sm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
