import { Home, BookOpen, Mic, Newspaper, UserRound, BarChart3, CalendarCheck, Search, Settings2, Bookmark, MonitorPlay, FileText, type LucideIcon } from 'lucide-react';
export interface NavItem { to: string; label: string; icon: LucideIcon; match: (p: string) => boolean; }
export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { to: '/supertet', label: 'Super TET', icon: BookOpen, match: (p) => p.startsWith('/supertet') },
  { to: '/kvs', label: 'KVS Interview', icon: Mic, match: (p) => p.startsWith('/kvs') },
  { to: '/current-affairs', label: 'Current Affairs', icon: Newspaper, match: (p) => p.startsWith('/current-affairs') },
  { to: '/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/profile') || p.startsWith('/admin') || p.startsWith('/analytics') },
];

/** Secondary destinations. Shown in the sidebar on desktop and on the Profile page on mobile,
 *  where the sidebar is hidden — so every tool stays reachable on a phone. */
export const TOOLS: NavItem[] = [
  { to: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') },
  { to: '/kvs/reference', label: 'Reference Interviews', icon: MonitorPlay, match: (p) => p.startsWith('/kvs/reference') },
  { to: '/plan', label: 'Study Plan', icon: CalendarCheck, match: (p) => p.startsWith('/plan') },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, match: (p) => p.startsWith('/analytics') },
  { to: '/supertet/revision', label: 'Revision Center', icon: Bookmark, match: (p) => p.startsWith('/supertet/revision') },
  { to: '/admin', label: 'Admin / Content', icon: Settings2, match: (p) => p.startsWith('/admin') },
  { to: '/sources', label: 'Sources & accuracy', icon: FileText, match: (p) => p.startsWith('/sources') },
];
