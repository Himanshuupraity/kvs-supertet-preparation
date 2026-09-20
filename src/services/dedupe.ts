import type { Question } from '@/types/models';
import { jaccard, normalizeText } from '@/utils/text';

/** Stable fingerprint: normalized question text + sorted normalized options. */
export function questionFingerprint(q: Pick<Question, 'text' | 'options'>): string {
  const opts = q.options.map((o) => normalizeText(o.text)).sort().join('|');
  return `${normalizeText(q.text)}::${opts}`;
}

export interface DuplicateReport {
  exact: [Question, Question][];
  near: { a: Question; b: Question; similarity: number }[];
}

/** Detect exact and near duplicates (Jaccard on question text ≥ threshold). O(n²) is fine for a few thousand items. */
export function findDuplicates(questions: Question[], threshold = 0.8): DuplicateReport {
  const exact: [Question, Question][] = [];
  const near: DuplicateReport['near'] = [];
  const seen = new Map<string, Question>();
  for (const q of questions) {
    const fp = q.fingerprint ?? questionFingerprint(q);
    const prev = seen.get(fp);
    if (prev) exact.push([prev, q]);
    else seen.set(fp, q);
  }
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const a = questions[i], b = questions[j];
      if ((a.fingerprint ?? questionFingerprint(a)) === (b.fingerprint ?? questionFingerprint(b))) continue;
      const sim = jaccard(a.text, b.text);
      if (sim >= threshold) near.push({ a, b, similarity: sim });
    }
  }
  return { exact, near };
}

/** Returns the list with exact duplicates removed (keeps first occurrence). */
export function dedupeQuestions(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of questions) {
    const fp = q.fingerprint ?? questionFingerprint(q);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push({ ...q, fingerprint: fp });
  }
  return out;
}

/** Check whether a candidate would duplicate any existing question. */
export function isDuplicateOf(candidate: Pick<Question, 'text' | 'options'>, existing: Question[], threshold = 0.85): Question | null {
  const fp = questionFingerprint(candidate);
  for (const q of existing) {
    if ((q.fingerprint ?? questionFingerprint(q)) === fp) return q;
    if (jaccard(candidate.text, q.text) >= threshold) return q;
  }
  return null;
}
