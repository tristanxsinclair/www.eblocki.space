/**
 * Behavioural Integrity Rules — Eblocki
 *
 * These are NOT cosmetic. They are the contract between the product and the user.
 * Every notification, coach response, and UI surface must respect them. Adding a
 * feature that violates one of these requires an explicit, documented exception.
 *
 * Eblocki optimises for: proof quality, consistency, depth, behavioural honesty.
 * Eblocki does NOT optimise for: screen time, session count, vanity streaks,
 * engagement at any cost.
 */

export const INTEGRITY_RULES = {
  // Notifications & nudges
  MAX_NUDGES_PER_DAY: 3,
  MIN_HOURS_BETWEEN_NUDGES: 4,
  NO_FAKE_URGENCY: true,           // never invent deadlines or "last chance" framing
  NO_GUILT_FRAMING: true,          // never frame skipped days as failure or loss of identity

  // Streaks & momentum
  STREAK_REQUIRES_PROOF: true,     // a streak day requires a real proof artifact
  NO_STREAK_INFLATION: true,       // never display a streak we can't prove from artifacts
  ALLOW_FREEZE_TOKENS: true,       // life happens — protect honesty over numbers

  // Coaching
  NO_FABRICATED_CITATIONS: true,   // never invent a study, source, or quote
  NO_FALSE_CERTAINTY: true,        // hedge behavioural claims; we are pre-30-day data
  NO_EMOTIONAL_MANIPULATION: true, // no shame, no flattery loops, no FOMO

  // Completion & reward
  COMPLETION_REQUIRES_REFLECTION: true,
  NO_CASINO_REWARDS: true,         // no slot-machine animations, no variable visual spam

  // Data & analytics
  NO_PII_IN_ANALYTICS: true,
  NO_REFLECTION_TEXT_IN_ANALYTICS: true,

  // Self-modification (Round 5.5 explicit)
  NO_AUTONOMOUS_BEHAVIOURAL_CHANGES: true,
  RESEARCH_REQUIRES_HUMAN_APPROVAL: true,
} as const;

export type IntegrityRule = keyof typeof INTEGRITY_RULES;

/**
 * Throw in dev / log in prod if a code path would violate a rule.
 * Use sparingly — most rules are enforced at the call site (rate limiters,
 * QA checks, coach prompt). This is the last-line tripwire.
 */
export function assertIntegrity(rule: IntegrityRule, condition: boolean, context?: string) {
  if (INTEGRITY_RULES[rule] && !condition) {
    const msg = `[INTEGRITY VIOLATION] ${rule}${context ? ` — ${context}` : ""}`;
    if (import.meta.env.DEV) throw new Error(msg);
    console.warn(msg);
  }
}

/** Used by notification scheduler to enforce daily ceiling + spacing. */
export function canSendNudge(opts: {
  nudgesSentToday: number;
  lastNudgeAt: Date | null;
  now?: Date;
}): { allowed: boolean; reason?: string } {
  const now = opts.now ?? new Date();
  if (opts.nudgesSentToday >= INTEGRITY_RULES.MAX_NUDGES_PER_DAY) {
    return { allowed: false, reason: "daily_cap_reached" };
  }
  if (opts.lastNudgeAt) {
    const hours = (now.getTime() - opts.lastNudgeAt.getTime()) / 3_600_000;
    if (hours < INTEGRITY_RULES.MIN_HOURS_BETWEEN_NUDGES) {
      return { allowed: false, reason: "min_spacing_not_met" };
    }
  }
  return { allowed: true };
}
