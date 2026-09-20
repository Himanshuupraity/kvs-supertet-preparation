import { ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import kvsInfo from '@/data/kvs/kvs-info.json';
import { Card, PageHeader, SectionTitle } from '@/components/ui';

export default function KvsInfoPage() {
  return (
    <div className="space-y-4">
      <PageHeader back="/kvs" title="KVS — official information" subtitle={`Checked against kvsangathan.nic.in and CBSE press releases on ${kvsInfo.accessedOn}. Always re-verify before your interview.`} />
      <Card>
        <SectionTitle title="Current recruitment" subtitle={kvsInfo.currentRecruitment.notification} />
        <ul className="space-y-2.5">
          {kvsInfo.currentRecruitment.verifiedFacts.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm"><CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /><span>{f.fact} <span className="text-ink-faint">— {f.source}</span> {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="text-brand-700 inline-flex items-center gap-0.5">PDF <ExternalLink size={12} /></a>}</span></li>
          ))}
        </ul>
      </Card>
      <Card className="bg-amber-50 border-amber-100">
        <SectionTitle title="Widely reported but NOT verified here" />
        <ul className="space-y-2.5">
          {kvsInfo.currentRecruitment.unverifiedButWidelyReported.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm"><AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" /><span><b>{f.claim}</b><br /><span className="text-ink-muted">{f.note}</span></span></li>
          ))}
        </ul>
      </Card>
      <Card>
        <SectionTitle title="KVS facts for the interview" />
        <ul className="space-y-2">{kvsInfo.kvsFacts.map((f, i) => <li key={i} className="text-sm flex gap-2"><span className="text-brand-600 font-bold">•</span><span>{f.fact} <span className="text-ink-faint">({f.source})</span></span></li>)}</ul>
      </Card>
      <Card><p className="text-sm text-ink-muted">{kvsInfo.interviewPrepNote}</p></Card>
      <Card>
        <SectionTitle title="Official links" />
        <ul className="space-y-1.5">{kvsInfo.officialSites.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-brand-700 font-medium inline-flex items-center gap-1 text-sm">{s.name} <ExternalLink size={14} /></a></li>)}</ul>
      </Card>
    </div>
  );
}
