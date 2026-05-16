import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildSnapshot, type MomentumSnapshot, type ProofSample } from "@/lib/eblocki/momentum";

/**
 * useMomentum
 *
 * Reads recent proof artifacts + any prior momentum row, derives the live
 * snapshot client-side, and upserts today's snapshot back to Supabase so
 * downstream consumers (coach, analytics, push) can read it without
 * recomputing.
 */
export function useMomentum() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<MomentumSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);

      const [{ data: proofRows }, { data: priorRows }] = await Promise.all([
        supabase
          .from("proof_artifacts")
          .select("created_at, quality_score, evidence_strength, domain")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("momentum_state")
          .select("longest_streak, freeze_tokens_earned_total, freeze_tokens_used_total")
          .eq("user_id", user.id)
          .order("state_date", { ascending: false })
          .limit(1),
      ]);

      const proofs: ProofSample[] = (proofRows ?? []) as ProofSample[];
      const prior = priorRows?.[0] ?? {
        longest_streak: 0,
        freeze_tokens_earned_total: 0,
        freeze_tokens_used_total: 0,
      };

      // Strongest domain — simple count.
      const counts = new Map<string, number>();
      for (const p of proofs) {
        if (!p.domain) continue;
        counts.set(p.domain, (counts.get(p.domain) ?? 0) + 1);
      }
      const strongest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const snap = buildSnapshot({
        proofs,
        prior: {
          longestStreak: prior.longest_streak,
          freezeTokensEarnedTotal: prior.freeze_tokens_earned_total,
          freezeTokensUsedTotal: prior.freeze_tokens_used_total,
        },
        strongestDomain: strongest,
      });

      setSnapshot(snap);

      // Best-effort persist — never blocks UI.
      void supabase.from("momentum_state").upsert(
        {
          user_id: user.id,
          state_date: todayISO,
          momentum_score: snap.momentum_score,
          streak_days: snap.streak_days,
          longest_streak: snap.longest_streak,
          freeze_tokens: snap.freeze_tokens,
          freeze_tokens_earned_total: Math.max(
            prior.freeze_tokens_earned_total,
            Math.floor(snap.longest_streak / 5),
          ),
          freeze_tokens_used_total: prior.freeze_tokens_used_total,
          state: snap.state,
          identity_signal: snap.identity_signal,
          last_proof_at: snap.last_proof_at,
          proofs_today: snap.proofs_today,
          resistance_overcome: snap.resistance_overcome,
          avg_quality: snap.avg_quality,
        },
        { onConflict: "user_id,state_date" },
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, loading, refresh };
}