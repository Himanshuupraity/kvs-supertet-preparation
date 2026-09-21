import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Play, X, ExternalLink, MonitorPlay } from 'lucide-react';
import type { ReferenceVideo } from '@/types/models';
import { getReferenceTopics, getReferenceVideos } from '@/services/contentService';
import { PageHeader, EmptyState } from '@/components/ui';
import { normalizeText } from '@/utils/text';
import { secondsToClock } from '@/utils/dates';

const searchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export default function ReferenceVideosPage() {
  const [sp, setSp] = useSearchParams();
  const topics = getReferenceTopics();
  const all = getReferenceVideos();
  const topic = sp.get('topic') ?? 'all';
  const [query, setQuery] = useState(sp.get('q') ?? '');
  const [playing, setPlaying] = useState<ReferenceVideo | null>(null);

  const topicName = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t.name])), [topics]);

  const list = useMemo(() => {
    const q = normalizeText(query);
    return all.filter((v) => (topic === 'all' || v.topicId === topic)
      && (!q || normalizeText(`${v.title} ${v.channel} ${topicName[v.topicId] ?? ''}`).includes(q)));
  }, [all, topic, query, topicName]);

  // when searching, show one flat list; otherwise group by topic so the sections read like a syllabus
  const grouped = query.trim() === '';
  const groups = topics.map((t) => ({ t, vs: list.filter((v) => v.topicId === t.id) })).filter((g) => g.vs.length);

  const setTopic = (id: string) => setSp(id === 'all' ? (query ? { q: query } : {}) : (query ? { topic: id, q: query } : { topic: id }));

  return (
    <div className="space-y-4">
      <PageHeader
        back="/kvs"
        title="Reference interviews"
        subtitle={`${all.length} curated videos across ${topics.length} topics — watch how others answer, then practise the same question in the AI mock interview.`}
      />

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          className="input pl-10 pr-10"
          placeholder="Search videos — e.g. introduction, demo teaching, NEP…"
          value={query}
          onChange={(e) => { const v = e.target.value; setQuery(v); setSp(v ? (topic === 'all' ? { q: v } : { topic, q: v }) : (topic === 'all' ? {} : { topic })); }}
        />
        {query && <button type="button" onClick={() => { setQuery(''); setSp(topic === 'all' ? {} : { topic }); }} className="absolute right-2 top-1/2 -translate-y-1/2 tap grid place-items-center rounded-xl text-ink-faint" aria-label="Clear search"><X size={18} /></button>}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <Chip on={topic === 'all'} onClick={() => setTopic('all')}>All topics</Chip>
        {topics.map((t) => <Chip key={t.id} on={topic === t.id} onClick={() => setTopic(t.id)}>{t.name}</Chip>)}
      </div>

      {list.length === 0 && (
        <EmptyState
          icon={<MonitorPlay />}
          title="No matching reference video"
          hint="Try a different word, or search YouTube directly for this topic."
          action={<a className="text-sm font-semibold text-brand-700 inline-flex items-center gap-1" href={searchUrl(`KVS PRT interview ${query}`)} target="_blank" rel="noreferrer">Search on YouTube <ExternalLink size={14} /></a>}
        />
      )}

      {grouped ? groups.map(({ t, vs }) => (
        <section key={t.id}>
          <h2 className="font-bold text-ink mb-0.5">{t.name} <span className="text-ink-faint font-medium text-sm">({vs.length})</span></h2>
          <p className="text-xs text-ink-muted mb-2">{t.description}</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {vs.map((v) => <VideoCard key={v.id} v={v} onPlay={() => setPlaying(v)} />)}
          </ul>
          <a className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 mt-2" href={searchUrl(t.query)} target="_blank" rel="noreferrer">More on YouTube <ExternalLink size={12} /></a>
        </section>
      )) : (
        <ul className="grid sm:grid-cols-2 gap-2">
          {list.map((v) => <VideoCard key={v.id} v={v} topic={topicName[v.topicId]} onPlay={() => setPlaying(v)} />)}
        </ul>
      )}

      <p className="text-xs text-ink-faint">Videos are hosted on YouTube by their respective channels and are linked here for reference only. Use them as models, never as scripts — the board can tell a memorised answer.</p>

      {playing && <Player v={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function VideoCard({ v, topic, onPlay }: { v: ReferenceVideo; topic?: string; onPlay: () => void }) {
  return (
    <li className="min-w-0">
      <button type="button" onClick={onPlay} className="card p-0 overflow-hidden w-full text-left flex sm:block gap-3 items-stretch">
        <div className="relative w-36 sm:w-full shrink-0 aspect-video bg-surface-muted">
          <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/10"><span className="w-9 h-9 rounded-full bg-black/70 grid place-items-center text-white"><Play size={16} className="fill-current ml-0.5" /></span></span>
          {v.durationSec > 0 && <span className="absolute bottom-1 right-1 rounded bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5">{secondsToClock(v.durationSec)}</span>}
        </div>
        <div className="p-2.5 sm:p-3 min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug line-clamp-2 break-words">{v.title}</p>
          <p className="text-xs text-ink-muted mt-1 truncate">{v.channel}</p>
          {topic && <p className="text-[11px] text-ink-faint mt-0.5 truncate">{topic}</p>}
        </div>
      </button>
    </li>
  );
}

function Player({ v, onClose }: { v: ReferenceVideo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={v.title}>
      <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-video bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-snug">{v.title}</p>
            <p className="text-sm text-ink-muted mt-0.5">{v.channel}{v.publishedAt ? ` · ${v.publishedAt}` : ''}</p>
            <a className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 mt-2" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14} /></a>
          </div>
          <button type="button" onClick={onClose} className="tap grid place-items-center rounded-xl hover:bg-surface-muted shrink-0" aria-label="Close player"><X size={20} /></button>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`chip !py-2 !px-3 !text-sm border shrink-0 ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-border'}`}>{children}</button>;
}
