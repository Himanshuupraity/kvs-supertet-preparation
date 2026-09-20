import { Home, BookOpen, Mic, Newspaper, UserRound, type LucideIcon } from 'lucide-react';
export interface NavItem { to: string; label: string; icon: LucideIcon; match: (p: string) => boolean; }
export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { to: '/supertet', label: 'Super TET', icon: BookOpen, match: (p) => p.startsWith('/supertet') },
  { to: '/kvs', label: 'KVS Interview', icon: Mic, match: (p) => p.startsWith('/kvs') },
  { to: '/current-affairs', label: 'Current Affairs', icon: Newspaper, match: (p) => p.startsWith('/current-affairs') },
  { to: '/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/profile') || p.startsWith('/admin') || p.startsWith('/analytics') },
];
