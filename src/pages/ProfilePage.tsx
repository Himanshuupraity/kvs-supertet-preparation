import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Settings2, Trash2, ShieldCheck, FileText, Video, MonitorPlay } from 'lucide-react';
import { useUserStore, defaultTargets } from '@/store/useUserStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useInterviewStore } from '@/store/useInterviewStore';
import { Card, SectionTitle, Button, PageHeader, Modal } from '@/components/ui';
import { listRecordingKeys, deleteRecording } from '@/services/recordingStorage';

export default function ProfilePage() {
  const profile = useUserStore((s) => s.profile)!;
  const setProfile = useUserStore((s) => s.setProfile);
  const resetUser = useUserStore((s) => s.reset);
  const resetProgress = useProgressStore((s) => s.resetAll);
  const resetInterviews = useInterviewStore((s) => s.resetAll);
  const [confirm, setConfirm] = useState(false);
  const [recCount, setRecCount] = useState<number | null>(null);

  const t = profile.dailyTargets ?? defaultTargets;
  const setTarget = (k: keyof typeof t, v: number) => setProfile({ dailyTargets: { ...t, [k]: Math.max(0, v) } });

  const loadRecs = async () => { try { setRecCount((await listRecordingKeys()).length); } catch { setRecCount(0); } };
  const deleteRecs = async () => { const keys = await listRecordingKeys(); await Promise.all(keys.map(deleteRecording)); setRecCount(0); };

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" subtitle="Saved on this device. Authentication/cloud sync can be added later (see README)." />
      <Card>
        <SectionTitle title="Details" />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="label">Name</span><input className="input" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} /></label>
          <label className="block"><span className="label">Target exam</span>
            <select className="input" value={profile.targetExam} onChange={(e) => setProfile({ targetExam: e.target.value as typeof profile.targetExam })}>
              <option value="both">KVS PRT Interview + Super TET</option><option value="kvs">KVS PRT Interview only</option><option value="supertet">Super TET only</option>
            </select></label>
          <label className="block sm:col-span-2"><span className="label">Study goal</span><input className="input" value={profile.studyGoal} onChange={(e) => setProfile({ studyGoal: e.target.value })} /></label>
          <label className="block"><span className="label">Daily study time (minutes)</span><input type="number" className="input" min={15} step={15} value={profile.dailyTargetMinutes} onChange={(e) => setProfile({ dailyTargetMinutes: +e.target.value })} /></label>
          <label className="block"><span className="label">Interview language for speech-to-text</span>
            <select className="input" value={profile.language} onChange={(e) => setProfile({ language: e.target.value as typeof profile.language })}>
              <option value="en">English (en-IN)</option><option value="hi">Hindi (hi-IN)</option><option value="bilingual">Bilingual (uses English recogniser)</option>
            </select></label>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Daily targets" subtitle="Shown as the checklist on Home" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([['mcqs', 'MCQs'], ['mockTests', 'Mock tests'], ['gk', 'GK items'], ['interviewQuestions', 'Interview Qs'], ['aiInterviews', 'AI interviews']] as const).map(([k, l]) => (
            <label key={k} className="block"><span className="label">{l}</span><input type="number" className="input" min={0} value={t[k]} onChange={(e) => setTarget(k, +e.target.value)} /></label>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Video & privacy" />
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 w-5 h-5" checked={profile.saveRecordingsByDefault} onChange={(e) => setProfile({ saveRecordingsByDefault: e.target.checked })} />
          <span className="text-sm"><span className="font-semibold">Offer to save interview recordings on this device.</span> Recordings are never uploaded. Even when enabled, you choose per answer. Transcripts are used for evaluation; if AI is connected, only the text transcript and numeric metrics are sent to the server — never the video.</span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadRecs}><Video size={16} /> Check saved recordings</Button>
          {recCount !== null && <span className="text-sm text-ink-muted">{recCount} saved</span>}
          {recCount ? <Button variant="danger" size="sm" onClick={deleteRecs}><Trash2 size={16} /> Delete all recordings</Button> : null}
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/kvs/reference" className="card p-4 flex items-center gap-3"><MonitorPlay className="text-brand-600" /><span className="font-semibold">Reference interviews</span></Link>
        <Link to="/analytics" className="card p-4 flex items-center gap-3"><BarChart3 className="text-brand-600" /><span className="font-semibold">Performance analytics</span></Link>
        <Link to="/admin" className="card p-4 flex items-center gap-3"><Settings2 className="text-brand-600" /><span className="font-semibold">Admin / content</span></Link>
        <Link to="/sources" className="card p-4 flex items-center gap-3"><FileText className="text-brand-600" /><span className="font-semibold">Sources & accuracy</span></Link>
      </div>

      <Card className="border-red-100">
        <SectionTitle title="Danger zone" />
        <p className="text-sm text-ink-muted mb-3 flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0" /> Deleting removes all progress, test attempts and interview history from this device.</p>
        <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 size={16} /> Reset everything</Button>
      </Card>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset all data?">
        <p className="text-sm text-ink-muted mb-4">This cannot be undone.</p>
        <div className="flex gap-2"><Button variant="secondary" full onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" full onClick={() => { resetProgress(); resetInterviews(); resetUser(); }}>Yes, reset</Button></div>
      </Modal>
    </div>
  );
}
