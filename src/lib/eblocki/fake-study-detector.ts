/**
 * Fake Study Detector v1
 *
 * Deterministic classifier that asks: "When a student says 'I studied,'
 * what proof exists?" — then returns one of four verdicts plus a single
 * Proof Upgrade Command.
 *
 * Pure function, no I/O, never throws. Safe on empty / partial input.
 * This sits ALONGSIDE `scoreProofArtifact` (which scores against a
 * domain rubric) and intentionally punishes passive study even when the
 * rubric scorer is generous.
 */

export type StudyVerdict = "weak" | "useful" | "strong" | "elite";

export interface StudyClassificationInput {
  content?: string;
  title?: string;
  artifactType?: string;
}

export interface StudyClassification {
  verdict: StudyVerdict;
  reason: string;
  verdictCopy: string;
  upgradeCommand: string;
  matchedSignal: StudySignal;
}

export type StudySignal =
  | "elite_timed_marked"
  | "elite_feedback_rewrite"
  | "strong_irac"
  | "strong_essay_plan"
  | "strong_from_memory"
  | "strong_applied"
  | "strong_practice_question"
  | "strong_mistake_ledger"
  | "useful_flashcards"
  | "useful_ai_explanation"
  | "useful_focus_timer"
  | "useful_summary"
  | "useful_short_quiz"
  | "weak_passive_reading"
  | "weak_highlighting"
  | "weak_watching"
  | "weak_copying_notes"
  | "weak_organisation"
  | "fallback_action"
  | "fallback_none";

export const STUDY_VERDICT_COPY: Record<StudyVerdict, string> = {
  weak: "You touched the material, but did not prove command of it. Upgrade required.",
  useful: "This helps, but it is not strong evidence yet. Convert it into application.",
  strong: "This is real study evidence. Store it and raise the next standard.",
  elite: "This proves capability under pressure or correction. Identity evidence accepted.",
};

const UPGRADE_BY_SIGNAL: Partial<Record<StudySignal, string>> = {
  weak_passive_reading: "Close the notes. Write 5 points from memory.",
  weak_highlighting: "Close the book. Produce one paragraph from memory.",
  weak_watching: "Turn the video into one exam-style answer without replaying it.",
  weak_copying_notes: "Close the source. Write the same idea in your own words.",
  weak_organisation: "Stop organising. Produce one subject artifact in the next 25 minutes.",
  useful_flashcards: "Mark your missed cards and write the correction rule for each.",
  useful_ai_explanation: "Apply this concept to a new scenario without re-asking the AI.",
  useful_focus_timer: "Convert today's session into one assessable paragraph.",
  useful_summary: "Turn the summary into one exam-style answer from memory.",
  useful_short_quiz: "Mark the missed answers and write the correction rule.",
  strong_irac: "Add one counterargument or limitation, then time the next attempt.",
  strong_essay_plan: "Write the paragraph the plan implies. Then time the next attempt.",
  strong_from_memory: "Repeat under a shorter time limit, then self-mark.",
  strong_applied: "Add one counterargument or limitation.",
  strong_practice_question: "Self-mark, store the mistake, and schedule a retrieval rep.",
  strong_mistake_ledger: "Schedule a retrieval rep on this mistake within 48 hours.",
  elite_timed_marked: "Repeat this under a shorter time limit.",
  elite_feedback_rewrite: "Save before/after versions as identity evidence.",
  fallback_action: "Convert this into one assessable paragraph or worked answer.",
  fallback_none: "Close the notes. Write 5 points from memory.",
};

const DEFAULT_UPGRADE: Record<StudyVerdict, string> = {
  weak: "Close the notes. Write 5 points from memory.",
  useful: "Apply this concept to a new scenario.",
  strong: "Add one counterargument or limitation.",
  elite: "Save before/after versions as identity evidence.",
};

const REASON_BY_SIGNAL: Record<StudySignal, string> = {
  elite_timed_marked: "Timed output that was marked or self-marked.",
  elite_feedback_rewrite: "Output improved after feedback or rewrite.",
  strong_irac: "Structured legal answer (IRAC).",
  strong_essay_plan: "Essay plan with thesis and evidence logic.",
  strong_from_memory: "Output produced from memory without notes.",
  strong_applied: "Concept applied to a new scenario or case.",
  strong_practice_question: "Practice question attempted.",
  strong_mistake_ledger: "Mistake captured for correction.",
  useful_flashcards: "Active recall via flashcards.",
  useful_ai_explanation: "AI-assisted explanation logged.",
  useful_focus_timer: "Focus-timer session with some output.",
  useful_summary: "Summary written in own words.",
  useful_short_quiz: "Short quiz attempted.",
  weak_passive_reading: "Passive reading of slides or chapter.",
  weak_highlighting: "Highlighting without producing output.",
  weak_watching: "Watching a video or recording passively.",
  weak_copying_notes: "Copying notes without converting them.",
  weak_organisation: "Organising notes, dashboards or timetables without subject output.",
  fallback_action: "Action verb detected but no study-activity signal.",
  fallback_none: "No assessable study activity detected.",
};

