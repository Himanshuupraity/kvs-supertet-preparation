import { Link, useLocation } from 'react-router-dom';
import { NAV } from './nav';
import { cn } from '@/utils/cn';

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-surface-border pb-[var(--safe-bottom)]" aria-label="Primary">
      <ul className="grid grid-cols-5">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <li key={n.to}>
              <Link to={n.to} className={cn('flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium', active ? 'text-brand-700' : 'text-ink-faint')} aria-current={active ? 'page' : undefined}>
                <span className={cn('grid place-items-center w-11 h-7 rounded-full transition', active && 'bg-brand-50')}><n.icon size={22} strokeWidth={active ? 2.4 : 2} /></span>
                <span className="leading-none">{n.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
