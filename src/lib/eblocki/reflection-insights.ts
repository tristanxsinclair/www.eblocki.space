/**
 * Reflection intelligence layer.
 *
 * Pure analyser over the three reflection fields on `daily_objectives`:
 *   - completion_proof_text
 *   - completion_hard_part
 *   - completion_upgrade
 *
 * Surfaces lightweight behavioural patterns:
 *   - recurring resistance phrases
 *   - common upgrade themes
 *   - average reflection depth
 *   - mode-specific struggle patterns
 *
 * NOT psychology — pattern extraction. The coach and retro layer consume
 * this; no fake clinical claims are made.
 */

export interface ReflectionInput {
  mode_id: string | null;
  status: string;
  completion_proof_text: string | null;
  completion_hard_part: string | null;
  completion_upgrade: string | null;
  objective_date: string;
  resistance_level?: number | null;
  title?: string | null;
}

export interface ReflectionInsights {
  /** Average word count across all non-empty reflection answers. */
  avgReflectionDepth: number;
  /** Top resistance phrase across hard_part answers, or null if no signal. */
  topResistancePhrase: string | null;
  /** Top upgrade theme across upgrade answers, or null. */
  topUpgradeTheme: string | null;
  /** Mode where completion ratio was lowest (struggle mode). */
  strugglingMode: string | null;
  /** Mode where completion ratio was highest. */
  strongestMode: string | null;
  /** How many reflections were too short to count as honest signal. */
  shallowReflections: number;
  /** Total reflections analysed. */
  total: number;
}

const STOP = new Set([
  "that","this","with","just","really","then","than","felt","feel","because","still",
  "didnt","didn","very","what","when","were","have","been","they","them","there",
  "more","much","some","into","than","also","over","like","keep","kept","made",
  "going","gone","want","wanted","needed","need","make","makes","could","would",
  "should","might","about","being","done","while","from","your","yours","mine",
]);

function wordCount(s: string | null): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Topical noun-ish tokens (length >= 4, not stopwords). */
function tokens(s: string | null): string[] {
  if (!s) return [];
  return (s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).filter((w) => !STOP.has(w));
}

function topToken(strings: (string | null)[], minHits = 2): string | null {
  const freq = new Map<string, number>();
  for (const s of strings) {
    for (const t of tokens(s)) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= minHits ? top[0] : null;
}

export function analyseReflections(rows: ReflectionInput[]): ReflectionInsights {
  const reflections = rows
    .filter((r) => r.status === "completed")
    .filter((r) => r.completion_proof_text || r.completion_hard_part || r.completion_upgrade);

  const total = reflections.length;

  // Depth = avg words across all three fields combined.
  const wordCounts = reflections.map(
    (r) => wordCount(r.completion_proof_text) +
           wordCount(r.completion_hard_part) +
           wordCount(r.completion_upgrade),
  );
  const avgReflectionDepth = wordCounts.length
    ? Math.round((wordCounts.reduce((s, n) => s + n, 0) / wordCounts.length) * 10) / 10
    : 0;

  const shallowReflections = wordCounts.filter((n) => n > 0 && n < 10).length;

  const topResistancePhrase = topToken(reflections.map((r) => r.completion_hard_part));
  const topUpgradeTheme = topToken(reflections.map((r) => r.completion_upgrade));

  // Mode completion ratios — uses ALL rows (completed + pending) to weight.
  const modes = new Map<string, { done: number; total: number }>();
  for (const r of rows) {
    if (!r.mode_id) continue;
    const cur = modes.get(r.mode_id) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (r.status === "completed") cur.done += 1;
    modes.set(r.mode_id, cur);
  }
  const ranked = [...modes.entries()]
    .filter(([, v]) => v.total >= 2)
    .map(([k, v]) => ({ mode: k, ratio: v.done / v.total }))
    .sort((a, b) => b.ratio - a.ratio);
  const strongestMode = ranked[0]?.mode ?? null;
  const strugglingMode = ranked.length >= 2 ? ranked[ranked.length - 1].mode : null;

  return {
    avgReflectionDepth,
    topResistancePhrase,
    topUpgradeTheme,
    strongestMode,
    strugglingMode,
    shallowReflections,
    total,
  };
}

/**
 * Strategic recommendation derived from insights + daily score points.
 * Evidence-based, single sentence. NEVER motivational fluff.
 */
export function strategicRecommendation(input: {
  insights: ReflectionInsights;
  dailyScores: { date: string; score: number; proofs: number }[];
  avgFocusMinutes?: number | null;
}): string {
  const { insights, dailyScores, avgFocusMinutes } = input;

  if (insights.total === 0 && dailyScores.length === 0) {
    return "Not enough data yet. Complete two reflections to unlock pattern analysis.";
  }

  // Highest-depth day → behaviour that worked.
  const best = [...dailyScores].sort((a, b) => b.score - a.score)[0];
  const worst = [...dailyScores].sort((a, b) => a.score - b.score)[0];

  if (insights.shallowReflections >= 3 && insights.shallowReflections >= insights.total * 0.5) {
    return "Your reflections are running shallow. Depth of reflection predicts depth of next action — write 3 specific sentences, not 3 words.";
  }
  if (insights.topResistancePhrase) {
    return `Recurring resistance pattern: "${insights.topResistancePhrase}". Pre-decide tomorrow's first 25-minute block to disarm it before it appears.`;
  }
  if (insights.strugglingMode && insights.strongestMode && insights.strugglingMode !== insights.strongestMode) {
    return `${insights.strugglingMode.toUpperCase()} is lagging behind ${insights.strongestMode.toUpperCase()}. Move one ${insights.strugglingMode.toUpperCase()} objective to first action tomorrow.`;
  }
  if (avgFocusMinutes && avgFocusMinutes > 60) {
    return "Depth tends to drop on long blocks. Cap objectives at 45 focus minutes — shorter contracts get closed.";
  }
  if (best && worst && best.score - worst.score > 30) {
    return `Your strongest days (${best.score} score) start with early proof completion. Make tomorrow's first artifact a 25-minute task.`;
  }
  return "Sustain the current pattern. One early proof tomorrow before entertainment protects the streak.";
}

/** Quick formatter for "Most resisted task type" using objective titles. */
export function mostResistedTitleHint(rows: ReflectionInput[]): string | null {
  const pending = rows.filter((r) => r.status !== "completed" && r.title);
  if (pending.length < 2) return null;
  const freq = new Map<string, number>();
  for (const r of pending) {
    for (const t of tokens(r.title)) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? top[0] : null;
}