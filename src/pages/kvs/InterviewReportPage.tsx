import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Mic, ChevronDown, ChevronUp, Video, Trash2 } from 'lucide-react';
import { useInterviewStore } from '@/store/useInterviewStore';
import { getInterviewQuestion } from '@/services/contentService';
import { MAXES, LABELS } from '@/services/interviewService';
import { Button, Card, PageHeader, SectionTitle } from '@/components/ui';
import { SkillRadar } from '@/components/charts';
import { FeedbackPanel, ScoreBreakdownList } from '@/components/interview/FeedbackPanel';
import { getRecording, deleteRecording } from '@/services/recordingStorage';
import { formatDate } from '@/utils/dates';

export default function InterviewReportPage() {
  const { sessionId = '' } = useParams();
  const session = useInterviewStore((s) => s.sessions[sessionId]);
  const saveSession = useInterviewStore((s) => s.saveSession);
  const [open, setOpen] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<Record<string, string>>({});
  if (!session) return <Navigate to="/kvs" replace />;
  if (!session.report) return <Navigate to={`/kvs/interview/${sessionId}`} replace />;
  const r = session.report;
  const radar = (Object.keys(MAXES) as (keyof typeof MAXES)[]).map((k) => ({ skill: LABELS[k].split(' ')[0], value: r.breakdownAvg[k], max: MAXES[k] }));

  const playVideo = async (key: string) => { const b = await getRecording(key); if (b) setVideoUrl((v) => ({ ...v, [key]: URL.createObjectURL(b) })); };
  const removeVideo = async (key: string, ansId: string) => {
    await deleteRecording(key);
    saveSession({ ...session, answers: session.answers.map((a) => (a.id === ansId ? { ...a, recordingBlobKey: undefined } : a)) });
  };

  return (
    <div className="space-y-4">
      <PageHeader back="/kvs" title="Your Interview Report" subtitle={`${session.mode === 'full' ? 'Full mock' : session.mode} · ${formatDate(session.startedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${session.answers.length} answers`} />
      <Card className="bg-gradient-to-br from-rose-600 to-rose-800 text-white border-0 text-center">
        <p className="text-rose-100 text-sm">Overall Score</p>
        <p className="text-5xl font-extrabold">{r.overall}<span className="text-2xl text-rose-200">/100</span></p>
        <p className="text-rose-100 text-sm mt-1">{r.overall >= 75 ? 'Strong performance — polish the details.' : r.overall >= 55 ? 'Good foundation — work on the areas below.' : 'Keep practising — focus on key points and structure.'}</p>
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        <Card><SectionTitle title="Skill profile" /><SkillRadar data={radar} /></Card>
        <Card><SectionTitle title="Average breakdown" /><ScoreBreakdownList b={r.breakdownAvg} /></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="bg-emerald-50 border-emerald-100"><SectionTitle title="Strong areas" /><ul className="space-y-1 text-sm">{r.strongAreas.length ? r.strongAreas.map((s) => <li key={s}>• {s}</li>) : <li className="text-ink-muted">Keep practising to develop clear strengths.</li>}</ul></Card>
        <Card className="bg-amber-50 border-amber-100"><SectionTitle title="Areas to improve" /><ul className="space-y-1 text-sm">{r.improveAreas.length ? r.improveAreas.map((s) => <li key={s}>• {s}</li>) : <li className="text-ink-muted">All areas above 65% — excellent.</li>}</ul></Card>
      </div>
      <Card className="bg-violet-50 border-violet-100"><SectionTitle title="Recommended practice" /><ul className="space-y-1.5 text-sm">{r.recommendedPractice.map((s) => <li key={s}>• {s}</li>)}</ul></Card>
      {Object.keys(r.categoryScores).length > 0 && (
        <Card><SectionTitle title="Score by category" /><ul className="space-y-1.5 text-sm">{Object.entries(r.categoryScores).sort((a, b) => a[1] - b[1]).map(([c, s]) => <li key={c} className="flex justify-between"><span>{c}</span><b className={s < 55 ? 'text-red-600' : s < 70 ? 'text-amber-600' : 'text-emerald-700'}>{s}</b></li>)}</ul></Card>
      )}
      <section>
        <SectionTitle title="Question-by-question" subtitle="Tap to expand detailed feedback and your transcript" />
        <ul className="space-y-2">
          {session.answers.map((a, i) => {
            const q = a.questionId ? getInterviewQuestion(a.questionId) : undefined;
            const isOpen = open === a.id;
            return (
              <li key={a.id} className="card overflow-hidden">
                <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} className="w-full text-left p-3.5 flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl grid place-items-center font-bold shrink-0 ${a.feedback && a.feedback.breakdown.total >= 70 ? 'bg-emerald-50 text-emerald-700' : a.feedback && a.feedback.breakdown.total >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{a.feedback?.breakdown.total ?? '—'}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium leading-snug">{i + 1}. {a.questionText}</p><p className="text-xs text-ink-muted">{a.isFollowUp ? 'Follow-up · ' : ''}{a.durationSec}s · {a.transcript.split(/\s+/).filter(Boolean).length} words{a.recordingBlobKey ? ' · video saved' : ''}</p></div>
                  {isOpen ? <ChevronUp className="text-ink-faint" /> : <ChevronDown className="text-ink-faint" />}
                </button>
                {isOpen && a.feedback && (
                  <div className="p-3.5 pt-0 space-y-3">
                    <FeedbackPanel fb={a.feedback} sampleAnswer={q?.sampleAnswer} />
                    <div className="card p-3.5 text-sm"><p className="font-semibold mb-1">Your transcript</p><p className="text-ink-muted whitespace-pre-line">{a.transcript}</p></div>
                    {a.recordingBlobKey && (
                      <div className="card p-3.5 space-y-2">
                        {videoUrl[a.recordingBlobKey] ? <video src={videoUrl[a.recordingBlobKey]} controls playsInline className="w-full rounded-xl bg-black" /> : <Button variant="secondary" size="sm" onClick={() => playVideo(a.recordingBlobKey!)}><Video size={16} /> Play saved recording</Button>}
                        <Button variant="danger" size="sm" onClick={() => removeVideo(a.recordingBlobKey!, a.id)}><Trash2 size={16} /> Delete recording</Button>
                      </div>
                    )}
                    {q && <Link to={`/kvs/questions/${q.id}`} className="text-sm text-brand-700 font-medium">Open full model-answer guide →</Link>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" to="/kvs/interview/history">All interviews</Button>
        <Button to="/kvs/interview/new" className="!bg-rose-600 hover:!bg-rose-700"><Mic size={18} /> New interview</Button>
      </div>
    </div>
  );
}
