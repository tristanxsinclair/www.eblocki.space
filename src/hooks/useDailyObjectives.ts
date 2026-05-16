import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normaliseModeKey, pickTemplatesForMode } from "@/lib/eblocki/mode-templates";

export type ObjectiveKind = "mission" | "streak_save" | "recovery" | "boss" | "quick_win";
export type ObjectiveStatus = "pending" | "active" | "completed" | "skipped" | "failed";

export interface DailyObjective {
  id: string;
  user_id: string;
  objective_date: string;
  title: string;
  description: string | null;
  mode_id: string | null;
  kind: ObjectiveKind;
  resistance_level: number;
  focus_minutes: number;
  reward_value: number;
  streak_impact: number;
  identity_alignment: number;
  proof_required: boolean;
  why_it_matters: string | null;
  status: ObjectiveStatus;
  completed_at: string | null;
  proof_artifact_id: string | null;
  proof_commitment_id: string | null;
  position: number;
  completion_proof_text: string | null;
  completion_hard_part: string | null;
  completion_upgrade: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Module-scoped guard so seeding cannot double-fire across hook instances. */
const seedingInFlight = new Map<string, Promise<void>>();

/**
 * Adaptive objective seeding rules:
 *  1. Pull any open proof commitments → become missions with resistance
 *     derived from seriousness markers.
 *  2. If no commitments exist yet, seed one quick_win to break inertia.
 *  3. If streak >= 2 and no proof today, inject a streak_save mission.
 *
 * Idempotent per (user, day): if any row exists for today this is a no-op.
 * Streak-save injection still runs on subsequent calls if no streak_save
 * row exists yet today AND the user is at risk.
 */
async function seedIfNeededInner(userId: string) {
  const date = todayISO();
  const { data: existing } = await supabase
    .from("daily_objectives")
    .select("id, kind, proof_commitment_id")
    .eq("user_id", userId)
    .eq("objective_date", date);
  const existingRows = existing ?? [];
  const hasAny = existingRows.length > 0;
  const existingCommitmentIds = new Set(
    existingRows.map((r) => r.proof_commitment_id).filter(Boolean) as string[],
  );
  const hasStreakSave = existingRows.some((r) => r.kind === "streak_save");

  const { data: pending } = await supabase
    .from("proof_commitments")
    .select("id, title, domain, mode, required_artifact, evidence_standard")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  // Active user mode — drives template-based seeding when no open
  // commitments exist.
  const { data: activeModes } = await supabase
    .from("user_modes")
    .select("mode_id, display_name, is_default")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1);
  const activeModeRaw = activeModes?.[0]?.mode_id ?? null;
  const modeKey = normaliseModeKey(activeModeRaw);

  type InsertRow = {
    user_id: string;
    objective_date: string;
    title: string;
    description?: string | null;
    mode_id?: string | null;
    kind: ObjectiveKind;
    resistance_level: number;
    focus_minutes: number;
    reward_value: number;
    streak_impact: number;
    identity_alignment: number;
    proof_required: boolean;
    why_it_matters?: string | null;
    status: ObjectiveStatus;
    proof_commitment_id?: string | null;
    position: number;
  };
  const rows: InsertRow[] = [];

