import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: ReactNode; back?: boolean | string; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="flex items-start gap-3 mb-4">
      {back && (
        <button type="button" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} className="tap -ml-2 grid place-items-center rounded-xl hover:bg-white text-ink-muted" aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink leading-tight">{title}</h1>
        {subtitle && <div className="text-sm text-ink-muted mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
