/**
 * Quest personalisation.
 *
 * Turns the generic mode template bank into a quest set derived from what
 * the operator actually built their eblocki OS to be: their active modes,
 * their own evidence standards, their domain levels, their last proof's
 * `next_upgrade`, their momentum, and their calibration flags.
 *
 * Fully deterministic (no AI, no randomness) so the same day + same data
 * always produces the same quests. Handles null/legacy rows safely.
 */

import {
  MODE_TEMPLATES,
  normaliseModeKey,
  pickTemplatesForMode,
  type ModeKey,
  type ObjectiveTemplate,
} from "./mode-templates";
import type { CalibrationFlag } from "./calibration";

export interface QuestModeRow {
  mode_id: string | null;
  display_name?: string | null;
  is_default?: boolean | null;
  strong_evidence_examples?: string[] | null;
  proof_examples?: string[] | null;
  keywords?: string[] | null;
}

export interface QuestDomainLevelRow {
  domain: string;
  level?: number | null;
  next_requirement?: string | null;
  current_standard?: string | null;
  updated_at?: string | null;
}

export interface QuestProofRow {
  title?: string | null;
  domain?: string | null;
  quality_score?: number | null;
  next_upgrade?: string | null;
  created_at?: string | null;
  transfer_flag?: boolean | null;
  pressure_flag?: boolean | null;
}

export interface QuestMomentumRow {
  streak_days?: number | null;
  avg_quality?: number | null;
  proofs_today?: number | null;
  state?: string | null;
}

export interface QuestPersonalisationInput {
  dayKey: string;
  modes: QuestModeRow[];
  domainLevels: QuestDomainLevelRow[];
  recentProofs: QuestProofRow[];
  momentum: QuestMomentumRow | null;
  calibrationFlags?: CalibrationFlag[];
  /** Max quests to seed. Overload flag lowers this further. */
  maxQuests?: number;
}

export type QuestOrigin =
  | "mode_bank"
  | "next_upgrade"
  | "correction"
  | "neglected_domain"
  | "pressure_step";

export interface PersonalisedQuest {
  /** Deterministic stable id for a (day, origin, title) triple. */
  questKey: string;
  title: string;
  description: string;
  why_it_matters: string;
  required_artifact: string;
  resistance_level: number;
  focus_minutes: number;
  reward_value: number;
  streak_impact: number;
  identity_alignment: number;
  modeKey: ModeKey;
  modeId: string | null;
  domain: string | null;
  origin: QuestOrigin;
  /** Proof ladder rung this quest is aimed at. */
  stage: QuestStage;
  /** What happens if it is skipped. Non-negotiable, stated up front. */
  escalationRule: string;
  /** The most likely way this quest gets faked. */
  selfDeceptionRisk: string;
  /** Short human trace of why this quest exists for this operator. */
  personalisationReason: string;
}

export type QuestStage = "contact" | "output" | "depth" | "pressure" | "transfer";

export interface QuestBrief {
  /** One-line read of the operator's current evidence position. */
  headline: string;
  band: { min: number; max: number; note: string };
  signals: string[];
  /** True when the day is built from real history rather than defaults. */
  personalised: boolean;
}

const STAGE_BY_RESISTANCE: QuestStage[] = ["contact", "contact", "output", "depth", "pressure"];

function stageFor(resistance: number, origin: QuestOrigin): QuestStage {
  if (origin === "pressure_step") return "transfer";
  if (origin === "correction") return "depth";
  return STAGE_BY_RESISTANCE[clampResistance(resistance) - 1] ?? "output";
}

const ESCALATION_BY_ORIGIN: Record<QuestOrigin, string> = {
  mode_bank: "Skipped twice and this mode drops to contact-level quests until one artifact lands.",
  next_upgrade: "Unexecuted upgrades re-issue tomorrow at higher resistance and block new domains.",
  correction: "Until the correction is filed, new proof in this domain will not raise your level.",
  neglected_domain: "Another skipped day and this domain is marked dormant in the identity ledger.",
  pressure_step: "Skip it and your record stays capped at output level, whatever the streak says.",
};

