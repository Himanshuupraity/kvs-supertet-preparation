import { ExternalLink } from 'lucide-react';
import { syllabusMeta } from '@/services/contentService';
import kvsInfo from '@/data/kvs/kvs-info.json';
import { Card, PageHeader, SectionTitle } from '@/components/ui';

export default function SourcesPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Sources & content accuracy" subtitle="What is official, what is practice content, and what you should verify yourself." />
      <Card>
        <SectionTitle title="Super TET syllabus (official)" />
        <p className="text-sm">{syllabusMeta.examName}</p>
        <p className="text-sm text-ink-muted">{syllabusMeta.conductingBody}</p>
        <a href={syllabusMeta.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-700 text-sm inline-flex items-center gap-1 mt-1">Official PDF <ExternalLink size={14} /></a>
        <p className="text-xs text-ink-faint mt-1">Accessed {syllabusMeta.sourceAccessedOn}. The 10 subjects, 88 topics and marks in this app are transcribed from this document (decoded from its Kruti Dev font). If the Commission updates the syllabus, update <code>src/data/syllabus/supertet-syllabus.json</code> — no code change is required.</p>
      </Card>
      <Card>
        <SectionTitle title="KVS (official)" />
        <ul className="text-sm space-y-1">{kvsInfo.officialSites.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-brand-700 inline-flex items-center gap-1">{s.name} <ExternalLink size={14} /></a></li>)}</ul>
        <p className="text-xs text-ink-faint mt-1">Accessed {kvsInfo.accessedOn}.</p>
      </Card>
      <Card>
        <SectionTitle title="Content labelling" />
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          <li><b>Practice question</b> — written for this app to match the official syllabus topic. Facts are drawn from NCERT, Acts, policies and official portals cited in each question's "Source". They are <b>not</b> official exam questions.</li>
          <li><b>Previous-year style</b> — modelled on the pattern of past papers; not verbatim past questions (no official answer keys were reproduced).</li>
          <li><b>Demo / sample</b> — placeholder content for UI demonstration only. None of the bundled questions use this label.</li>
          <li><b>Current affairs — Official source</b> — cross-checked with a government/official release. <b>Verify</b> badge — taken from a secondary compilation and not yet cross-checked; treat with care and confirm on PIB/official sites.</li>
        </ul>
      </Card>
      <Card>
        <SectionTitle title="Interview evaluation disclaimer" />
        <p className="text-sm text-ink-muted">Scores are generated from your transcript (key-point coverage, relevance, structure, pace, filler words) and optional on-device presentation metrics (face-in-frame, centring, movement). These are observable characteristics only. The app does not infer emotions, personality or attention, and no evaluation here predicts actual interview outcomes.</p>
      </Card>
    </div>
  );
}
