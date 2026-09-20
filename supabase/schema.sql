-- PRT Prep — PostgreSQL / Supabase schema
-- Mirrors src/types/models.ts. Apply with: psql $DATABASE_URL -f supabase/schema.sql
-- (or paste into the Supabase SQL editor). Row-level security policies at the bottom assume Supabase Auth.

create extension if not exists pgcrypto;

-- ---------- Users ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  target_exam text not null check (target_exam in ('both','kvs','supertet')),
  study_goal text,
  daily_target_minutes int not null default 90,
  daily_targets jsonb not null default '{"mcqs":20,"mockTests":1,"gk":10,"interviewQuestions":5,"aiInterviews":1}',
  language text not null default 'bilingual',
  save_recordings_by_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Syllabus ----------
create table if not exists subjects (
  id text primary key, code text not null, name_en text not null, name_hi text not null,
  questions_in_exam int not null, marks_in_exam int not null, "order" int not null,
  color text, icon text
);
create table if not exists topics (
  id text primary key, subject_id text not null references subjects(id) on delete cascade,
  name_en text not null, name_hi text not null, subtopics text[], "order" int not null
);

-- ---------- Questions ----------
create table if not exists questions (
  id text primary key,
  subject_id text not null references subjects(id),
  topic_id text not null references topics(id),
  text text not null, text_hi text,
  correct char(1) not null check (correct in ('A','B','C','D')),
  explanation text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  type text not null,
  source text not null, exam_relevance text,
  origin text not null default 'practice' check (origin in ('official','practice','previous-style','demo')),
  tags text[], important boolean default false,
  fingerprint text unique,                         -- duplicate detection
  created_at date not null default current_date, updated_at date not null default current_date
);
create table if not exists question_options (
  question_id text not null references questions(id) on delete cascade,
  key char(1) not null check (key in ('A','B','C','D')),
  text text not null, text_hi text, why_incorrect text,
  primary key (question_id, key)
);
create index if not exists questions_topic_idx on questions(topic_id);
create index if not exists questions_text_search on questions using gin (to_tsvector('simple', text || ' ' || coalesce(explanation,'')));

-- ---------- Tests ----------
create table if not exists mock_tests (
  id text primary key, user_id uuid references profiles(id) on delete cascade,
  mode text not null, title text not null, subject_ids text[], topic_ids text[],
  question_count int not null, timed boolean not null, duration_minutes int not null,
  negative_marking boolean not null, marks_per_question numeric not null, negative_marks numeric not null,
  difficulty text, question_ids text[] not null, instant_feedback boolean default false,
  created_at timestamptz not null default now()
);
create table if not exists test_attempts (
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  mock_test_id text not null references mock_tests(id) on delete cascade,
  started_at timestamptz not null, submitted_at timestamptz,
  status text not null check (status in ('in-progress','submitted')),
  current_index int default 0, remaining_sec int default 0,
  result jsonb                                       -- TestResult (score, accuracy, subjectScores…)
);
create table if not exists test_answers (
  attempt_id text not null references test_attempts(id) on delete cascade,
  question_id text not null references questions(id),
  selected char(1), marked_for_review boolean default false, time_spent_sec int default 0, visited boolean default false,
  primary key (attempt_id, question_id)
);

-- ---------- Interview ----------
create table if not exists interview_categories (
  id text primary key, name text not null, "group" text not null, description text
);
create table if not exists interview_questions (
  id text primary key, category_id text not null references interview_categories(id),
  question text not null, question_hi text,
  level text not null check (level in ('beginner','standard','advanced')),
  checking text[] not null, key_points text[] not null, keywords text[] not null,
  common_mistakes text[] not null, answer_structure text[] not null, sample_answer text not null,
  follow_ups text[] not null default '{}', important boolean default false, source text,
  created_at date not null default current_date, updated_at date not null default current_date
);
create table if not exists interview_sessions (
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  mode text not null, started_at timestamptz not null, completed_at timestamptz,
  planned_question_ids text[] not null, status text not null,
  overall_score int, report jsonb
);
create table if not exists interview_answers (
  id text primary key, session_id text not null references interview_sessions(id) on delete cascade,
  question_id text references interview_questions(id), question_text text not null, is_follow_up boolean not null default false,
  transcript text not null, transcript_source text not null, duration_sec int not null,
  recording_ref text,                                -- storage path if the user explicitly saved the video
  answered_at timestamptz not null default now()
);
create table if not exists interview_feedback (
  answer_id text primary key references interview_answers(id) on delete cascade,
  breakdown jsonb not null, communication jsonb not null, presentation jsonb,
  strengths text[] not null, improvements text[] not null, missing_points text[] not null,
  better_structure text[] not null, recommended_practice text[] not null,
  evaluated_by text not null check (evaluated_by in ('ai','rubric'))
);

-- ---------- Current affairs ----------
create table if not exists current_affairs (
  id text primary key,
  date date not null,                                -- event date — mandatory
  published_on date not null default current_date,
  category text not null, title text not null, title_hi text,
  summary text not null, why_it_matters text not null,
  source_name text not null, source_url text, source_type text not null check (source_type in ('official','secondary')),
  verified boolean not null default false,
  mcq_question_id text references questions(id),
  tags text[]
);
create index if not exists current_affairs_date_idx on current_affairs(date desc);

-- ---------- Study notes ----------
create table if not exists study_notes (
  id text primary key, subject_id text not null references subjects(id), topic_id text references topics(id),
  title text not null, title_hi text, key_concepts text[] not null, theories jsonb, educators jsonb,
  exam_points text[] not null, common_traps text[] not null, related_question_ids text[], source text,
  updated_at date not null default current_date
);

-- ---------- Progress ----------
create table if not exists bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  note text, added_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create table if not exists question_history (
  user_id uuid not null references profiles(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  attempts int not null default 0, correct int not null default 0,
  last_answered_at timestamptz, last_correct boolean,
  primary key (user_id, question_id)
);
create table if not exists daily_activity (
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  mcqs_attempted int default 0, mcqs_correct int default 0, mock_tests int default 0, gk_read int default 0,
  interview_questions_practiced int default 0, ai_interviews int default 0, study_seconds int default 0,
  primary key (user_id, date)
);
create table if not exists daily_sets (
  date date primary key, question_ids text[] not null, created_at timestamptz not null default now()
);

-- ---------- Row-level security (Supabase) ----------
alter table profiles enable row level security;
alter table test_attempts enable row level security;
alter table test_answers enable row level security;
alter table mock_tests enable row level security;
alter table interview_sessions enable row level security;
alter table interview_answers enable row level security;
alter table interview_feedback enable row level security;
alter table bookmarks enable row level security;
alter table question_history enable row level security;
alter table daily_activity enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own attempts" on test_attempts for all using (auth.uid() = user_id);
create policy "own tests" on mock_tests for all using (auth.uid() = user_id);
create policy "own answers" on test_answers for all using (exists (select 1 from test_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "own sessions" on interview_sessions for all using (auth.uid() = user_id);
create policy "own iv answers" on interview_answers for all using (exists (select 1 from interview_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own feedback" on interview_feedback for all using (exists (select 1 from interview_answers a join interview_sessions s on s.id = a.session_id where a.id = answer_id and s.user_id = auth.uid()));
create policy "own bookmarks" on bookmarks for all using (auth.uid() = user_id);
create policy "own history" on question_history for all using (auth.uid() = user_id);
create policy "own activity" on daily_activity for all using (auth.uid() = user_id);
-- Content tables (subjects, topics, questions, interview_questions, current_affairs, study_notes, daily_sets)
-- are public-read; writes go through the server with the service-role key.
