import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Adaptive objective seeding rules:
 *  1. Pull any open proof commitments → become missions with resistance
 *     derived from seriousness markers.
 *  2. If no commitments exist yet, seed one quick_win to break inertia.
 *  3. If streak >= 2 and no proof today, inject a streak_save mission.
 */
async function seedIfNeeded(userId: string) {
  const date = todayISO();
  const { data: existing } = await supabase
    .from("daily_objectives")
    .select("id")
    .eq("user_id", userId)
    .eq("objective_date", date)
    .limit(1);
  if (existing && existing.length > 0) return;

  const { data: pending } = await supabase
    .from("proof_commitments")
    .select("id, title, domain, mode, required_artifact, evidence_standard")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  const rows: Partial<DailyObjective>[] = [];

  if (pending && pending.length > 0) {
    pending.forEach((p, i) => {
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
  } else {
    rows.push({
      user_id: userId,
      objective_date: date,
      title: "Ship one artifact in under 30 minutes",
      description: "Pick the smallest concrete output that proves you started.",
      kind: "quick_win",
      resistance_level: 2,
      focus_minutes: 25,
      reward_value: 15,
      streak_impact: 1,
      identity_alignment: 3,
      proof_required: true,
      why_it_matters: "Inertia is the enemy. One artifact converts intention into pattern.",
      status: "pending",
      position: 0,
    });
  }

  // Streak save injection
  const { data: momentum } = await supabase
    .from("momentum_state")
    .select("streak_days, proofs_today")
    .eq("user_id", userId)
    .order("state_date", { ascending: false })
    .limit(1);
  const ms = momentum?.[0];
  if (ms && ms.streak_days >= 2 && ms.proofs_today === 0) {
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
      position: rows.length,
    });
  }

  if (rows.length > 0) {
    await supabase.from("daily_objectives").insert(rows);
  }
}

export function useDailyObjectives() {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<DailyObjective[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
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
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const complete = useCallback(
    async (id: string) => {
      await supabase
        .from("daily_objectives")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const skip = useCallback(
    async (id: string) => {
      await supabase.from("daily_objectives").update({ status: "skipped" }).eq("id", id);
      await refresh();
    },
    [refresh],
  );

  return { objectives, loading, refresh, complete, skip };
}