// Order matters: highest tier first; first match wins inside a tier.
const ELITE_PATTERNS: Array<{ signal: StudySignal; re: RegExp }> = [
  // Timed AND (marked|self-marked|corrected). "closed-book timed" also counts.
  {
    signal: "elite_timed_marked",
    re: /\b(closed[\s-]?book\s+(timed|test|answer)|timed[^.]{0,40}(self[\s-]?mark|marked|corrected)|(self[\s-]?mark|marked|corrected)[^.]{0,40}timed)\b/i,
  },
  {
    signal: "elite_feedback_rewrite",
    re: /\b(rewrote|rewrite|redrafted)\b[^.]{0,60}\b(feedback|correction|marker|tutor|rubric)\b|\b(feedback|correction)\b[^.]{0,60}\b(rewrite|rewrote|redraft)\b/i,
  },
];

const STRONG_PATTERNS: Array<{ signal: StudySignal; re: RegExp }> = [
  { signal: "strong_irac", re: /\birac\b/i },
  { signal: "strong_essay_plan", re: /\b(essay plan|thesis[^.]{0,40}(evidence|paragraph)|paragraph logic)\b/i },
  { signal: "strong_from_memory", re: /\b(from memory|without (the )?notes|closed[\s-]?book)\b/i },
  { signal: "strong_practice_question", re: /\b(practice question|past paper|exam (answer|question)|timed (answer|question|practice))\b/i },
  { signal: "strong_mistake_ledger", re: /\bmistake ledger\b/i },
  { signal: "strong_applied", re: /\bapplied\b[^.]{0,40}\bto\b|\b(taught (myself|aloud|it back)|explained (it )?aloud)\b/i },
];

const USEFUL_PATTERNS: Array<{ signal: StudySignal; re: RegExp }> = [
  { signal: "useful_flashcards", re: /\b(flashcard|flash card|quizlet|anki)\b/i },
  { signal: "useful_ai_explanation", re: /\b(asked (the )?(ai|chatgpt|gpt|claude)|chatgpt explain|ai explanation)\b/i },
  { signal: "useful_focus_timer", re: /\b(pomodoro|focus timer|focus session)\b/i },
  { signal: "useful_summary", re: /\b(summari[sz]ed?|summary in (my )?own words|in my own words)\b/i },
  { signal: "useful_short_quiz", re: /\b(short quiz|quick quiz|recall (session|test|round))\b/i },
];

const WEAK_PATTERNS: Array<{ signal: StudySignal; re: RegExp }> = [
  { signal: "weak_passive_reading", re: /\b(re[\s-]?read|reread|read (over |through )?(the )?(slides|chapter|textbook|notes|book))\b/i },
  { signal: "weak_highlighting", re: /\bhighlight(ing|ed)?\b/i },
  { signal: "weak_watching", re: /\bwatch(ed|ing)?\s+(a |the )?(video|lecture|recording|explanation|playlist)\b/i },
  { signal: "weak_copying_notes", re: /\bcop(y|ied|ying) (out |down )?(the )?notes\b/i },
  { signal: "weak_organisation", re: /\b(made|built|created)\b[^.\n]{0,40}\b(dashboard|timetable|schedule|study plan|notion)\b|\borgani[sz]ed (my )?notes\b/i },
];

const FALLBACK_ACTION_RE = /\b(wrote|completed|produced|shipped|submitted|published|delivered)\b/i;

function tierVerdict(signal: StudySignal): StudyVerdict {
  if (signal.startsWith("elite")) return "elite";
  if (signal.startsWith("strong")) return "strong";
  if (signal.startsWith("useful")) return "useful";
  if (signal === "fallback_action") return "useful";
  return "weak";
}

function firstMatch(
  text: string,
  patterns: Array<{ signal: StudySignal; re: RegExp }>,
): StudySignal | null {
  for (const { signal, re } of patterns) {
    if (re.test(text)) return signal;
  }
  return null;
}

/**
 * Classify a student's described study activity as weak/useful/strong/elite.
 * Deterministic, ordered: elite > strong > useful > weak > fallback.
 */
export function classifyStudyActivity(
  input: StudyClassificationInput,
): StudyClassification {
  const content = (input?.content ?? "").toString();
  const title = (input?.title ?? "").toString();
  const artifactType = (input?.artifactType ?? "").toString();
  const combined = [title, artifactType, content].filter(Boolean).join("\n");

  let signal: StudySignal | null = null;

  if (combined.trim().length > 0) {
    signal =
      firstMatch(combined, ELITE_PATTERNS) ??
      firstMatch(combined, STRONG_PATTERNS) ??
      firstMatch(combined, USEFUL_PATTERNS) ??
      firstMatch(combined, WEAK_PATTERNS);

    if (!signal) {
      if (content.length >= 250 && FALLBACK_ACTION_RE.test(combined)) {
        signal = "fallback_action";
      } else {
        signal = "fallback_none";
      }
    }
  } else {
    signal = "fallback_none";
  }

  const verdict = tierVerdict(signal);
  const upgradeCommand = UPGRADE_BY_SIGNAL[signal] ?? DEFAULT_UPGRADE[verdict];
  const reason = REASON_BY_SIGNAL[signal];

  return {
    verdict,
    reason,
    verdictCopy: STUDY_VERDICT_COPY[verdict],
    upgradeCommand,
    matchedSignal: signal,
  };
}
