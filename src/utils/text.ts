export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(s: string): string[] {
  return normalizeText(s).split(' ').filter((t) => t.length > 1);
}

/** Jaccard similarity of token sets, 0..1 */
export function jaccard(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 100);
}
