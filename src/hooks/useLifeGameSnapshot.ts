import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { localDayKey, resolvedTimeZone } from "@/lib/eblocki/local-day";
import {
  buildLifeGameSnapshot,
  type CoachInteractionRow,
  type CourtVerdictRow,
  type DailyObjectiveRow,
  type DomainLevelRow,
  type IdentityLedgerRow,
  type LifeGameHealth,
  type LifeGameSnapshot,
  type MomentumStateRow,
  type OperatorLevelRow,
  type ProofArtifactRow,
  type ProofCommitmentRow,
  type XpEventRow,
} from "@/lib/eblocki/life-game";

type SliceHealth = "ok" | "empty" | "error";

interface ArraySlice<T> {
  data: T[];
  health: SliceHealth;
}

interface SingleSlice<T> {
  data: T | null;
  health: SliceHealth;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

async function loadArraySlice<T>(
  request: PromiseLike<QueryResult<T[]>>,
): Promise<ArraySlice<T>> {
  try {
    const { data, error } = await request;
    if (error) return { data: [], health: "error" };
    return { data: data ?? [], health: data && data.length > 0 ? "ok" : "empty" };
  } catch {
    return { data: [], health: "error" };
  }
}

async function loadSingleSlice<T>(
  request: PromiseLike<QueryResult<T>>,
): Promise<SingleSlice<T>> {
  try {
    const { data, error } = await request;
    if (error) return { data: null, health: "error" };
    return { data: data ?? null, health: data ? "ok" : "empty" };
  } catch {
    return { data: null, health: "error" };
  }
}

export interface UseLifeGameSnapshotResult {
  snapshot: LifeGameSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export function useLifeGameSnapshot(): UseLifeGameSnapshotResult {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<LifeGameSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const realtimeRefreshTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setSnapshot(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const currentRequest = ++requestId.current;
    setRefreshing(true);
    const profile = await loadSingleSlice<{ timezone: string | null }>(
      supabase
        .from("user_onboarding_profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    const timeZone = profile.data?.timezone || resolvedTimeZone();
    const today = localDayKey(new Date(), timeZone);

    const [
      operator,
      domains,
      objectives,
      commitments,
      proofs,
      verdicts,
      xpEvents,
      ledger,
      momentum,
      coachInteractions,
    ] = await Promise.all([
      loadSingleSlice<OperatorLevelRow>(
        supabase
          .from("operator_level")
          .select("level, rank, title, total_xp, xp_in_level")
          .eq("user_id", user.id)
          .maybeSingle(),
      ),
      loadArraySlice<DomainLevelRow>(
        supabase
          .from("domain_levels")
          .select("domain, level, xp_in_level")
          .eq("user_id", user.id),
      ),
      loadArraySlice<DailyObjectiveRow>(
        supabase
          .from("daily_objectives")
          .select(
            "id, objective_date, title, description, mode_id, kind, resistance_level, proof_required, why_it_matters, status, proof_commitment_id, position",
          )
          .eq("user_id", user.id)
          .eq("objective_date", today)
          .order("position", { ascending: true }),
      ),
      loadArraySlice<ProofCommitmentRow>(
        supabase
          .from("proof_commitments")
          .select("id, title, mode, status, required_artifact, evidence_standard, proof_artifact_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(16),
      ),
      loadArraySlice<ProofArtifactRow>(
        supabase
          .from("proof_artifacts")
          .select("id, title, domain, created_at, evidence_strength")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ),
      loadArraySlice<CourtVerdictRow>(
        supabase
          .from("court_verdicts")
          .select("proof_id, created_at, verdict")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(24),
      ),
      loadArraySlice<XpEventRow>(
        supabase
          .from("xp_events")
          .select("id, proof_id, created_at, final_xp")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(24),
      ),
      loadArraySlice<IdentityLedgerRow>(
        supabase
          .from("identity_ledger")
          .select("id, proof_id, domain, kind, summary, verdict, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(24),
      ),
      loadSingleSlice<MomentumStateRow>(
        supabase
          .from("momentum_state")
          .select("momentum_score, streak_days, longest_streak, proofs_today, state")
          .eq("user_id", user.id)
          .order("state_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      loadArraySlice<CoachInteractionRow>(
        supabase
          .from("coach_interactions")
          .select("id, mode, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ),
    ]);

    if (currentRequest !== requestId.current) return;

    const health: LifeGameHealth = {
      operator: operator.health,
      domains: domains.health,
      objectives: objectives.health,
      commitments: commitments.health,
      proofs: proofs.health,
      verdicts: verdicts.health,
      xpEvents: xpEvents.health,
      ledger: ledger.health,
      momentum: momentum.health,
      coachInteractions: coachInteractions.health,
    };

    setSnapshot(
      buildLifeGameSnapshot(
        {
          operator: operator.data,
          domains: domains.data,
          objectives: objectives.data,
          commitments: commitments.data,
          proofs: proofs.data,
          verdicts: verdicts.data,
          xpEvents: xpEvents.data,
          ledger: ledger.data,
          momentum: momentum.data,
          coachInteractions: coachInteractions.data,
        },
        health,
        today,
        timeZone,
      ),
    );
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const scheduleRefresh = () => {
      if (realtimeRefreshTimer.current !== null) {
        window.clearTimeout(realtimeRefreshTimer.current);
      }
      realtimeRefreshTimer.current = window.setTimeout(() => {
        realtimeRefreshTimer.current = null;
        void refresh();
      }, 180);
    };

    const filter = `user_id=eq.${user.id}`;
    const channel = supabase
      .channel(`life-game-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proof_artifacts", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "court_verdicts", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "xp_events", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "operator_level", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "domain_levels", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "identity_ledger", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_objectives", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "proof_commitments", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "momentum_state", filter }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "coach_interactions", filter }, scheduleRefresh)
      .subscribe();

    return () => {
      if (realtimeRefreshTimer.current !== null) {
        window.clearTimeout(realtimeRefreshTimer.current);
        realtimeRefreshTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  return { snapshot, loading, refreshing, refresh };
}
