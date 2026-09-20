import { Globe2, BrainCircuit, Languages, FlaskConical, Calculator, Mountain, GraduationCap, Baby, MonitorSmartphone, HeartHandshake, BookOpen, type LucideProps } from 'lucide-react';

const MAP = { Globe2, BrainCircuit, Languages, FlaskConical, Calculator, Mountain, GraduationCap, Baby, MonitorSmartphone, HeartHandshake } as const;

export function SubjectIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (MAP as Record<string, typeof BookOpen>)[name] ?? BookOpen;
  return <Icon {...props} />;
}
