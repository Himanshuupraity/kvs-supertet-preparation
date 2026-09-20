# PRT Prep — KVS PRT Interview + UP Super TET preparation app

A mobile-first React + TypeScript web app for preparing for the **KVS PRT interview** (AI video mock interviews, question bank with model-answer guidance) and the **UP Primary Assistant Teacher (Class 1–5) Recruitment Exam 2026 ("Super TET")** built from the **official UPESSC syllabus**.

Works fully offline in the browser (all progress in local storage / IndexedDB). An optional Node/Express backend adds LLM-powered evaluation, dynamic follow-up questions, content management APIs and a daily current-affairs/MCQ refresh job.

---

## What was verified from official sources (19 Sep 2026)

| Item | Source | Status |
|---|---|---|
| Super TET syllabus — 10 subjects, 88 topics, 120 Qs × 3 marks, 120 min, **−1 per wrong answer**, bilingual paper | [UPESSC official PDF](https://www.upessc.up.gov.in/syllabus/837218cf-1d9a-4252-a08c-404719d1b9d9.pdf) (decoded from Kruti Dev font) | ✅ transcribed into `src/data/syllabus/supertet-syllabus.json` |
| KVS Rectt. Notification 01/2025 — **PRT Tier-II results declared 14 Sep 2026**; interview schedule/call letters via candidate login | [CBSE press release via kvsangathan.nic.in](https://cdnbbsr.s3waas.gov.in/s32d2ca7eedf739ef4c3800713ec482e1a/uploads/2026/09/2026091426.pdf) | ✅ in `src/data/kvs/kvs-info.json` |
| 85% Tier-II / 15% Interview weightage | Coaching portals only | ⚠️ labelled *unverified* in-app — confirm in the official notification |
| Current affairs (11 seed items) | Official releases where possible; otherwise secondary compilations dated 18 Sep 2026 | Each item shows its **event date**, **source** and an *Official source* / *Verify* badge |

All 130 bundled MCQs and 40 interview questions are **labelled "Practice question"** — written for this app against the official syllabus topics, with sources (NCERT, Acts, policy documents). They are not official past papers.

---

## Features

**Home** — greeting, streak, today's progress bar, daily target checklist, quick tiles, today's CA count, weak areas, study plan.

**Super TET** — subject → topic → question browsing (exact official topics); full-length mock (proportional subject distribution, 120 min, negative marking), Daily Challenge (deterministic 20-Q set per day), Weekly Mock, random practice with instant explanations, custom tests (subjects, count, difficulty, timer, negative marking), topic/subject tests, revision tests; exam runner with sticky timer, question palette (answered/marked/skipped/not-visited), mark for review, skip, swipe navigation, keyboard shortcuts, auto-save & resume, submit confirmation ("You still have N unanswered"); result page (score, accuracy, correct/incorrect/unanswered, avg time, subject bars, recommended topics); review with filters and per-option "why incorrect"; study notes; revision center (wrong, bookmarked, weak topics, recent, important, not attempted, mock mistakes); test history.

**KVS Interview** — readiness score, 40-question bank in 28 categories (what the board checks, key points, common mistakes, structure, reveal-on-demand sample answer, likely follow-ups); **AI mock interview** (Beginner/Standard/Advanced/Full 18-question board structure): question shown + optional TTS, Start Answer → camera+mic → live speech-to-text → Stop → evaluation → score /100 with transparent breakdown (Content 30, Relevance 20, Communication 15, Structure 10, Delivery 10, Teaching approach 10, Examples 5), communication metrics (words, wpm, fillers, repetition), observable presentation metrics (face in frame, centring, movement — no emotion/personality claims), strengths, improvements, **missing points before the model answer**, better structure, recommended practice; dynamic follow-ups (AI) with a structured question-tree fallback; per-answer opt-in recording save (IndexedDB, deletable); session resume; final report with radar chart, category scores, question-by-question review; history with trend graphs.

**Current Affairs** — dated items grouped by date, category filter, official/verify badges, "why it matters", related MCQ answered inline, "practise N CA MCQs" test.

**Search** — topics, MCQs, interview questions, current affairs, notes. **Study plan** — minutes ∝ official weightage × weakness. **Analytics** — accuracy, attempts, trends, weekly bars, subject/topic performance; KVS score history, content vs communication, radar. **Profile** — name, target, goal, minutes, daily targets, speech language, privacy controls. **Admin** — add/edit/delete/mark-important questions (with duplicate check), current affairs, interview questions; near-duplicate finder; JSON export/import.

---

## Folder structure

```
exam-prep-app/
├── index.html, vite.config.ts, tailwind.config.js, tsconfig*.json, .env.example
├── public/                     favicon, PWA manifest
├── src/
│   ├── main.tsx, App.tsx       routing (lazy pages), onboarding gate
│   ├── index.css               Tailwind + design tokens + component classes
│   ├── types/models.ts         all data models (mirrors supabase/schema.sql)
│   ├── data/
│   │   ├── syllabus/supertet-syllabus.json   ← official syllabus (edit to update)
│   │   ├── questions/*.json (per subject) + index.ts
│   │   ├── interview/categories.json, questions-*.json, index.ts (full-mock structure)
│   │   ├── currentAffairs/2026-09.json + index.ts
│   │   ├── notes/notes.json
│   │   └── kvs/kvs-info.json
│   ├── services/
│   │   ├── contentService.ts   single content access point (bundled + admin overrides)
│   │   ├── dedupe.ts           fingerprints + Jaccard near-duplicate detection
│   │   ├── testService.ts      build tests, proportional picking, evaluation
│   │   ├── dailyService.ts     deterministic daily/weekly sets
│   │   ├── analyticsService.ts weak areas, trends, streak
│   │   ├── studyPlanService.ts
│   │   ├── searchService.ts
│   │   ├── evaluationService.ts  offline rubric scoring + follow-up picker
│   │   ├── aiService.ts        provider-agnostic client → /api/ai/* (falls back to rubric)
│   │   ├── speechService.ts    Web Speech API wrapper
│   │   ├── presentationAnalyzer.ts  on-device face-in-frame / motion sampling
│   │   ├── recordingStorage.ts IndexedDB for opt-in recordings
│   │   └── interviewService.ts session planning, report building, readiness
│   ├── store/                  zustand + localStorage: user, progress, interviews, content overrides
│   ├── hooks/                  useSwipe, useInterviewRecorder
│   ├── components/  layout/ (shell, bottom nav, sidebar), ui/, exam/, interview/, charts/
│   └── pages/       HomePage, supertet/*, kvs/*, currentAffairs/*, admin/*, Search, StudyPlan, Analytics, Profile, Sources
├── server/                     optional Express backend
│   ├── src/index.ts            /api/health, /api/ai, /api/content, /api/jobs
│   ├── src/providers/          anthropic.ts, openaiCompatible.ts (AIProvider interface)
│   ├── src/routes/             ai.ts (evaluate, follow-up, recommend), content.ts, jobs.ts
│   ├── src/jobs/dailyRefresh.ts  daily current affairs + MCQ generation + daily set
│   ├── src/lib/                env, zod schemas, prompts, file store
│   └── .env.example
└── supabase/schema.sql         PostgreSQL schema (tables for every model + RLS)
```

---

## Setup & run locally

Requirements: Node 20+.

```bash
cd exam-prep-app
npm install
npm run dev            # http://localhost:5173  (frontend only — fully functional with offline rubric)
```

Optional backend (AI + content API + daily job):

```bash
cd server
npm install
cp .env.example .env   # fill ANTHROPIC_API_KEY (or OpenAI-compatible vars) and ADMIN_TOKEN
npm run dev            # http://localhost:8787 ; Vite proxies /api → 8787
```

Or from the root: `npm run dev:all`.

Type-check: `npm run typecheck`. Production build: `npm run build` → `dist/` (static; deploy to Netlify/Vercel/Nginx; configure SPA fallback to `index.html`). Server: `cd server && npm run build && npm start`.

## Environment variables

Frontend (`.env`): `VITE_API_BASE_URL` (default `/api`), `VITE_AI_ENABLED` (`auto|false`), `VITE_ADMIN_PIN` (optional UI gate).

Server (`server/.env`): `PORT`, `CORS_ORIGIN`, `AI_PROVIDER` (`anthropic|openai-compatible|none`), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5`), `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`, `ADMIN_TOKEN`, `NEWS_API_URL`/`NEWS_API_KEY`, `DATABASE_URL`/`SUPABASE_*` (optional). **API keys live only on the server.**

## Database setup

Default: no database — progress is per-device (localStorage/IndexedDB); server content is stored in `server/data/*.json`.

To move to PostgreSQL/Supabase:
1. Create a project, run `supabase/schema.sql` (SQL editor or `psql`).
2. Seed `subjects`/`topics` from `src/data/syllabus/supertet-syllabus.json` and questions from `src/data/questions/*.json` (a one-off script mapping the JSON to the tables — shapes match 1:1).
3. Implement `ContentStore` in `server/src/lib/store.ts` with SQL and swap `fileStore`; the routes don't change.
4. For user sync, add Supabase Auth and replace the zustand `persist` storage with a sync layer that writes `test_attempts`, `question_history`, `daily_activity`, `interview_sessions`… (RLS policies are included).

## AI API setup

1. Set `ANTHROPIC_API_KEY` (uses the Anthropic SDK with structured outputs) **or** `AI_PROVIDER=openai-compatible` with `OPENAI_*` (works with OpenAI, Azure, Groq, Ollama…).
2. Start the server. The frontend probes `/api/ai/health`; when a provider is reported it uses AI for **answer evaluation** (`/api/ai/evaluate`), **dynamic follow-ups** (`/api/ai/follow-up`) and **study recommendations** (`/api/ai/recommend`). Otherwise it silently uses the offline rubric and question-tree follow-ups — the UI states which one was used.
3. Only the transcript and numeric metrics are sent; video/audio never leave the device.

## Video interview setup

Uses browser `MediaDevices.getUserMedia` + `MediaRecorder` (recording), Web Speech API `SpeechRecognition` (live transcript — Chrome/Edge on Android & desktop; Safari/Firefox fall back to a manual transcript box), `SpeechSynthesis` (interviewer voice), and the experimental `FaceDetector` API when available (else motion only). **HTTPS (or localhost) is required** for camera access. Recordings are stored only when the user taps "Save this recording" and can be deleted from the report or Profile.

## Daily current-affairs automation

`server/src/jobs/dailyRefresh.ts` fetches news from `NEWS_API_URL` (any JSON API returning `{articles:[{title,description,url,source:{name},publishedAt}]}` — adapt `fetchNews()` for other shapes), summarises each into a dated `CurrentAffair` + MCQ with the AI provider (marked `verified:false` until approved in Admin), generates ~10 new syllabus-mapped MCQs with duplicate detection, and publishes today's Daily Challenge set. **It is not scheduled automatically in this repo.** Connect one of:

- cron: `0 4 * * * cd /srv/exam-prep-app/server && npm run refresh:daily`
- GitHub Actions / Render / Railway cron calling `npm run refresh:daily`
- Hosted cron hitting `POST /api/jobs/daily-refresh` with `Authorization: Bearer $ADMIN_TOKEN`

The job never fabricates news: with no news source configured it skips step 1 and the app keeps showing dated older items (with a banner saying when content was last added). Frontend consumption of `/api/content/*` output: use Admin → Export/Import today, or wire `contentService.ts` to fetch the collections (same JSON shapes).

## Admin / content updates

`/admin` (optionally PIN-gated via `VITE_ADMIN_PIN`): add/edit/delete questions with subject/topic pickers from the official syllabus, difficulty, type, origin label, source, per-option "why incorrect", important flag and duplicate warning; add/edit current affairs (date, category, source, verified flag); add/edit interview questions; near-duplicate scanner; export everything to JSON / import JSON. Local changes live in the browser; to ship them to all users, export and commit the JSON into `src/data/…`, or post to `/api/content/<collection>` with the admin token and have the frontend read from the API.

To update the syllabus when UPESSC changes it, edit `src/data/syllabus/supertet-syllabus.json` — pages, tests and analytics derive everything from it.

## Known limitations

- Progress is device-local until a database + auth is wired (structure is ready; see above).
- The question bank is a quality-first seed (130 MCQs + 6 CA MCQs, 40 interview questions). A full 120-question mock currently uses every bundled question and will be shorter for subjects with fewer than their official share — grow the bank via Admin or the daily job.
- Current affairs are only as fresh as the last job run or manual entry; no news source is bundled. Items from secondary compilations are flagged *Verify*.
- Speech-to-text needs Chrome/Edge; iOS Safari has no `SpeechRecognition` (manual transcript fallback works). `FaceDetector` is Chromium-only; elsewhere only movement is measured. Presentation metrics are approximate and observational.
- The offline rubric is keyword/structure-based — good for coaching signals, not a substitute for a human board; connect an LLM for richer evaluation.
- No automated test suite yet (type-checked; flows verified manually in Chromium at 390/412/1440 px).
