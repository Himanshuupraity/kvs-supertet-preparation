/**
 * Core data models. These mirror the SQL schema in /supabase/schema.sql so that
 * the local-storage implementation can be swapped for a real database later.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType =
  | 'conceptual' | 'application' | 'scenario' | 'fact' | 'pedagogy' | 'reasoning' | 'current-affairs';
export type Language = 'en' | 'hi' | 'bilingual';

/** Content provenance label. Practice questions written for this app are always "practice". */
export type ContentOrigin = 'official' | 'practice' | 'previous-style' | 'demo';

// ---------- Syllabus ----------
export interface Subject {
  id: ID;
  code: string;               // e.g. "GK", "MATH"
  nameEn: string;
  nameHi: string;
  questionsInExam: number;    // per official syllabus table
  marksInExam: number;
  order: number;
  color: string;              // tailwind color token for UI
  icon: string;               // lucide icon name
  topics: Topic[];
}

export interface Topic {
  id: ID;
  subjectId: ID;
  nameEn: string;
  nameHi: string;
  subtopics?: string[];
  order: number;
}

export interface SyllabusMeta {
  examName: string;
  examNameHi: string;
  conductingBody: string;
  sourceUrl: string;
  sourceAccessedOn: ISODate;
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarking: number;
  paperLanguage: string;
  levelNotes: string[];
  version: string;
}

// ---------- Questions ----------
export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
  textHi?: string;
  whyIncorrect?: string;      // shown for wrong options
}

export interface Question {
  id: ID;
  subjectId: ID;
  topicId: ID;
  text: string;
  textHi?: string;
  options: QuestionOption[];
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: Difficulty;
  type: QuestionType;
  source: string;             // reference (book / official doc / notification)
  examRelevance: string;      // one-line why this matters for the exam
  origin: ContentOrigin;
  tags?: string[];
  important?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** normalized fingerprint used for duplicate detection */
  fingerprint?: string;
}

// ---------- Tests ----------
export type TestMode = 'full' | 'subject' | 'topic' | 'random' | 'custom' | 'daily' | 'weekly' | 'revision';

export interface MockTestConfig {
  id: ID;
  mode: TestMode;
  title: string;
  subjectIds?: ID[];
  topicIds?: ID[];
  questionCount: number;
  timed: boolean;
  durationMinutes: number;
  negativeMarking: boolean;
  marksPerQuestion: number;
  negativeMarks: number;
  difficulty?: Difficulty | 'mixed';
  questionIds: ID[];
  /** practice mode: show explanation immediately after each answer */
  instantFeedback?: boolean;
  createdAt: ISODateTime;
}

export interface TestAnswer {
  questionId: ID;
  selected: 'A' | 'B' | 'C' | 'D' | null;
  markedForReview: boolean;
  timeSpentSec: number;
  visited: boolean;
}

export interface TestAttempt {
  id: ID;
  config: MockTestConfig;
  answers: Record<ID, TestAnswer>;
  startedAt: ISODateTime;
  submittedAt?: ISODateTime;
  currentIndex: number;
  remainingSec: number;
  status: 'in-progress' | 'submitted';
  result?: TestResult;
}

export interface SubjectScore {
  subjectId: ID;
  attempted: number;
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number; // 0-100 of attempted
}

export interface TestResult {
  score: number;
  maxScore: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  avgTimeSec: number;
  totalTimeSec: number;
  subjectScores: SubjectScore[];
  topicScores: Record<ID, { correct: number; total: number }>;
  recommendedTopics: ID[];
}

// ---------- Interview ----------
export type InterviewCategoryId = string;

export interface InterviewCategory {
  id: InterviewCategoryId;
  name: string;
  group: 'personal' | 'pedagogy' | 'psychology' | 'classroom' | 'policy' | 'subject' | 'kvs' | 'situational' | 'awareness';
  description: string;
}

