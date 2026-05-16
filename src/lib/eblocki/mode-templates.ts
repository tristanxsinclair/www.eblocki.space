/**
 * Mode-aware objective templates.
 *
 * Each mode supplies a small bank of resistance-appropriate missions.
 * The seeder draws from this when a user has an active mode but no open
 * proof commitments — so the day still gets shaped by who they are
 * training to become, not a generic "ship something" prompt.
 *
 * All copy is short, action-led, and proof-required. No fluff.
 */

export type ModeKey =
  | "LAW_MAX"
  | "PSYCH_HD"
  | "SALES_CLOSE"
  | "EBLOCKI_BUILD"
  | "ATHLETE_MODE"
  | "FINANCE_BASICS"
  | "GENERAL_EXECUTION";

export interface ObjectiveTemplate {
  title: string;
  description: string;
  why_it_matters: string;
  required_artifact: string;
  resistance_level: number; // 1..5
  focus_minutes: number;
  reward_value: number;
  streak_impact: number;
  identity_alignment: number; // 1..5
}

const T = (t: ObjectiveTemplate) => t;

export const MODE_TEMPLATES: Record<ModeKey, ObjectiveTemplate[]> = {
  LAW_MAX: [
    T({
      title: "Write one IRAC paragraph",
      description: "Pick one problem from this week's reading. Issue → Rule → Application → Conclusion.",
      why_it_matters: "Markers reward structure, not summaries. Reps build the structure.",
      required_artifact: "One 200-300 word IRAC paragraph, saved as proof.",
      resistance_level: 4,
      focus_minutes: 45,
      reward_value: 30,
      streak_impact: 1,
      identity_alignment: 5,
    }),
    T({
      title: "Extract IRAC from one problem",
      description: "Read one tutorial problem and isolate the issue, rule, application, and conclusion.",
      why_it_matters: "Spotting structure is the prerequisite to writing it.",
      required_artifact: "Bullet list of I/R/A/C for one problem.",
      resistance_level: 2,
      focus_minutes: 25,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Check one authority",
      description: "Verify jurisdiction, hierarchy, and currency for one case or statute you plan to cite.",
      why_it_matters: "Citing dead or out-of-jurisdiction authority is the fastest path to a fail.",
      required_artifact: "Source name + jurisdiction + most recent confirming use.",
      resistance_level: 3,
      focus_minutes: 30,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Upgrade one weak answer",
      description: "Take an existing answer and convert it into marker-ready structure with headings.",
      why_it_matters: "Recycling beats writing from cold. Identity = the operator who edits to the standard.",
      required_artifact: "Before/after pair of one answer.",
      resistance_level: 4,
      focus_minutes: 40,
      reward_value: 25,
      streak_impact: 1,
      identity_alignment: 5,
    }),
  ],
  PSYCH_HD: [
    T({
      title: "Write one CAEE paragraph",
      description: "Concept → Application → Evidence → Evaluation, on one topic from this week.",
      why_it_matters: "HD answers evaluate. They don't just describe.",
      required_artifact: "One 200+ word CAEE paragraph.",
      resistance_level: 4,
      focus_minutes: 40,
      reward_value: 25,
      streak_impact: 1,
      identity_alignment: 5,
    }),
    T({
      title: "Attach one post-2016 source",
      description: "Find one peer-reviewed source published 2016+ and attach it to a claim you already wrote.",
      why_it_matters: "Recent, peer-reviewed evidence is what separates Credit from Distinction.",
      required_artifact: "Citation + the claim it now supports.",
      resistance_level: 2,
      focus_minutes: 20,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Critique one study limitation",
      description: "Pick one study from your reading. Identify one methodological or interpretive limitation.",
      why_it_matters: "Critique is the engine of evaluation marks.",
      required_artifact: "One paragraph naming the study + limitation + implication.",
      resistance_level: 3,
      focus_minutes: 25,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Convert notes to retrieval card",
      description: "Take one lecture's notes and turn them into 5 retrieval-practice questions.",
      why_it_matters: "Retrieval beats rereading every time.",
      required_artifact: "Card with 5 Q/A pairs.",
      resistance_level: 2,
      focus_minutes: 20,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 3,
    }),
  ],
  SALES_CLOSE: [
    T({
      title: "Write one objection-handling script",
      description: "Pick the objection you hear most this week. Write the 3-sentence response.",
      why_it_matters: "Pre-loaded responses beat improvising under pressure.",
      required_artifact: "Objection + script + planned next-line.",
      resistance_level: 3,
      focus_minutes: 25,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 5,
    }),
    T({
      title: "Create one premium attachment angle",
      description: "Pick a base product and write one angle that justifies the upgrade in customer language.",
      why_it_matters: "Attachments are decided before the floor, not on it.",
      required_artifact: "Product pair + value language.",
      resistance_level: 3,
      focus_minutes: 20,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Practise one GSE close",
      description: "Rehearse one Gold Service Extras close out loud, twice.",
      why_it_matters: "Reps remove the hesitation that loses the close.",
      required_artifact: "One-line log: which close, how it sounded.",
      resistance_level: 2,
      focus_minutes: 15,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Compare two products in customer language",
      description: "Pick two SKUs. Write the trade-off in one paragraph, no jargon.",
      why_it_matters: "Customers buy clarity. Jargon kills the close.",
      required_artifact: "Two-product comparison paragraph.",
      resistance_level: 3,
      focus_minutes: 25,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
  ],
  EBLOCKI_BUILD: [
    T({
      title: "Ship one small improvement",
      description: "Identify one friction point in the product. Fix it. Commit it.",
      why_it_matters: "Compounding ships. Roadmaps don't.",
      required_artifact: "One PR/commit reference.",
      resistance_level: 3,
      focus_minutes: 45,
      reward_value: 25,
      streak_impact: 1,
      identity_alignment: 5,
    }),
    T({
      title: "Fix one bug",
      description: "Pick the smallest open bug. Reproduce, fix, ship.",
      why_it_matters: "Bugs erode trust faster than features build it.",
      required_artifact: "Bug description + the fix.",
      resistance_level: 3,
      focus_minutes: 30,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Write one product insight from usage",
      description: "Open the app as a user. Write down one thing that surprised you.",
      why_it_matters: "The product teaches you when you use it like a stranger.",
      required_artifact: "One paragraph insight.",
      resistance_level: 2,
      focus_minutes: 20,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 3,
    }),
    T({
      title: "Document one behaviour loop",
      description: "Pick one user loop. Name the trigger, action, reward, and identity hit.",
      why_it_matters: "If you can't name the loop, you can't tune it.",
      required_artifact: "Loop diagram or 4-line note.",
      resistance_level: 3,
      focus_minutes: 25,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
  ],
  ATHLETE_MODE: [
    T({
      title: "Complete one mobility / recovery block",
      description: "20-minute targeted mobility or recovery — not a full session.",
      why_it_matters: "Recovery is training. Skipped recovery is a debt.",
      required_artifact: "Note: what you did + how the body responded.",
      resistance_level: 2,
      focus_minutes: 20,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Review one game moment",
      description: "Rewatch one clip. Identify decision, execution, alternative.",
      why_it_matters: "Game IQ is built off the field, not on it.",
      required_artifact: "Clip ref + 3-line review.",
      resistance_level: 3,
      focus_minutes: 20,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Run one finishing / movement drill",
      description: "Pick one technical drill. 15 minutes of focused reps.",
      why_it_matters: "Skill is reps under intent, not volume under fatigue.",
      required_artifact: "Drill name + rep count + one feel-note.",
      resistance_level: 3,
      focus_minutes: 15,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 5,
    }),
    T({
      title: "Record one performance lesson",
      description: "Write one sentence: what changed in your game today.",
      why_it_matters: "Lessons compound. Unrecorded lessons evaporate.",
      required_artifact: "One sentence in the training log.",
      resistance_level: 1,
      focus_minutes: 5,
      reward_value: 10,
      streak_impact: 1,
      identity_alignment: 3,
    }),
  ],
  FINANCE_BASICS: [
    T({
      title: "Track one expense",
      description: "Log one real expense from the last 24h with category and necessity flag.",
      why_it_matters: "What you don't track, you don't control.",
      required_artifact: "Tracker entry.",
      resistance_level: 1,
      focus_minutes: 5,
      reward_value: 10,
      streak_impact: 1,
      identity_alignment: 3,
    }),
    T({
      title: "Review one spending pattern",
      description: "Pick one category. Look at last 30 days. Name the pattern.",
      why_it_matters: "Patterns hide the leak. Naming it is the first cut.",
      required_artifact: "One-paragraph pattern note.",
      resistance_level: 2,
      focus_minutes: 20,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 3,
    }),
    T({
      title: "Create one saving rule",
      description: "Define one specific rule (e.g. \"no buy-now-pay-later this week\").",
      why_it_matters: "Rules beat willpower.",
      required_artifact: "Written rule + trigger condition.",
      resistance_level: 2,
      focus_minutes: 10,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Learn one financial concept",
      description: "Pick one concept (compound interest, ETF, margin) and write your own definition.",
      why_it_matters: "Borrowed definitions don't survive contact with decisions.",
      required_artifact: "Concept + own-words definition + one example.",
      resistance_level: 3,
      focus_minutes: 25,
      reward_value: 20,
      streak_impact: 1,
      identity_alignment: 4,
    }),
  ],
  GENERAL_EXECUTION: [
    T({
      title: "Complete one resisted task",
      description: "The one you've been avoiding. Smallest valid version. Now.",
      why_it_matters: "Identity is built by what you do when you don't want to.",
      required_artifact: "Task name + the proof it's done.",
      resistance_level: 4,
      focus_minutes: 30,
      reward_value: 25,
      streak_impact: 2,
      identity_alignment: 5,
    }),
    T({
      title: "Write one proof artifact",
      description: "One concrete output that proves you started — under 30 minutes.",
      why_it_matters: "Inertia is the enemy. Proof breaks inertia.",
      required_artifact: "One artifact saved.",
      resistance_level: 2,
      focus_minutes: 25,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 3,
    }),
    T({
      title: "Clear one friction point",
      description: "Identify the smallest blocker on tomorrow's first task. Remove it now.",
      why_it_matters: "Tomorrow-you cannot fight friction you can pre-clear today.",
      required_artifact: "Friction named + action taken.",
      resistance_level: 2,
      focus_minutes: 15,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 4,
    }),
    T({
      title: "Plan tomorrow's first move",
      description: "Write the exact first action you'll take tomorrow morning. One line.",
      why_it_matters: "Decision fatigue starts the day. Pre-decide.",
      required_artifact: "One sentence in the sheet.",
      resistance_level: 1,
      focus_minutes: 5,
      reward_value: 10,
      streak_impact: 1,
      identity_alignment: 3,
    }),
  ],
};

/** Normalise loose mode_id strings to a known mode key. */
export function normaliseModeKey(input: string | null | undefined): ModeKey {
  if (!input) return "GENERAL_EXECUTION";
  const k = input.toUpperCase().replace(/[\s-]+/g, "_");
  if (k.includes("LAW")) return "LAW_MAX";
  if (k.includes("PSYCH")) return "PSYCH_HD";
  if (k.includes("SALES")) return "SALES_CLOSE";
  if (k.includes("EBLOCKI") || k.includes("BUILD")) return "EBLOCKI_BUILD";
  if (k.includes("ATHLETE") || k.includes("SPORT")) return "ATHLETE_MODE";
  if (k.includes("FINANCE") || k.includes("MONEY")) return "FINANCE_BASICS";
  if ((MODE_TEMPLATES as Record<string, unknown>)[k]) return k as ModeKey;
  return "GENERAL_EXECUTION";
}

/** Pick N templates for a mode, rotated by date so the daily set varies. */
export function pickTemplatesForMode(mode: ModeKey, count: number, dayKey: string): ObjectiveTemplate[] {
  const pool = MODE_TEMPLATES[mode] ?? MODE_TEMPLATES.GENERAL_EXECUTION;
  // Deterministic rotation by day so the user doesn't see the same first
  // mission every morning, but the order is stable across refreshes.
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) | 0;
  const start = Math.abs(h) % pool.length;
  const result: ObjectiveTemplate[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    result.push(pool[(start + i) % pool.length]);
  }
  return result;
}