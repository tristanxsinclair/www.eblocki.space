export type LifeGameCopyKey =
  | "proofCheck"
  | "proofContent"
  | "requiredProofArtifact"
  | "submitProof"
  | "proofSubmitted"
  | "coach"
  | "gameforge"
  | "submitToLedger";

const PRIMARY_GAME_COPY: Record<LifeGameCopyKey, string> = {
  proofCheck: "Log Action",
  proofContent: "What did you do?",
  requiredProofArtifact: "Evidence required",
  submitProof: "File Action",
  proofSubmitted: "Action filed",
  coach: "Game Master",
  gameforge: "Arena",
  submitToLedger: "File Arena Result",
};

const EVIDENCE_COPY: Record<LifeGameCopyKey, string> = {
  proofCheck: "Proof Check",
  proofContent: "Proof content",
  requiredProofArtifact: "Required proof artifact",
  submitProof: "Submit proof",
  proofSubmitted: "Proof submitted",
  coach: "Coach",
  gameforge: "GameForge",
  submitToLedger: "Submit to Evidence Ledger",
};

/**
 * Contextual presentation copy only. Database, legal, release, and advanced
 * evidence surfaces keep precise proof terminology.
 */
export function lifeGameCopy(
  key: LifeGameCopyKey,
  context: "game" | "evidence" = "game",
): string {
  return context === "game" ? PRIMARY_GAME_COPY[key] : EVIDENCE_COPY[key];
}

export const LIFE_GAME_STATUS_COPY = {
  noArtifactNoXp: "NO ARTIFACT // NO XP",
  evidenceRequired: "Evidence required",
  questLocked: "Quest locked",
  verdictProtocol: "Verdict protocol",
  xpPending: "XP pending verification",
  filedToRunLog: "Filed to Run Log",
  openIntel: "Open Intel",
  enterArena: "Enter Arena",
} as const;