const RISK_BY_ORIGIN: Record<QuestOrigin, string> = {
  mode_bank: "Doing the easy half and logging it as the whole rep.",
  next_upgrade: "Re-describing the upgrade instead of executing it.",
  correction: "Filing a fresh artifact to bury the weak one.",
  neglected_domain: "A token re-entry rep to reset the clock without real work.",
  pressure_step: "Simulated pressure with no witness, deadline, or opponent.",
};

function questKeyFor(dayKey: string, origin: QuestOrigin, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${dayKey}:${origin}:${slug}`;
}

/** Attach derived governance fields. Single place so every origin is covered. */
function finalise(
  quest: Omit<PersonalisedQuest, "questKey" | "stage" | "escalationRule" | "selfDeceptionRisk">,
  dayKey: string,
): PersonalisedQuest {
  return {
    ...quest,
    questKey: questKeyFor(dayKey, quest.origin, quest.title),
    stage: stageFor(quest.resistance_level, quest.origin),
    escalationRule: ESCALATION_BY_ORIGIN[quest.origin],
    selfDeceptionRisk: RISK_BY_ORIGIN[quest.origin],
  };
}

/** Deterministic read of the operator's position, shown above the quest set. */
export function summariseQuestSignals(input: QuestPersonalisationInput): QuestBrief {
  const flags = input.calibrationFlags ?? [];
  const band = resistanceBand(input.momentum, flags);
  const streak = Math.max(0, num(input.momentum?.streak_days));
  const quality = num(input.momentum?.avg_quality);
  const proofs = input.recentProofs.length;
  const modes = orderedModes(input.modes);
  const signals: string[] = [];

  if (modes.length > 0) {
    signals.push(
      `${modes.length} active mode${modes.length > 1 ? "s" : ""}: ${modes
        .map((m) => text(m.display_name) || normaliseModeKey(m.mode_id))
        .join(", ")}`,
    );
  }
  if (proofs > 0) signals.push(`${proofs} recent proof${proofs > 1 ? "s" : ""} read`);
  if (quality > 0) signals.push(`avg quality ${quality.toFixed(1)}/10`);
  if (streak > 0) signals.push(`${streak}-day streak`);
  const neglected = neglectedDomain(input.modes, input.recentProofs, input.domainLevels);
  if (neglected) {
    signals.push(
      neglected.daysSince === null
        ? `${neglected.domain} has no proof yet`
        : `${neglected.domain} stale ${neglected.daysSince}d`,
    );
  }
  flags.forEach((flag) => signals.push(`flag: ${flag.replace(/_/g, " ")}`));

  const personalised = modes.length > 0 || proofs > 0;
  const headline = !personalised
    ? "No history yet. Today is a calibration day: one artifact sets the baseline."
    : proofs === 0
      ? "Modes set, no proof filed. The record starts at contact level."
      : quality > 0 && quality < 4
        ? "Evidence is thin. Quests are pinned low until quality holds."
        : band.min >= 4
          ? "You have earned the hard band. Only depth and pressure work counts today."
          : "Quests are tuned to your last artifacts and the domains going quiet.";

  return { headline, band, signals, personalised };
}

const MODE_DOMAIN: Record<ModeKey, string> = {
  LAW_MAX: "law",
  PSYCH_HD: "psychology",
  SALES_CLOSE: "sales",
  EBLOCKI_BUILD: "eblocki",
  ATHLETE_MODE: "soccer",
  FINANCE_BASICS: "finance",
  GENERAL_EXECUTION: "life",
};

const clampResistance = (value: number) => Math.min(5, Math.max(1, Math.round(value || 1)));
const num = (value: number | null | undefined, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const text = (value: string | null | undefined) => (value ?? "").trim();

function truncate(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Resistance band the operator has actually earned.
 * Weak evidence or a cold streak lowers the ceiling; strong evidence with a
 * live streak raises the floor so the OS stops handing out easy wins.
 */
export function resistanceBand(
  momentum: QuestMomentumRow | null,
  flags: CalibrationFlag[] = [],
): { min: number; max: number; note: string } {
  const streak = Math.max(0, num(momentum?.streak_days));
  const quality = num(momentum?.avg_quality, 0);
  let min = 1;
  let max = 4;
  let note = "Baseline band.";

  if (streak === 0 || (quality > 0 && quality < 4)) {
    max = 3;
    note = "Re-entry band — restart with contact-level proof.";
  }
  if (streak >= 3 && quality >= 6) {
    min = 3;
    max = 5;
    note = "Earned band — depth and pressure work only.";
  }
  if (flags.includes("only_low_resistance")) {
    min = Math.max(min, 4);
    max = 5;
    note = "Low-resistance pattern detected — forcing hard reps.";
  }
  if (flags.includes("objective_overload")) {
    max = Math.min(max, 3);
    note = "Overload pattern — fewer, cleaner reps.";
  }
  return { min, max: Math.max(min, max), note };
}

/** Active modes ordered default-first, deduped by resolved mode key. */
export function orderedModes(modes: QuestModeRow[]): QuestModeRow[] {
  const seen = new Set<ModeKey>();
  return [...modes]
    .sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)))
    .filter((row) => {
      const key = normaliseModeKey(row.mode_id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Domain with the stalest evidence across the operator's active modes. */
export function neglectedDomain(
  modes: QuestModeRow[],
  proofs: QuestProofRow[],
  levels: QuestDomainLevelRow[],
): { domain: string; modeKey: ModeKey; daysSince: number | null } | null {
  const candidates = orderedModes(modes).map((row) => {
    const modeKey = normaliseModeKey(row.mode_id);
    return { modeKey, domain: MODE_DOMAIN[modeKey] };
  });
  if (candidates.length === 0) return null;

  const lastProofAt = new Map<string, number>();
  proofs.forEach((proof) => {
    const domain = text(proof.domain).toLowerCase();
    const at = proof.created_at ? Date.parse(proof.created_at) : NaN;
    if (!domain || Number.isNaN(at)) return;
    if (!lastProofAt.has(domain) || at > (lastProofAt.get(domain) as number)) {
      lastProofAt.set(domain, at);
    }
  });

  const now = Date.now();
  const scored = candidates.map((c) => {
    const at = lastProofAt.get(c.domain);
    const daysSince = at ? Math.floor((now - at) / 86_400_000) : null;
    const level = num(levels.find((l) => l.domain?.toLowerCase() === c.domain)?.level, 1);
    return { ...c, daysSince, level, staleness: daysSince ?? 999 };
  });

  scored.sort((a, b) => b.staleness - a.staleness || a.level - b.level);
  const worst = scored[0];
  if (!worst || worst.staleness < 3) return null;
  return { domain: worst.domain, modeKey: worst.modeKey, daysSince: worst.daysSince };
}

function evidenceStandardFor(mode: QuestModeRow, fallback: string): string {
  const own =
    (mode.strong_evidence_examples ?? []).find((v) => text(v).length > 8) ??
    (mode.proof_examples ?? []).find((v) => text(v).length > 8);
  return own ? truncate(own, 160) : fallback;
}

function fromTemplate(
  template: ObjectiveTemplate,
  mode: QuestModeRow,
  band: { min: number; max: number },
  origin: QuestOrigin,
  reason: string,
  dayKey: string,
): PersonalisedQuest {
  const modeKey = normaliseModeKey(mode.mode_id);
  const resistance = clampResistance(
    Math.min(band.max, Math.max(band.min, template.resistance_level)),
  );
  const drift = resistance - template.resistance_level;
  return finalise({
    title: template.title,
    description: template.description,
    why_it_matters: template.why_it_matters,
    required_artifact: evidenceStandardFor(mode, template.required_artifact),
    resistance_level: resistance,
    focus_minutes: Math.max(5, template.focus_minutes + drift * 10),
    reward_value: Math.max(5, template.reward_value + drift * 5),
    streak_impact: template.streak_impact,
    identity_alignment: template.identity_alignment,
    modeKey,
    modeId: mode.mode_id ?? modeKey,
    domain: MODE_DOMAIN[modeKey],
    origin,
    personalisationReason: reason,
  }, dayKey);
}

/** Quest built from the operator's own last recorded upgrade instruction. */
function nextUpgradeQuest(
  proofs: QuestProofRow[],
  modes: QuestModeRow[],
  band: { min: number; max: number },
  dayKey: string,
): PersonalisedQuest | null {
  const latest = [...proofs]
    .filter((p) => text(p.next_upgrade).length > 8)
    .sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""))[0];
  if (!latest) return null;
  const domain = text(latest.domain).toLowerCase() || null;
  const mode =
    orderedModes(modes).find((m) => MODE_DOMAIN[normaliseModeKey(m.mode_id)] === domain) ??
    orderedModes(modes)[0] ??
    { mode_id: null };
  const modeKey = normaliseModeKey(mode.mode_id);
  const upgrade = truncate(text(latest.next_upgrade), 180);
  return finalise({
    title: `Execute your upgrade: ${truncate(upgrade, 60)}`,
    description: `Your last proof (“${truncate(text(latest.title) || "untitled proof", 60)}”) named this upgrade:\n\n${upgrade}\n\nDo exactly that today.`,
    why_it_matters: "You already diagnosed the gap. Unexecuted upgrades are intention, not evidence.",
    required_artifact: "The upgraded artifact, plus one line on what changed versus the previous version.",
    resistance_level: clampResistance(Math.max(band.min, 4)),
    focus_minutes: 45,
    reward_value: 35,
    streak_impact: 1,
    identity_alignment: 5,
    modeKey,
    modeId: mode.mode_id ?? modeKey,
    domain: domain ?? MODE_DOMAIN[modeKey],
    origin: "next_upgrade",
    personalisationReason: "Carried from the next_upgrade on your most recent proof.",
  }, dayKey);
}

/** Quest that forces a rewrite when the last proof scored weak. */
function correctionQuest(
  proofs: QuestProofRow[],
  modes: QuestModeRow[],
  dayKey: string,
): PersonalisedQuest | null {
  const latest = [...proofs]
    .filter((p) => typeof p.quality_score === "number")
    .sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""))[0];
  if (!latest || num(latest.quality_score, 10) > 4) return null;
  const domain = text(latest.domain).toLowerCase() || null;
  const mode =
    orderedModes(modes).find((m) => MODE_DOMAIN[normaliseModeKey(m.mode_id)] === domain) ??
    orderedModes(modes)[0] ??
    { mode_id: null };
  const modeKey = normaliseModeKey(mode.mode_id);
  return finalise({
    title: `Correct weak proof: ${truncate(text(latest.title) || "last artifact", 50)}`,
    description: `That artifact scored ${num(latest.quality_score)}/10. Rebuild it to the standard instead of logging something new.`,
    why_it_matters: "Weak proof left standing becomes fake progress. Correction is how the record stays honest.",
    required_artifact: "Corrected artifact linked to the original, with the specific weakness named.",
    resistance_level: 4,
    focus_minutes: 40,
    reward_value: 30,
    streak_impact: 1,
    identity_alignment: 5,
    modeKey,
    modeId: mode.mode_id ?? modeKey,
    domain: domain ?? MODE_DOMAIN[modeKey],
    origin: "correction",
    personalisationReason: "Your most recent proof scored at or below 4/10.",
  }, dayKey);
}

/** Quest that escalates to pressure/transfer once output is already proven. */
function pressureQuest(
  proofs: QuestProofRow[],
  modes: QuestModeRow[],
  band: { min: number; max: number },
  dayKey: string,
): PersonalisedQuest | null {
  if (band.max < 5) return null;
  const strong = proofs.filter((p) => num(p.quality_score) >= 6);
  if (strong.length < 3) return null;
  if (proofs.some((p) => p.transfer_flag || p.pressure_flag)) return null;
  const mode = orderedModes(modes)[0] ?? { mode_id: null };
  const modeKey = normaliseModeKey(mode.mode_id);
  return finalise({
    title: "Take it into pressure",
    description:
      "You have repeated output-level proof. Today the same skill has to survive a real constraint: a deadline, an audience, an examiner, or a live opponent.",
    why_it_matters: "Output without pressure is rehearsal. Transfer is what the record needs next.",
    required_artifact:
      "Artifact produced under a named constraint (who saw it, what the limit was, what broke).",
    resistance_level: 5,
    focus_minutes: 60,
    reward_value: 45,
    streak_impact: 1,
    identity_alignment: 5,
    modeKey,
    modeId: mode.mode_id ?? modeKey,
    domain: MODE_DOMAIN[modeKey],
    origin: "pressure_step",
    personalisationReason: "3+ strong proofs logged with no pressure or transfer evidence yet.",
  }, dayKey);
}

function neglectQuest(
  input: QuestPersonalisationInput,
  band: { min: number; max: number },
): PersonalisedQuest | null {
  const neglected = neglectedDomain(input.modes, input.recentProofs, input.domainLevels);
  if (!neglected) return null;
  const mode =
    orderedModes(input.modes).find((m) => normaliseModeKey(m.mode_id) === neglected.modeKey) ??
    { mode_id: neglected.modeKey };
  const level = input.domainLevels.find(
    (l) => l.domain?.toLowerCase() === neglected.domain,
  );
  const template = pickTemplatesForMode(neglected.modeKey, 1, input.dayKey)[0];
  if (!template) return null;
  const base = fromTemplate(
    template,
    mode,
    band,
    "neglected_domain",
    neglected.daysSince === null
      ? `No proof recorded in ${neglected.domain} yet.`
      : `${neglected.daysSince} days since your last ${neglected.domain} proof.`,
    input.dayKey,
  );
  const standard = text(level?.next_requirement) || text(level?.current_standard);
  const title = `${neglected.domain.toUpperCase()} back online: ${truncate(template.title, 48)}`;
  return {
    ...base,
    questKey: questKeyFor(input.dayKey, "neglected_domain", title),
    title: `${neglected.domain.toUpperCase()} back online: ${truncate(template.title, 48)}`,
    description: `${template.description}${standard ? `\n\nYour current standard here: ${truncate(standard, 160)}` : ""}`,
    domain: neglected.domain,
  };
}

/**
 * Build the personalised quest set for one day.
 * Order matters: correction and carried upgrades outrank fresh work.
 */
export function personaliseQuests(input: QuestPersonalisationInput): PersonalisedQuest[] {
  const flags = input.calibrationFlags ?? [];
  const band = resistanceBand(input.momentum, flags);
  const modes = orderedModes(input.modes);
  const cap = Math.max(
    1,
    Math.min(flags.includes("objective_overload") ? 2 : (input.maxQuests ?? 3), 5),
  );

  const quests: PersonalisedQuest[] = [];
  const push = (quest: PersonalisedQuest | null) => {
    if (!quest) return;
    if (quests.some((q) => q.title === quest.title)) return;
    quests.push(quest);
  };

  push(correctionQuest(input.recentProofs, modes, input.dayKey));
  push(nextUpgradeQuest(input.recentProofs, modes, band, input.dayKey));
  push(neglectQuest(input, band));
  push(pressureQuest(input.recentProofs, modes, band, input.dayKey));

  // Fill remaining slots from each active mode's bank, one per mode first so
  // multi-mode operators see their whole OS represented.
  const modeList = modes.length > 0 ? modes : [{ mode_id: null } as QuestModeRow];
  for (let round = 0; round < 3 && quests.length < cap; round++) {
    for (const mode of modeList) {
      if (quests.length >= cap) break;
      const key = normaliseModeKey(mode.mode_id);
      const pool = pickTemplatesForMode(key, MODE_TEMPLATES[key].length, input.dayKey);
      const candidate = pool.find(
        (t) =>
          t.resistance_level >= band.min &&
          t.resistance_level <= band.max &&
          !quests.some((q) => q.title === t.title),
      );
      if (candidate) {
        push(
          fromTemplate(
            candidate,
            mode,
            band,
            "mode_bank",
            `From your ${text(mode.display_name) || key} mode, matched to your earned resistance band ${band.min}–${band.max}.`,
            input.dayKey,
          ),
        );
      }
    }
    if (modeList.length === 0) break;
  }

  // Absolute fallback so a new user is never handed an empty day.
  if (quests.length === 0) {
    const template = pickTemplatesForMode("GENERAL_EXECUTION", 1, input.dayKey)[0];
    if (template) {
      push(
        fromTemplate(
          template,
          { mode_id: null },
          band,
          "mode_bank",
          "First quest — no mode or proof history yet.",
          input.dayKey,
        ),
      );
    }
  }

  return quests.slice(0, cap);
}
