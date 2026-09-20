/**
 * Daily refresh job — run once per day (cron / GitHub Actions / Render cron / Vercel cron).
 *
 *   npm run refresh:daily                # from server/
 *   0 4 * * *  cd /srv/app/server && npm run refresh:daily >> /var/log/prt-refresh.log 2>&1
 *
 * Steps (each step degrades gracefully and logs what it skipped):
 *  1. Fetch current-affairs candidates from RSS feeds (NEWS_FEEDS, no key needed) or a JSON news API
 *     (NEWS_API_URL/NEWS_API_KEY).
 *     ⚠ The job never invents news. If no news source is configured, step 1 is skipped and
 *     the Current Affairs section keeps showing yesterday's dated items.
 *  2. Summarise each item with the AI provider into the CurrentAffair shape (+ MCQ), keeping the original
 *     date, source name and URL, and marking verified=false (a human confirms via the admin panel).
 *  3. Generate N new practice MCQs mapped to random official syllabus topics, with duplicate detection
 *     against everything already in the store.
 *  4. Publish today's Daily Challenge set (20 question IDs) so every device sees the same set.
 *  5. Archive: nothing is deleted — items keep their dates; the frontend groups by date.
 *
 * PUBLISH_TO=bundled writes into src/data/** instead of server/data — used by
 * .github/workflows/daily-refresh.yml, which commits the result so Vercel redeploys.
 */
import 'dotenv/config';
import { z } from 'zod';
import { getProvider } from '../providers/index.js';
import { fileStore, bundledStore } from '../lib/store.js';
import { env } from '../lib/env.js';
import { CurrentAffairSummarySchema, McqBatchSchema } from '../lib/schemas.js';
import { CA_SYSTEM, MCQ_SYSTEM } from '../lib/prompts.js';
import syllabus from '../../../src/data/syllabus/supertet-syllabus.json' with { type: 'json' };

const today = new Date().toISOString().slice(0, 10);
const log = (...a: unknown[]) => console.log(`[refresh ${today}]`, ...a);
const store = env.publishTo === 'bundled' ? bundledStore : fileStore;

interface NewsItem { title: string; description: string; url: string; source: string; publishedAt: string; }
const NewsResponse = z.object({ articles: z.array(z.object({ title: z.string(), description: z.string().nullable(), url: z.string(), source: z.object({ name: z.string() }), publishedAt: z.string() })) });

async function fetchNews(): Promise<NewsItem[]> {
  if (env.newsApiUrl) return fetchNewsApi(env.newsApiUrl);
  if (env.newsFeeds.length) {
    const items: NewsItem[] = [];
    for (const url of env.newsFeeds) {
      try { items.push(...(await fetchRss(url))); } catch (e) { log(`Step 1 feed failed (${url}):`, (e as Error).message); }
    }
    // newest first; keep only items dated within the last 3 days so nothing stale gets summarised
    const cutoff = addDays(today, -3);
    const fresh = items.filter((i) => i.publishedAt >= cutoff).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
    log(`Step 1: ${fresh.length} fresh items from ${env.newsFeeds.length} feed(s)`);
    return fresh;
  }
  log('Step 1 skipped: neither NEWS_API_URL nor NEWS_FEEDS set — no current affairs fetched (never fabricated).');
  return [];
}

async function fetchNewsApi(url: string): Promise<NewsItem[]> {
  const r = await fetch(url, { headers: env.newsApiKey ? { 'X-Api-Key': env.newsApiKey, Authorization: `Bearer ${env.newsApiKey}` } : {} });
  if (!r.ok) { log(`Step 1 failed: ${r.status}`); return []; }
  const parsed = NewsResponse.safeParse(await r.json());
  if (!parsed.success) { log('Step 1: unexpected response shape; adapt fetchNews() to your provider.'); return []; }
  return parsed.data.articles.map((a) => ({ title: a.title, description: a.description ?? '', url: a.url, source: a.source.name, publishedAt: a.publishedAt.slice(0, 10) }));
}

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; prt-prep-daily-refresh)' };
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
};
const stripHtml = (s: string) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
function addDays(iso: string, n: number) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

/** Minimal RSS 2.0 / Atom reader — no dependency. Items without a description get the linked page's text. */
async function fetchRss(url: string): Promise<NewsItem[]> {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  const source = stripHtml(tag(xml.split(/<item[\s>]|<entry[\s>]/i)[0], 'title')) || new URL(url).hostname;
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out: NewsItem[] = [];
  for (const b of blocks.slice(0, 25)) {
    const title = stripHtml(tag(b, 'title'));
    const link = tag(b, 'link') || (b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
    if (!title || !link) continue;
    const dateRaw = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const d = dateRaw ? new Date(dateRaw) : null;
    const publishedAt = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : today;
    let description = stripHtml(tag(b, 'description') || tag(b, 'content:encoded') || tag(b, 'summary') || tag(b, 'content'));
    if (description.length < 80) {
      try {
        const page = await fetch(link, { headers: UA, redirect: 'follow' });
        if (page.ok) description = stripHtml(await page.text()).slice(0, 2500);
      } catch { /* keep whatever we have */ }
    }
    out.push({ title, description, url: link, source, publishedAt });
  }
  return out;
}

function norm(s: string) { return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); }
function jaccard(a: string, b: string) { const A = new Set(norm(a).split(' ')); const B = new Set(norm(b).split(' ')); let i = 0; for (const t of A) if (B.has(t)) i++; return i / (A.size + B.size - i || 1); }

