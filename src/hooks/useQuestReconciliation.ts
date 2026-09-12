import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { findQuestRepairCandidates } from "@/lib/eblocki/life-game";

/**
 * Repairs only a previously proven partial transaction: a commitment already
 * owns an artifact, while its linked daily objective is still open.
 *
 * This is deliberately separate from the read-only life-game snapshot hook.
 * It never creates an artifact, verdict, XP event, or level record.
 */
export function useQuestReconciliation() {
  const { user } = useAuth();
  const [repairedCount, setRepairedCount] = useState<number | null>(null);
  const requestId = useRef(0);

  const reconcile = useCallback(async () => {
    if (!user) {
      setRepairedCount(0);
      return 0;
    }

    const currentRequest = ++requestId.current;
    const { data: objectives, error: objectiveError } = await supabase
      .from("daily_objectives")
      .select("id, proof_commitment_id")
      .eq("user_id", user.id)
      .in("status", ["pending", "active"])
      .not("proof_commitment_id", "is", null)
      .order("objective_date", { ascending: false })
      .limit(50);

    if (objectiveError || !objectives?.length) {
      if (currentRequest === requestId.current) setRepairedCount(0);
      return 0;
    }

    const commitmentIds = objectives
      .map((objective) => objective.proof_commitment_id)
      .filter((id): id is string => Boolean(id));
    const { data: commitments, error: commitmentError } = await supabase
      .from("proof_commitments")
      .select("id, proof_artifact_id")
      .eq("user_id", user.id)
      .in("id", commitmentIds)
      .not("proof_artifact_id", "is", null);

    if (commitmentError || !commitments?.length) {
      if (currentRequest === requestId.current) setRepairedCount(0);
      return 0;
    }

    const candidates = findQuestRepairCandidates(objectives, commitments);
    const completedAt = new Date().toISOString();
    const results = await Promise.allSettled(
      candidates.map((candidate) =>
        supabase
          .from("daily_objectives")
          .update({
            status: "completed",
            proof_artifact_id: candidate.proofArtifactId,
            completed_at: completedAt,
          })
          .eq("id", candidate.objectiveId)
          .eq("user_id", user.id)
          .in("status", ["pending", "active"])
          .select("id")
          .maybeSingle(),
      ),
    );
    const repaired = results.filter(
      (result) =>
        result.status === "fulfilled" &&
        !result.value.error &&
        Boolean(result.value.data),
    ).length;

    if (currentRequest === requestId.current) setRepairedCount(repaired);
    return repaired;
  }, [user]);

  useEffect(() => {
    void reconcile();
    return () => {
      requestId.current += 1;
    };
  }, [reconcile]);

  return { reconcile, repairedCount };
}
