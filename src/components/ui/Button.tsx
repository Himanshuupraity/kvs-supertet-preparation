import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger' };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; to?: string; children: ReactNode; full?: boolean; size?: 'sm' | 'md' | 'lg'; }

export function Button({ variant = 'primary', to, className, children, full, size = 'md', ...rest }: Props) {
  const cls = cn(variants[variant], size === 'sm' && 'px-3 py-2 text-sm', size === 'lg' && 'px-5 py-4 text-base', full && 'w-full', className);
  if (to) return <Link to={to} className={cls} aria-disabled={rest.disabled}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
