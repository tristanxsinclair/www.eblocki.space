import { supabase } from "@/integrations/supabase/client";
import type { SystemForgeDraft, SystemForgeRepEvaluation } from "./system-forge";
import type { Json } from "@/integrations/supabase/types";

export interface CustomSystemRow {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  goal: string;
  outcome: string;
  bottleneck: string;
  available_minutes_per_day: number;
  skills: unknown;
  daily_loop: string;
  weekly_structure: unknown;
  minimum_viable_rep: string;
  proof_artifacts: unknown;
  scoring_rubric: unknown;
  progression_levels: unknown;
  review_cycle: string;
  first_command: string;
  active_command: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemRepRow {
  id: string;
  user_id: string;
  system_id: string;
  command: string;
  artifact_type: string;
  proof_content: string | null;
  self_score: number | null;
  score: number | null;
  verdict: string | null;
  weakness: string | null;
  next_upgrade: string | null;
  created_at: string;
}

export async function fetchActiveSystem(userId: string): Promise<CustomSystemRow | null> {
  const { data, error } = await supabase
    .from("custom_systems")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CustomSystemRow | null) ?? null;
}

export async function createSystem(
  userId: string,
  draft: SystemForgeDraft,
): Promise<CustomSystemRow> {
  // Deactivate any prior active systems for this user.
  await supabase
    .from("custom_systems")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("custom_systems")
    .insert({
      user_id: userId,
      name: draft.name,
      domain: draft.domain,
      goal: draft.goal,
      outcome: draft.outcome,
      bottleneck: draft.bottleneck,
      available_minutes_per_day: draft.availableMinutesPerDay,
      skills: draft.skills as unknown as Json,
      daily_loop: draft.dailyLoop,
      weekly_structure: draft.weeklyStructure as unknown as Json,
      minimum_viable_rep: draft.minimumViableRep,
      proof_artifacts: draft.proofArtifacts as unknown as Json,
      scoring_rubric: draft.scoringRubric as unknown as Json,
      progression_levels: draft.progressionLevels as unknown as Json,
      review_cycle: draft.reviewCycle,
      first_command: draft.firstCommand,
      active_command: draft.activeCommand,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomSystemRow;
}

export async function submitRep(input: {
  userId: string;
  systemId: string;
  command: string;
  artifactType: string;
  proofContent: string;
  selfScore: number | null;
  evaluation: SystemForgeRepEvaluation;
}): Promise<SystemRepRow> {
  const { data, error } = await supabase
    .from("system_reps")
    .insert({
      user_id: input.userId,
      system_id: input.systemId,
      command: input.command,
      artifact_type: input.artifactType,
      proof_content: input.proofContent,
      self_score: input.selfScore,
      score: input.evaluation.score,
      verdict: input.evaluation.verdict,
      weakness: input.evaluation.weakness,
      next_upgrade: input.evaluation.nextUpgrade,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SystemRepRow;
}

export async function listRecentReps(
  systemId: string,
  limit = 5,
): Promise<SystemRepRow[]> {
  const { data, error } = await supabase
    .from("system_reps")
    .select("*")
    .eq("system_id", systemId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as SystemRepRow[] | null) ?? [];
}