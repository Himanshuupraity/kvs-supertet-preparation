import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ExternalLink, ShieldCheck, ShieldAlert, Calendar } from 'lucide-react';
import { getCurrentAffair } from '@/services/contentService';
import { useProgressStore } from '@/store/useProgressStore';
import { Card, PageHeader, SectionTitle, Badge } from '@/components/ui';
import { OptionList } from '@/components/exam/OptionList';
import { ExplanationPanel } from '@/components/exam/ExplanationPanel';
import { formatDate } from '@/utils/dates';
import { CA_CATEGORIES } from './CurrentAffairsPage';

export default function CurrentAffairDetailPage() {
  const { id = '' } = useParams();
  const ca = getCurrentAffair(id);
  const { markCARead, recordAnswer, bumpDaily, touchRecent } = useProgressStore();
  const [sel, setSel] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  useEffect(() => { if (ca) { markCARead(ca.id); touchRecent('ca', ca.id); } }, [ca, markCARead, touchRecent]);
  if (!ca) return <Navigate to="/current-affairs" replace />;

  return (
    <div className="space-y-4">
      <PageHeader back="/current-affairs" title={ca.title} subtitle={<span className="flex flex-wrap items-center gap-1.5"><Calendar size={14} /> {formatDate(ca.date)} <Badge tone="blue">{CA_CATEGORIES.find((x) => x.id === ca.category)?.label}</Badge>{ca.verified ? <Badge tone="green"><ShieldCheck size={12} /> Official source</Badge> : <Badge tone="amber"><ShieldAlert size={12} /> Secondary source — verify</Badge>}</span>} />
      {ca.titleHi && <p className="hindi text-ink-muted -mt-2">{ca.titleHi}</p>}
      <Card><SectionTitle title="What happened" /><p className="text-[15px] leading-relaxed">{ca.summary}</p></Card>
      <Card className="bg-emerald-50 border-emerald-100"><SectionTitle title="Why it matters for the exam" /><p className="text-[15px] leading-relaxed">{ca.whyItMatters}</p></Card>
      <Card className="text-sm">
        <p><b>Source:</b> {ca.source.name} {ca.source.url && <a href={ca.source.url} target="_blank" rel="noreferrer" className="text-brand-700 inline-flex items-center gap-1">Open <ExternalLink size={12} /></a>}</p>
        <p className="text-ink-muted mt-1">Event date {formatDate(ca.date)} · added to app {formatDate(ca.publishedOn)}{!ca.verified && ' · Not yet cross-checked with an official release. Verify on PIB/official site before quoting.'}</p>
      </Card>
      {ca.mcq && (
        <Card>
          <SectionTitle title="Exam question" subtitle="Practice MCQ based on this item" />
          <p className="font-medium text-[16px] mb-3">{ca.mcq.text}</p>
          <OptionList options={ca.mcq.options} selected={sel} correct={sel ? ca.mcq.correct : undefined} onSelect={(k) => { if (sel) return; setSel(k); recordAnswer(ca.mcq!.id, k === ca.mcq!.correct); bumpDaily({ mcqsAttempted: 1, mcqsCorrect: k === ca.mcq!.correct ? 1 : 0 }); }} />
          {sel && <div className="mt-3"><ExplanationPanel q={ca.mcq} selected={sel} /></div>}
        </Card>
      )}
    </div>
  );
}
