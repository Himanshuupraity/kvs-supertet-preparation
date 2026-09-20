import type { CommunicationMetrics, InterviewFeedback, InterviewQuestion, PresentationMetrics, ScoreBreakdown } from '@/types/models';
import { normalizeText, tokenize } from '@/utils/text';

/**
 * Rubric-based (offline) evaluation of an interview answer transcript.
 * This is the fallback when no LLM is configured. It reports only observable
 * characteristics (coverage of key points, structure words, fluency metrics) and
 * makes no psychological/personality claims.
 */

const FILLERS = ['um', 'uh', 'umm', 'hmm', 'like', 'you know', 'basically', 'actually', 'so so', 'matlab', 'मतलब', 'वो', 'हाँ तो', 'ok so', 'i mean', 'kind of', 'sort of'];
const STRUCTURE_MARKERS = ['first', 'firstly', 'second', 'secondly', 'third', 'finally', 'then', 'next', 'for example', 'because', 'therefore', 'so that', 'in conclusion', 'to sum up', 'पहले', 'दूसरे', 'अंत में', 'उदाहरण', 'क्योंकि', 'इसलिए', 'फिर'];
const EXAMPLE_MARKERS = ['for example', 'for instance', 'in my class', 'when i', 'i used', 'i did', 'we did', 'once', 'last year', 'उदाहरण', 'मेरी कक्षा', 'जब मैं', 'मैंने'];
const TEACHING_TERMS = ['child', 'children', 'student', 'learner', 'class', 'activity', 'tlm', 'group', 'assess', 'learning outcome', 'play', 'story', 'concrete', 'scaffold', 'inclusive', 'parent', 'reinforce', 'nep', 'fln', 'nipun', 'ncf', 'pedagog', 'बच्च', 'छात्र', 'कक्षा', 'गतिविधि', 'खेल', 'कहानी', 'मूल्यांकन'];

