import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

const tones = {
  gray: 'bg-slate-100 text-slate-700', blue: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800', red: 'bg-red-50 text-red-700', violet: 'bg-violet-50 text-violet-700',
};
export function Badge({ children, tone = 'gray', className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function DifficultyBadge({ d }: { d: 'easy' | 'medium' | 'hard' }) {
  return <Badge tone={d === 'easy' ? 'green' : d === 'medium' ? 'amber' : 'red'}>{d[0].toUpperCase() + d.slice(1)}</Badge>;
}

export function OriginBadge({ origin }: { origin: 'official' | 'practice' | 'previous-style' | 'demo' }) {
  const map = { official: ['Official', 'blue'], practice: ['Practice question', 'gray'], 'previous-style': ['Previous-year style', 'violet'], demo: ['Demo / sample', 'amber'] } as const;
  const [label, tone] = map[origin];
  return <Badge tone={tone}>{label}</Badge>;
}