async function main() {
  const provider = getProvider();
  log(`AI provider: ${provider?.name ?? 'none'} · publishing to: ${env.publishTo}`);

  // ---- Step 1 & 2: current affairs
  const existingCA = await store.list<{ id: string; title: string; source: { url?: string } }>('currentAffairs');
  const news = await fetchNews();
  let added = 0;
  for (const n of news.slice(0, 40)) {
    if (added >= env.dailyCaMax) break;
    if (existingCA.some((c) => c.source.url === n.url || jaccard(c.title, n.title) > 0.6)) continue;
    if (!provider) { log('Step 2 skipped: no AI provider — storing raw item without summary is not allowed; add manually via admin.'); break; }
    try {
      const s = await provider.structured({ system: CA_SYSTEM, user: `DATE: ${n.publishedAt}\nSOURCE: ${n.source} (${n.url})\nTITLE: ${n.title}\nTEXT: ${n.description}`, schema: CurrentAffairSummarySchema });
      const id = `ca-${n.publishedAt}-${norm(n.title).split(' ').slice(0, 4).join('-')}`;
      await store.upsert('currentAffairs', {
        id, date: n.publishedAt, publishedOn: today, category: s.category, title: s.title, titleHi: s.titleHi, summary: s.summary, whyItMatters: s.whyItMatters,
        source: { name: n.source, url: n.url, type: 'secondary' }, verified: false, tags: [],
        mcq: s.mcq ? { ...s.mcq, id: `${id}-mcq`, subjectId: 'gk', topicId: s.category === 'uttar-pradesh' ? 'gk-current-up' : s.category === 'international' ? 'gk-current-intl' : 'gk-current-national', origin: 'practice', createdAt: today, updatedAt: today, options: s.mcq.options.map((o) => ({ ...o, whyIncorrect: o.whyIncorrect ?? undefined })) } : undefined,
      });
      added++;
    } catch (e) { log('Step 2 item failed:', (e as Error).message); }
  }
  log(`Current affairs added: ${added}`);

  // ---- Step 3: new MCQs
  const existingQ = await store.list<{ id: string; text: string; subjectId: string; topicId: string }>('questions');
  let newQ = 0;
  if (provider) {
    const subjects = (syllabus as { subjects: { id: string; nameEn: string; questionsInExam: number; topics: { id: string; nameEn: string }[] }[] }).subjects;
    // weight by exam share: generate ~10 per day
    const picks: { s: typeof subjects[number]; t: typeof subjects[number]['topics'][number] }[] = [];
    for (let i = 0; i < env.dailyMcqCount; i++) {
      const s = subjects[Math.floor(Math.random() * subjects.length)];
      const t = s.topics[Math.floor(Math.random() * s.topics.length)];
      picks.push({ s, t });
    }
    for (const { s, t } of picks) {
      try {
        const existingTexts = existingQ.filter((q) => q.topicId === t.id).map((q) => q.text).slice(0, 30);
        const out = await provider.structured({ system: MCQ_SYSTEM, user: `SUBJECT: ${s.nameEn}\nTOPIC: ${t.nameEn}\nCOUNT: 1\nDIFFICULTY: ${['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]}\nEXISTING QUESTIONS (do not duplicate):\n${existingTexts.map((x) => '- ' + x).join('\n')}`, schema: McqBatchSchema });
        for (const q of out.questions) {
          if (existingQ.some((e) => jaccard(e.text, q.text) > 0.8)) { log('duplicate skipped'); continue; }
          const id = `gen-${today}-${Math.random().toString(36).slice(2, 8)}`;
          await store.upsert('questions', { ...q, id, subjectId: s.id, topicId: t.id, origin: 'practice', tags: ['ai-generated'], createdAt: today, updatedAt: today, options: q.options.map((o) => ({ ...o, whyIncorrect: o.whyIncorrect ?? undefined })) });
          existingQ.push({ id, text: q.text, subjectId: s.id, topicId: t.id });
          newQ++;
        }
      } catch (e) { log('Step 3 item failed:', (e as Error).message); }
    }
  } else log('Step 3 skipped: no AI provider.');
  log(`New MCQs: ${newQ} (labelled ai-generated; review in admin before trusting)`);

  // ---- Step 4: daily set
  const pool = existingQ.map((q) => q.id);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 20);
  await store.upsert('dailySets', { id: today, date: today, questionIds: shuffled, createdAt: new Date().toISOString() });
  log(`Daily set published with ${shuffled.length} questions.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
