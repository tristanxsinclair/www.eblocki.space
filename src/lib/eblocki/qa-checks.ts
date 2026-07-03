/**
 * Behavioural QA checks — pure guardrails over momentum + objective data.
 *
 * Returns an array of human-readable warnings for the debug panel. Used
 * to surface "impossible" states early instead of letting them silently
 * inflate or corrupt user-facing copy.
 */

import type { MomentumSnapshot } from "./momentum";

export interface QAObjective {
  id: string;
  title: string;
  status: string;
  completion_proof_text: string | null;
  completion_hard_part: string | null;
  objective_date: string;
  proof_commitment_id: string | null;
}

export interface QAArtifact {
  quality_score: number | null;
  content: string | null;
  created_at: string;
}

export interface QANotificationLog {
  sent_at: string;
  dedup_key: string;
}

export interface QAWarning {
  code: string;
  level: "info" | "warn" | "error";
  message: string;
}

export function runQAChecks(input: {
  snapshot: MomentumSnapshot | null;
  objectives: QAObjective[];
  artifacts: QAArtifact[];
  notifications: QANotificationLog[];
  timezone: string | null;
  recentCoachOutputs: string[];
}): QAWarning[] {
  const out: QAWarning[] = [];
  const snap = input.snapshot;

  // --- impossible momentum states ---
  if (snap) {
    if (snap.momentum_score > 0 && snap.proofs_today === 0 && snap.streak_days === 0 && snap.hours_since_proof > 72) {
      out.push({ code: "MOMENTUM_PHANTOM", level: "error", message: "Score > 0 with no proofs in 72h+ — momentum has phantom inputs." });
    }
    if (snap.state === "elite" && snap.avg_quality < 5) {
      out.push({ code: "ELITE_LOW_QUALITY", level: "warn", message: `State 'elite' but avg quality is ${snap.avg_quality} — depth standard not met.` });
    }
    if (snap.state === "momentum" && snap.proofs_today === 0 && snap.hours_since_proof > 24) {
      out.push({ code: "STALE_MOMENTUM", level: "warn", message: "State 'momentum' but no proof in 24h — classifier may be stale." });
    }
    if (snap.freeze_tokens > 3) {
      out.push({ code: "FREEZE_CAP", level: "error", message: `Freeze tokens (${snap.freeze_tokens}) exceed cap of 3.` });
    }
    if (snap.streak_days > snap.longest_streak) {
      out.push({ code: "STREAK_INVARIANT", level: "error", message: "Current streak exceeds longest streak — invariant broken." });
    }
  }

  // --- inflated quality scores ---
  for (const a of input.artifacts) {
    if (typeof a.quality_score === "number") {
      if (a.quality_score > 10 || a.quality_score < 0) {
        out.push({ code: "QUALITY_OUT_OF_RANGE", level: "error", message: `Artifact quality_score ${a.quality_score} out of [0,10].` });
      }
      const len = (a.content ?? "").trim().length;
      if (a.quality_score >= 8 && len < 80) {
        out.push({ code: "QUALITY_INFLATED", level: "warn", message: `Artifact scored ${a.quality_score}/10 but content is ${len} chars — likely inflated.` });
      }
    }
  }

  // --- duplicate objectives (same title + same date, same commitment id) ---
  const dupKey = new Map<string, number>();
  for (const o of input.objectives) {
    const k = `${o.objective_date}|${o.title}|${o.proof_commitment_id ?? ""}`;
    dupKey.set(k, (dupKey.get(k) ?? 0) + 1);
  }
  for (const [k, n] of dupKey) {
    if (n > 1) out.push({ code: "DUPLICATE_OBJECTIVE", level: "warn", message: `Duplicate objective: ${k} (×${n})` });
  }

  // --- notification spam risk ---
  const last24h = input.notifications.filter((n) => Date.now() - new Date(n.sent_at).getTime() < 86_400_000);
  if (last24h.length > 2) {
    out.push({ code: "NOTIF_SPAM", level: "error", message: `${last24h.length} notifications in 24h — exceeds cap.` });
  }
  const dedupCounts = new Map<string, number>();
  for (const n of input.notifications) dedupCounts.set(n.dedup_key, (dedupCounts.get(n.dedup_key) ?? 0) + 1);
  for (const [k, n] of dedupCounts) if (n > 1) out.push({ code: "NOTIF_DEDUP", level: "warn", message: `Dedup key '${k}' fired ${n}×.` });

  // --- fake / shallow reflection content ---
  const completed = input.objectives.filter((o) => o.status === "completed" && o.completion_proof_text);
  const shallow = completed.filter((o) => (o.completion_proof_text ?? "").trim().length < 12).length;
  if (completed.length >= 3 && shallow / completed.length >= 0.5) {
    out.push({ code: "REFLECTION_SHALLOW", level: "warn", message: `${shallow}/${completed.length} reflections under 12 chars.` });
  }
  // identical reflections — likely copy-paste spam
  const seen = new Set<string>();
  for (const o of completed) {
    const key = (o.completion_proof_text ?? "").trim().toLowerCase();
    if (key && seen.has(key)) {
      out.push({ code: "REFLECTION_DUPLICATE", level: "warn", message: `Duplicate reflection text detected: "${key.slice(0, 40)}…"` });
      break;
    }
    if (key) seen.add(key);
  }

  // --- coach repetition ---
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const normed = input.recentCoachOutputs.map(norm).filter(Boolean);
  for (let i = 0; i < normed.length; i++) {
    for (let j = i + 1; j < normed.length; j++) {
      if (normed[i] && normed[i] === normed[j]) {
        out.push({ code: "COACH_REPEAT", level: "warn", message: "Coach emitted identical output twice in recent history." });
        i = normed.length; break;
      }
    }
  }

  // --- timezone fallback ---
  if (!input.timezone || input.timezone === "UTC") {
    out.push({ code: "TZ_FALLBACK", level: "info", message: "No timezone set — notifications use UTC windows." });
  }

  return out;
}