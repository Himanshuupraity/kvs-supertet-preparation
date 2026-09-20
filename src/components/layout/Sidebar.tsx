import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CalendarCheck, Search, Settings2, Bookmark, GraduationCap } from 'lucide-react';
import { NAV } from './nav';
import { cn } from '@/utils/cn';

const SECONDARY = [
  { to: '/search', label: 'Search', icon: Search },
  { to: '/plan', label: 'Study Plan', icon: CalendarCheck },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/supertet/revision', label: 'Revision Center', icon: Bookmark },
  { to: '/admin', label: 'Admin / Content', icon: Settings2 },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-surface-border bg-white sticky top-0 h-dvh">
      <Link to="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-surface-border">
        <span className="w-9 h-9 rounded-xl bg-brand-600 grid place-items-center text-white"><GraduationCap size={20} /></span>
        <span className="font-extrabold text-ink leading-tight">PRT Prep<span className="block text-[11px] font-medium text-ink-faint">KVS Interview · Super TET</span></span>
      </Link>
      <nav className="p-3 flex-1 overflow-y-auto" aria-label="Sidebar">
        <ul className="space-y-1">
          {NAV.map((n) => { const active = n.match(pathname); return (
            <li key={n.to}><Link to={n.to} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium', active ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-muted')}><n.icon size={20} />{n.label}</Link></li>
          ); })}
        </ul>
        <p className="px-3 mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Tools</p>
        <ul className="space-y-1">
          {SECONDARY.map((n) => { const active = pathname.startsWith(n.to); return (
            <li key={n.to}><Link to={n.to} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium', active ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-muted')}><n.icon size={20} />{n.label}</Link></li>
          ); })}
        </ul>
      </nav>
      <div className="p-4 text-[11px] text-ink-faint border-t border-surface-border">Practice content is labelled; syllabus from UPESSC official PDF. <Link to="/sources" className="underline">Sources</Link></div>
    </aside>
  );
}