export interface InterviewQuestion {
  id: ID;
  categoryId: InterviewCategoryId;
  question: string;
  questionHi?: string;
  level: 'beginner' | 'standard' | 'advanced';
  checking: string[];         // what the interviewer is assessing
  keyPoints: string[];        // must-mention concepts (used for rubric evaluation)
  keywords: string[];         // lower-cased terms for content-coverage heuristic
  commonMistakes: string[];
  answerStructure: string[];  // recommended structure steps
  sampleAnswer: string;
  followUps: string[];        // fallback question tree
  important?: boolean;
  source?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type InterviewMode = 'beginner' | 'standard' | 'advanced' | 'full';

export interface ScoreBreakdown {
  contentKnowledge: number;   // /30
  relevance: number;          // /20
  communication: number;      // /15
  structure: number;          // /10
  delivery: number;           // /10
  teachingApproach: number;   // /10
  examples: number;           // /5
  total: number;              // /100
}

export interface CommunicationMetrics {
  wordCount: number;
  durationSec: number;
  wordsPerMinute: number;
  fillerWords: number;
  fillerRatio: number;
  repeatedPhrases: number;
  sentenceCount: number;
  avgSentenceLength: number;
}

export interface PresentationMetrics {
  /** fraction of sampled frames where a face was detected roughly centered */
  faceVisibleRatio: number | null;
  /** fraction of frames where face centre was within the "looking at camera" zone */
  centeredRatio: number | null;
  /** average inter-frame motion 0..1 (higher = more movement) */
  motionScore: number | null;
  framesSampled: number;
  supported: boolean;
  note: string;
}

export interface InterviewFeedback {
  breakdown: ScoreBreakdown;
  communication: CommunicationMetrics;
  presentation: PresentationMetrics | null;
  strengths: string[];
  improvements: string[];
  missingPoints: string[];
  betterStructure: string[];
  recommendedPractice: string[];
  evaluatedBy: 'ai' | 'rubric';
}

export interface InterviewAnswer {
  id: ID;
  questionId: ID | null;      // null for AI-generated follow-ups
  questionText: string;
  isFollowUp: boolean;
  transcript: string;
  transcriptSource: 'speech-api' | 'manual' | 'none';
  durationSec: number;
  feedback: InterviewFeedback | null;
  recordingBlobKey?: string;  // IndexedDB key if user chose to save the video
  answeredAt: ISODateTime;
}

export interface InterviewSession {
  id: ID;
  mode: InterviewMode;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  answers: InterviewAnswer[];
  plannedQuestionIds: ID[];
  overallScore: number | null;
  report: InterviewReport | null;
  status: 'in-progress' | 'completed' | 'abandoned';
}

export interface InterviewReport {
  overall: number;
  breakdownAvg: ScoreBreakdown;
  strongAreas: string[];
  improveAreas: string[];
  recommendedPractice: string[];
  categoryScores: Record<string, number>;
}

// ---------- Current affairs ----------
export type CurrentAffairCategory =
  | 'national' | 'international' | 'schemes' | 'education' | 'appointments' | 'awards' | 'sports'
  | 'science-tech' | 'important-days' | 'books' | 'reports' | 'economy' | 'polity' | 'uttar-pradesh' | 'initiatives' | 'defence';

export interface CurrentAffair {
  id: ID;
  date: ISODate;              // date of the event/news — always required
  publishedOn: ISODate;       // date added to app
  category: CurrentAffairCategory;
  title: string;
  titleHi?: string;
  summary: string;
  whyItMatters: string;
  source: { name: string; url?: string; type: 'official' | 'secondary' };
  verified: boolean;          // true only if cross-checked with an official source
  mcq?: Question;
  tags?: string[];
}

// ---------- Study notes ----------
export interface StudyNote {
  id: ID;
  subjectId: ID;
  topicId?: ID;
  title: string;
  titleHi?: string;
  keyConcepts: string[];
  theories?: { name: string; points: string[] }[];
  educators?: { name: string; contribution: string }[];
  examPoints: string[];
  commonTraps: string[];
  relatedQuestionIds?: ID[];
  updatedAt: ISODate;
  source?: string;
}

// ---------- User / progress ----------
export interface UserProfile {
  id: ID;
  name: string;
  targetExam: 'both' | 'kvs' | 'supertet';
  studyGoal: string;
  dailyTargetMinutes: number;
  dailyTargets: { mcqs: number; mockTests: number; gk: number; interviewQuestions: number; aiInterviews: number };
  language: Language;
  createdAt: ISODateTime;
  saveRecordingsByDefault: boolean;
}

export interface Bookmark { questionId: ID; addedAt: ISODateTime; note?: string; }

export interface DailyActivity {
  date: ISODate;
  mcqsAttempted: number;
  mcqsCorrect: number;
  mockTests: number;
  gkRead: number;
  interviewQuestionsPracticed: number;
  aiInterviews: number;
  studySeconds: number;
}

export interface QuestionHistoryEntry {
  questionId: ID;
  attempts: number;
  correct: number;
  lastAnsweredAt: ISODateTime;
  lastCorrect: boolean;
}

export interface StudyPlanBlock { subjectId: ID | 'ca' | 'gk' | 'kvs'; label: string; minutes: number; reason: string; route: string; }