export function communicationMetrics(transcript: string, durationSec: number): CommunicationMetrics {
  const norm = normalizeText(transcript);
  const words = tokenize(transcript);
  const wordCount = words.length;
  let fillerWords = 0;
  for (const f of FILLERS) {
    const re = new RegExp(`(^|\\s)${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g');
    fillerWords += (norm.match(re) ?? []).length;
  }
  // repeated 3-grams
  const grams = new Map<string, number>();
  for (let i = 0; i + 3 <= words.length; i++) { const g = words.slice(i, i + 3).join(' '); grams.set(g, (grams.get(g) ?? 0) + 1); }
  const repeatedPhrases = [...grams.values()].filter((n) => n > 1).length;
  const sentences = transcript.split(/[.!?।]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2);
  const sentenceCount = Math.max(1, sentences.length);
  return {
    wordCount, durationSec,
    wordsPerMinute: durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0,
    fillerWords, fillerRatio: wordCount ? fillerWords / wordCount : 0,
    repeatedPhrases, sentenceCount, avgSentenceLength: Math.round(wordCount / sentenceCount),
  };
}

function coverage(transcript: string, q: InterviewQuestion): { hit: string[]; missed: string[]; ratio: number } {
  const norm = normalizeText(transcript);
  const hit: string[] = []; const missed: string[] = [];
  // keywords are cheap proxies; keyPoints are shown to the user
  const kwHits = q.keywords.filter((k) => norm.includes(normalizeText(k)));
  const ratio = q.keywords.length ? kwHits.length / q.keywords.length : 0;
  // Map key points to keywords they contain, to decide which key points are "missing"
  for (const kp of q.keyPoints) {
    const kpNorm = normalizeText(kp);
    const related = q.keywords.filter((k) => kpNorm.includes(normalizeText(k)));
    const covered = related.length ? related.some((k) => norm.includes(normalizeText(k))) : tokenize(kp).some((t) => t.length > 4 && norm.includes(t));
    (covered ? hit : missed).push(kp);
  }
  return { hit, missed, ratio };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function rubricEvaluate(transcript: string, durationSec: number, q: InterviewQuestion, presentation: PresentationMetrics | null): InterviewFeedback {
  const cm = communicationMetrics(transcript, durationSec);
  const cov = coverage(transcript, q);
  const norm = normalizeText(transcript);
  const tooShort = cm.wordCount < 40;

  // --- Content knowledge /30: keyword coverage + teaching vocabulary
  const teachingHits = TEACHING_TERMS.filter((t) => norm.includes(t)).length;
  let content = 30 * (0.75 * cov.ratio + 0.25 * clamp(teachingHits / 6, 0, 1));
  if (tooShort) content *= 0.6;

  // --- Relevance /20: proportion of key points touched + question-term overlap
  const qTerms = tokenize(q.question).filter((t) => t.length > 4);
  const qOverlap = qTerms.length ? qTerms.filter((t) => norm.includes(t)).length / qTerms.length : 0.5;
  const kpRatio = q.keyPoints.length ? cov.hit.length / q.keyPoints.length : cov.ratio;
  let relevance = 20 * (0.6 * kpRatio + 0.4 * clamp(qOverlap * 1.5, 0, 1));
  if (tooShort) relevance *= 0.7;

  // --- Communication /15: fluency (WPM 110–170 ideal), filler ratio, repetition
  const wpmScore = cm.wordsPerMinute === 0 ? 0.5 : cm.wordsPerMinute < 80 ? 0.5 : cm.wordsPerMinute < 110 ? 0.8 : cm.wordsPerMinute <= 170 ? 1 : cm.wordsPerMinute <= 200 ? 0.8 : 0.6;
  const fillerScore = clamp(1 - cm.fillerRatio * 8, 0.2, 1);
  const repScore = clamp(1 - cm.repeatedPhrases * 0.08, 0.4, 1);
  const communication = 15 * (0.4 * wpmScore + 0.4 * fillerScore + 0.2 * repScore);

  // --- Structure /10: structure markers + sentence variety + length in ideal band (60–220 words)
  const markers = STRUCTURE_MARKERS.filter((m) => norm.includes(m)).length;
  const lengthScore = cm.wordCount < 40 ? 0.3 : cm.wordCount < 60 ? 0.6 : cm.wordCount <= 260 ? 1 : cm.wordCount <= 350 ? 0.8 : 0.6;
  const structure = 10 * (0.5 * clamp(markers / 3, 0, 1) + 0.5 * lengthScore);

  // --- Delivery /10: duration adequacy + presentation metrics when available (observable only)
  let delivery = 10 * (durationSec < 15 ? 0.3 : durationSec < 30 ? 0.6 : durationSec <= 150 ? 1 : durationSec <= 210 ? 0.8 : 0.6);
  if (presentation?.supported && presentation.framesSampled > 5) {
    const face = presentation.faceVisibleRatio ?? 0.7;
    const centred = presentation.centeredRatio ?? 0.7;
    const motion = presentation.motionScore ?? 0.2;
    const presScore = 0.4 * face + 0.4 * centred + 0.2 * clamp(1 - motion * 2, 0, 1);
    delivery = 0.6 * delivery + 4 * presScore;
  }

  // --- Teaching approach /10: teaching vocabulary + action verbs
  const actionVerbs = ['i would', 'i will', 'मैं', 'first i', 'then i', 'use', 'plan', 'observe', 'involve', 'ask', 'give'];
  const actions = actionVerbs.filter((a) => norm.includes(a)).length;
  const teaching = 10 * (0.6 * clamp(teachingHits / 5, 0, 1) + 0.4 * clamp(actions / 4, 0, 1));

  // --- Examples /5
  const exHits = EXAMPLE_MARKERS.filter((m) => norm.includes(normalizeText(m))).length;
  const examples = 5 * clamp(exHits / 2, 0, 1);

  const r = (v: number) => Math.round(v * 10) / 10;
  const breakdown: ScoreBreakdown = {
    contentKnowledge: r(content), relevance: r(relevance), communication: r(communication), structure: r(structure),
    delivery: r(delivery), teachingApproach: r(teaching), examples: r(examples), total: 0,
  };
  breakdown.total = Math.round(breakdown.contentKnowledge + breakdown.relevance + breakdown.communication + breakdown.structure + breakdown.delivery + breakdown.teachingApproach + breakdown.examples);

  // --- Narrative feedback (observable statements only)
  const strengths: string[] = []; const improvements: string[] = []; const practice: string[] = [];
  if (cov.hit.length) strengths.push(`You covered ${cov.hit.length} of ${q.keyPoints.length} key points, including: “${cov.hit[0]}”.`);
  if (markers >= 2) strengths.push('Your answer used clear sequencing words (first/then/finally), which made it easy to follow.');
  if (exHits >= 1) strengths.push('You supported your answer with a concrete example — interviewers value this.');
  if (cm.fillerRatio < 0.03 && cm.wordCount > 40) strengths.push('Very few filler words — your speech sounded deliberate.');
  if (cm.wordsPerMinute >= 110 && cm.wordsPerMinute <= 170) strengths.push(`Comfortable speaking pace (~${cm.wordsPerMinute} words/min).`);
  if (presentation?.supported && (presentation.centeredRatio ?? 0) > 0.75) strengths.push('You stayed centred in the frame and facing the camera for most of the answer.');

  if (tooShort) improvements.push(`The answer was short (${cm.wordCount} words). Aim for 60–200 words: point → reason → example → close.`);
  if (cov.missed.length) improvements.push(`Missing points: ${cov.missed.slice(0, 3).map((m) => `“${m}”`).join('; ')}${cov.missed.length > 3 ? ` and ${cov.missed.length - 3} more` : ''}.`);
  if (cm.fillerRatio >= 0.05) improvements.push(`Filler words appeared ${cm.fillerWords} times (${Math.round(cm.fillerRatio * 100)}% of words). Pause silently instead of saying “um/like/matlab”.`);
  if (cm.repeatedPhrases >= 3) improvements.push('Some phrases were repeated several times — vary your wording or move to the next point.');
  if (markers < 2 && cm.wordCount > 40) improvements.push('Add signposting: “First…, second…, finally…” so the board can track your structure.');
  if (exHits === 0) improvements.push('No classroom example was given. One specific incident from your teaching makes an answer memorable.');
  if (cm.wordsPerMinute > 180) improvements.push(`Pace was fast (~${cm.wordsPerMinute} wpm). Slow down slightly and pause between points.`);
  if (cm.wordsPerMinute > 0 && cm.wordsPerMinute < 90 && cm.wordCount > 30) improvements.push(`Pace was slow (~${cm.wordsPerMinute} wpm); practise speaking key sentences aloud to build fluency.`);
  if (presentation?.supported && (presentation.faceVisibleRatio ?? 1) < 0.6) improvements.push('Your face was out of frame or not detected for much of the answer — keep the camera at eye level.');
  if (presentation?.supported && (presentation.motionScore ?? 0) > 0.35) improvements.push('There was considerable movement in the frame. Sit steady; use small hand gestures only.');

  if (cov.missed.length) practice.push(`Re-read the key points for this question and re-record your answer covering: ${cov.missed.slice(0, 2).join('; ')}.`);
  practice.push(`Practise the ${q.answerStructure.length}-step structure for this question: ${q.answerStructure.join(' → ')}.`);
  if (cm.fillerRatio >= 0.05) practice.push('Record a 60-second answer and count fillers; repeat until under 3 per minute.');
  if (exHits === 0) practice.push('Prepare 5 short classroom stories (a struggling reader, a discipline incident, a parent meeting…) you can plug into any answer.');

  return {
    breakdown,
    communication: cm,
    presentation,
    strengths: strengths.length ? strengths : ['You attempted the answer — keep practising; consistency builds confidence.'],
    improvements,
    missingPoints: cov.missed,
    betterStructure: q.answerStructure,
    recommendedPractice: practice,
    evaluatedBy: 'rubric',
  };
}

/** Choose a fallback follow-up from the question tree, preferring one about a missed point. */
export function pickFollowUp(q: InterviewQuestion, feedback: InterviewFeedback | null): string | null {
  if (!q.followUps.length) return null;
  if (feedback?.missingPoints.length) {
    const miss = normalizeText(feedback.missingPoints[0]);
    const related = q.followUps.find((f) => tokenize(f).some((t) => t.length > 4 && miss.includes(t)));
    if (related) return related;
  }
  return q.followUps[Math.floor(Math.random() * q.followUps.length)];
}