  // Only seed mission/quick_win rows if no rows exist for today yet.
  if (!hasAny && pending && pending.length > 0) {
    pending.forEach((p, i) => {
      if (p.id && existingCommitmentIds.has(p.id)) return;
      const resistance = Math.min(5, 2 + Math.floor((p.title?.length ?? 0) / 60));
      rows.push({
        user_id: userId,
        objective_date: date,
        title: p.title ?? "Open proof contract",
        description: p.required_artifact ?? null,
        mode_id: p.mode ?? null,
        kind: "mission",
        resistance_level: resistance,
        focus_minutes: 25 + resistance * 10,
        reward_value: 10 + resistance * 5,
        streak_impact: 1,
        identity_alignment: 4,
        proof_required: true,
        why_it_matters: p.evidence_standard ?? "Closing this proof reinforces the operator identity.",
        status: "pending",
        proof_commitment_id: p.id,
        position: i,
      });
    });
  } else if (!hasAny) {
    // Mode-aware seeding — pull 3 templates from the active mode bank.
    const templates = pickTemplatesForMode(modeKey, 3, date);
    templates.forEach((t, i) => {
      rows.push({
        user_id: userId,
        objective_date: date,
        title: t.title,
        description: `${t.description}\n\nProof required: ${t.required_artifact}`,
        mode_id: activeModeRaw ?? modeKey,
        kind: i === 0 ? "quick_win" : "mission",
        resistance_level: t.resistance_level,
        focus_minutes: t.focus_minutes,
        reward_value: t.reward_value,
        streak_impact: t.streak_impact,
        identity_alignment: t.identity_alignment,
        proof_required: true,
        why_it_matters: t.why_it_matters,
        status: "pending",
        position: i,
      });
    });
  }

  // Streak save injection — runs even on later refreshes if not yet present.
  const { data: momentum } = await supabase
    .from("momentum_state")
    .select("streak_days, proofs_today")
    .eq("user_id", userId)
    .order("state_date", { ascending: false })
    .limit(1);
  const ms = momentum?.[0];
  if (!hasStreakSave && ms && ms.streak_days >= 2 && ms.proofs_today === 0) {
    rows.push({
      user_id: userId,
      objective_date: date,
      title: `Preserve ${ms.streak_days}-day streak`,
      description: "One proof artifact before the day ends.",
      kind: "streak_save",
      resistance_level: 3,
      focus_minutes: 30,
      reward_value: 30,
      streak_impact: 2,
      identity_alignment: 5,
      proof_required: true,
      why_it_matters: "Identity is built by what you defend on hard days.",
      status: "pending",
      position: existingRows.length + rows.length,
    });
  }

  if (rows.length > 0) {
    await supabase.from("daily_objectives").insert(rows);
  }
}

async function seedIfNeeded(userId: string) {
  const key = `${userId}:${todayISO()}`;
  const existing = seedingInFlight.get(key);
  if (existing) return existing;
  const p = seedIfNeededInner(userId).finally(() => seedingInFlight.delete(key));
  seedingInFlight.set(key, p);
  return p;
}

export function useDailyObjectives() {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<DailyObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      await seedIfNeeded(user.id);
      const { data } = await supabase
        .from("daily_objectives")
        .select("*")
        .eq("user_id", user.id)
        .eq("objective_date", todayISO())
        .order("position", { ascending: true });
      setObjectives((data ?? []) as DailyObjective[]);
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const complete = useCallback(
    async (
      id: string,
      reflection?: { proof: string; hard: string | null; upgrade: string | null },
    ) => {
      // Optimistic update — UI feels instant, refresh syncs truth.
      setObjectives((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, status: "completed", completed_at: new Date().toISOString() }
            : o,
        ),
      );
      const patch = {
        status: "completed" as const,
        completed_at: new Date().toISOString(),
        ...(reflection
          ? {
              completion_proof_text: reflection.proof,
              completion_hard_part: reflection.hard ?? undefined,
              completion_upgrade: reflection.upgrade ?? undefined,
            }
          : {}),
      };
      const { error } = await supabase
        .from("daily_objectives")
        .update(patch)
        .eq("id", id)
        .eq("status", "pending"); // idempotency guard — no double-complete
      if (error) {
        // Roll back optimistic update on failure.
        await refresh();
        throw error;
      }
      await refresh();
    },
    [refresh],
  );

  const skip = useCallback(
    async (id: string) => {
      setObjectives((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "skipped" } : o)),
      );
      await supabase.from("daily_objectives").update({ status: "skipped" }).eq("id", id);
      await refresh();
    },
    [refresh],
  );

  return { objectives, loading, refresh, complete, skip };
}