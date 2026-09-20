import type { Question } from '@/types/models';
import { Bookmark, BookmarkCheck, Flag } from 'lucide-react';
import { DifficultyBadge, OriginBadge } from '@/components/ui';
import { getSubject, getTopic } from '@/services/contentService';
import { cn } from '@/utils/cn';

interface Props {
  q: Question;
  index?: number; total?: number;
  bookmarked?: boolean; onBookmark?: () => void;
  marked?: boolean; onMark?: () => void;
  showMeta?: boolean;
  showHindi?: boolean;
}

export function QuestionCard({ q, index, total, bookmarked, onBookmark, marked, onMark, showMeta = true, showHindi = true }: Props) {
  const subject = getSubject(q.subjectId); const topic = getTopic(q.topicId);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs text-ink-muted font-medium truncate">
          {index !== undefined && total !== undefined && <span className="font-bold text-ink">Q{index + 1}</span>}
          {index !== undefined && total !== undefined && <span> of {total} · </span>}
          {subject?.nameEn}{topic && <span className="hidden xs:inline"> › {topic.nameEn}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onMark && <button type="button" onClick={onMark} className={cn('tap grid place-items-center rounded-xl', marked ? 'text-violet-700 bg-violet-50' : 'text-ink-faint hover:bg-surface-muted')} aria-pressed={marked} aria-label="Mark for review"><Flag size={18} /></button>}
          {onBookmark && <button type="button" onClick={onBookmark} className={cn('tap grid place-items-center rounded-xl', bookmarked ? 'text-brand-700 bg-brand-50' : 'text-ink-faint hover:bg-surface-muted')} aria-pressed={bookmarked} aria-label="Bookmark">{bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>}
        </div>
      </div>
      <p className="text-[17px] leading-relaxed font-medium text-ink">{q.text}</p>
      {showHindi && q.textHi && q.textHi !== q.text && <p className="hindi text-[15px] leading-relaxed text-ink-muted mt-2">{q.textHi}</p>}
      {showMeta && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <DifficultyBadge d={q.difficulty} />
          <OriginBadge origin={q.origin} />
          <span className="chip bg-slate-100 text-slate-600 capitalize">{q.type}</span>
        </div>
      )}
    </div>
  );
}
