import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getNotes, subjects, colorFor } from '@/services/contentService';
import { PageHeader, SectionTitle } from '@/components/ui';

export default function NotesPage() {
  const notes = getNotes();
  return (
    <div className="space-y-5">
      <PageHeader back="/supertet" title="Study Notes" subtitle="Exam-focused revision notes: key concepts, theories, exam points and common traps." />
      {subjects.map((s) => {
        const list = notes.filter((n) => n.subjectId === s.id);
        if (!list.length) return null;
        const c = colorFor(s.id);
        return (
          <section key={s.id}>
            <SectionTitle title={s.nameEn} />
            <ul className="space-y-2">
              {list.map((n) => (
                <li key={n.id}><Link to={`/supertet/notes/${n.id}`} className="card p-3.5 flex items-center gap-3">
                  <span className={`w-2 self-stretch rounded-full ${c.solid}`} />
                  <div className="flex-1 min-w-0"><p className="font-semibold">{n.title}</p><p className="text-xs text-ink-muted">{n.keyConcepts.length} key concepts · {n.examPoints.length} exam points{n.theories ? ` · ${n.theories.length} theories` : ''}</p></div>
                  <ChevronRight className="text-ink-faint" />
                </Link></li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
