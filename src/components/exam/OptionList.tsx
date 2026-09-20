import type { QuestionOption } from '@/types/models';
import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  options: QuestionOption[];
  selected: 'A' | 'B' | 'C' | 'D' | null;
  correct?: 'A' | 'B' | 'C' | 'D';        // when provided, reveals answer state
  onSelect?: (k: 'A' | 'B' | 'C' | 'D') => void;
  disabled?: boolean;
  showHindi?: boolean;
}

export function OptionList({ options, selected, correct, onSelect, disabled, showHindi }: Props) {
  const revealed = !!correct;
  return (
    <div role="radiogroup" className="space-y-2.5">
      {options.map((o) => {
        const isSel = selected === o.key;
        const isCorrect = revealed && correct === o.key;
        const isWrong = revealed && isSel && correct !== o.key;
        return (
          <button
            key={o.key} type="button" role="radio" aria-checked={isSel} disabled={disabled || revealed}
            onClick={() => onSelect?.(o.key)}
            className={cn(
              'w-full text-left flex items-start gap-3 rounded-xl border-2 px-3.5 py-3 min-h-[52px] transition active:scale-[.995]',
              !revealed && (isSel ? 'border-brand-600 bg-brand-50' : 'border-surface-border bg-white hover:border-brand-300'),
              isCorrect && 'border-emerald-500 bg-emerald-50',
              isWrong && 'border-red-400 bg-red-50',
              revealed && !isCorrect && !isWrong && 'border-surface-border bg-white opacity-80',
            )}
          >
            <span className={cn('shrink-0 w-7 h-7 rounded-full grid place-items-center text-sm font-bold border',
              isCorrect ? 'bg-emerald-500 text-white border-emerald-500' : isWrong ? 'bg-red-500 text-white border-red-500' : isSel ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-muted border-surface-border')}>
              {isCorrect ? <Check size={16} /> : isWrong ? <X size={16} /> : o.key}
            </span>
            <span className="flex-1 text-[15px] leading-snug text-ink pt-0.5">
              {o.text}
              {showHindi && o.textHi && <span className="block text-ink-muted hindi text-sm mt-0.5">{o.textHi}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
