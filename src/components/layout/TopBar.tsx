import { Link, useLocation } from 'react-router-dom';
import { Search, Flame, GraduationCap } from 'lucide-react';
import { useProgressStore } from '@/store/useProgressStore';
import { computeStreak } from '@/services/analyticsService';

export function TopBar() {
  const daily = useProgressStore((s) => s.daily);
  const streak = computeStreak(daily).current;
  const { pathname } = useLocation();
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-surface-muted/90 backdrop-blur border-b border-surface-border pt-[var(--safe-top)]">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-ink">
          <span className="w-8 h-8 rounded-lg bg-brand-600 grid place-items-center text-white"><GraduationCap size={18} /></span>
          <span>PRT Prep</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="chip bg-orange-50 text-orange-700" title="Day streak"><Flame size={14} /> {streak}</span>
          {pathname !== '/search' && <Link to="/search" className="tap grid place-items-center rounded-xl text-ink-muted hover:bg-white" aria-label="Search"><Search size={22} /></Link>}
        </div>
      </div>
    </header>
  );
}
