import type { Tables } from "@/integrations/supabase/types";

export type LifeStatKey =
  | "body"
  | "mind"
  | "craft"
  | "social"
  | "discipline";

export interface LifeStatProjection {
  key: LifeStatKey;
  label: string;
  level: number;
  progressPercent: number;
  contributingDomains: string[];
  source: "domain_levels" | "operator_level";
  isProjection: true;
}

export interface ActiveQuestView {
  id: string;
  source: "daily_objective" | "proof_commitment";
  title: string;
  mode: string | null;
  kind: string;
  requiredArtifact: string | null;
  evidenceStandard: string | null;
  proofRequired: boolean;
  resistanceLevel: number | null;
  logActionHref: string;
}

export interface RunLogEntry {
  kind: "action" | "level_up" | "system";
  id: string;
  title: string;
  stat: LifeStatKey | null;
  createdAt: string;
  evidenceStrength: string | null;
  courtVerdict: string | null;
  xp: number | null;
  syncState: "complete" | "pending" | "unavailable";
}

export interface LifeGameSnapshot {
  clock: {
    localDate: string;
    timeZone: string;
    weekStartsOn: 0 | 1 | 6;
  };
  operator: {
    level: number;
    title: string;
    rank: string;
    totalXp: number;
    xpInLevel: number;
    threshold: number;
  };
  stats: LifeStatProjection[];
  activeQuest: ActiveQuestView | null;
  queuedQuests: ActiveQuestView[];
  momentum: {
    score: number;
    streakDays: number;
    longestStreak: number;
    proofsToday: number;
    state: string;
  } | null;
  runLog: RunLogEntry[];
  recentGameMasterMessages: Array<{
    id: string;
    mode: string | null;
    directiveLabel: string;
    createdAt: string;
  }>;
  health: Record<string, "ok" | "empty" | "error">;
}

export type OperatorLevelRow = Pick<
  Tables<"operator_level">,
  "level" | "rank" | "title" | "total_xp" | "xp_in_level"
>;
export type DomainLevelRow = Pick<
  Tables<"domain_levels">,
  "domain" | "level" | "xp_in_level"
>;
export type DailyObjectiveRow = Pick<
  Tables<"daily_objectives">,
  | "id"
  | "objective_date"
  | "title"
  | "description"
  | "mode_id"
  | "kind"
  | "resistance_level"
  | "proof_required"
  | "why_it_matters"
  | "status"
  | "proof_commitment_id"
  | "position"
>;
export type ProofCommitmentRow = Pick<
  Tables<"proof_commitments">,
  | "id"
  | "title"
  | "mode"
  | "status"
  | "required_artifact"
  | "evidence_standard"
  | "proof_artifact_id"
  | "created_at"
>;
export type ProofArtifactRow = Pick<
  Tables<"proof_artifacts">,
  "id" | "title" | "domain" | "created_at" | "evidence_strength"
>;
export type CourtVerdictRow = Pick<
  Tables<"court_verdicts">,
  "proof_id" | "created_at" | "verdict"
>;
export type XpEventRow = Pick<
  Tables<"xp_events">,
  "id" | "proof_id" | "created_at" | "final_xp"
>;
export type IdentityLedgerRow = Pick<
  Tables<"identity_ledger">,
  "id" | "proof_id" | "domain" | "kind" | "summary" | "verdict" | "created_at"
>;
export type MomentumStateRow = Pick<
  Tables<"momentum_state">,
  "momentum_score" | "streak_days" | "longest_streak" | "proofs_today" | "state"
>;
export type CoachInteractionRow = Pick<
  Tables<"coach_interactions">,
  "id" | "mode" | "created_at"
>;

export interface LifeGameSourceRows {
  operator: OperatorLevelRow | null;
  domains: DomainLevelRow[];
  objectives: DailyObjectiveRow[];
  commitments: ProofCommitmentRow[];
  proofs: ProofArtifactRow[];
  verdicts: CourtVerdictRow[];
  xpEvents: XpEventRow[];
  ledger: IdentityLedgerRow[];
  momentum: MomentumStateRow | null;
  coachInteractions: CoachInteractionRow[];
}

export type LifeGameHealth = Record<string, "ok" | "empty" | "error">;
