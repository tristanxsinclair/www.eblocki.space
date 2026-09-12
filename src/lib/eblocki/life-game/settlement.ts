import type { LifeGameSnapshot, LifeStatKey } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EvidenceSettlementState = "locating" | "pending" | "unavailable" | "settled";

export interface EvidenceSettlement {
  artifactId: string;
  state: EvidenceSettlementState;
  title: string | null;
  stat: LifeStatKey | null;
  evidenceStrength: string | null;
  courtVerdict: string | null;
  xp: number | null;
  createdAt: string | null;
}

export function isSafeLifeGameRecordId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function buildLifeGameSettlementHref(artifactId: string): string {
  if (!isSafeLifeGameRecordId(artifactId)) return "/dashboard";
  const params = new URLSearchParams({ result: artifactId });
  return `/dashboard?${params.toString()}`;
}

/**
 * Projects a result only from an entry already present in the authoritative
 * snapshot. The ID selects a row; it never supplies title, verdict, or XP.
 */
export function projectEvidenceSettlement(
  snapshot: LifeGameSnapshot,
  artifactId: string,
): EvidenceSettlement {
  const entry = snapshot.runLog.find(
    (candidate) => candidate.kind === "action" && candidate.id === artifactId,
  );

  if (!entry) {
    return {
      artifactId,
      state: "locating",
      title: null,
      stat: null,
      evidenceStrength: null,
      courtVerdict: null,
      xp: null,
      createdAt: null,
    };
  }

  const state: EvidenceSettlementState =
    entry.syncState === "unavailable"
      ? "unavailable"
      : entry.syncState === "complete" && entry.xp !== null && entry.courtVerdict
        ? "settled"
        : "pending";

  return {
    artifactId,
    state,
    title: entry.title,
    stat: entry.stat,
    evidenceStrength: entry.evidenceStrength,
    courtVerdict: entry.courtVerdict,
    xp: entry.xp,
    createdAt: entry.createdAt,
  };
}
