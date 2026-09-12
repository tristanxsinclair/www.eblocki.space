import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localDayKey } from "@/lib/eblocki/local-day";
import {
  personaliseQuests,
  summariseQuestSignals,
  type PersonalisedQuest,
  type QuestBrief,
  type QuestPersonalisationInput,
} from "@/lib/eblocki/quest-personalisation";
import type { CalibrationFlag } from "@/lib/eblocki/calibration";

export interface QuestDirectorState {
  quests: PersonalisedQuest[];
  brief: QuestBrief | null;
  loading: boolean;
  /** Honest failure state — never silently show a generic day as personalised. */
  degraded: boolean;
  refresh: () => Promise<void>;
}

/**
 * Reads the operator's own OS configuration and evidence history, then
 * derives today's quest set deterministically. Read-only: seeding rows is
 * still owned by useDailyObjectives.
 */
export function useQuestDirector(): QuestDirectorState {
  const { user } = useAuth();
  const [quests, setQuests] = useState<PersonalisedQuest[]>([]);
  const [brief, setBrief] = useState<QuestBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setQuests([]);
      setBrief(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [modes, levels, proofs, momentum] = await Promise.all([
        supabase
          .from("user_modes")
          .select(
            "mode_id, display_name, is_default, strong_evidence_examples, proof_examples, keywords",
          )
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("is_default", { ascending: false })
          .limit(4),
        supabase
          .from("domain_levels")
          .select("domain, level, next_requirement, current_standard, updated_at")
          .eq("user_id", user.id),
        supabase
          .from("proof_artifacts")
          .select(
            "title, domain, quality_score, next_upgrade, created_at, transfer_flag, pressure_flag",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("momentum_state")
          .select("streak_days, avg_quality, proofs_today, state")
          .eq("user_id", user.id)
          .order("state_date", { ascending: false })
          .limit(1),
      ]);

      const anyError = Boolean(modes.error || levels.error || proofs.error || momentum.error);
      const momentumRow = momentum.data?.[0] ?? null;
      const flags: CalibrationFlag[] = [];
      const streak = momentumRow?.streak_days ?? 0;
      const avg = momentumRow?.avg_quality ?? 0;
      if (streak >= 5 && avg > 0 && avg < 4) flags.push("inflated_streak_low_quality");

      const input: QuestPersonalisationInput = {
        dayKey: localDayKey(),
        modes: modes.data ?? [],
        domainLevels: levels.data ?? [],
        recentProofs: proofs.data ?? [],
        momentum: momentumRow,
        calibrationFlags: flags,
        maxQuests: 3,
      };

      setQuests(personaliseQuests(input));
      setBrief(summariseQuestSignals(input));
      setDegraded(anyError);
    } catch {
      setQuests([]);
      setBrief(null);
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { quests, brief, loading, degraded, refresh };
}
