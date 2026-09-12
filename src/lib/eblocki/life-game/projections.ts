import { levelThreshold, operatorTitle, rankFor } from "@/lib/eblocki/level-engine";
import { localDayKey, resolvedTimeZone } from "@/lib/eblocki/local-day";
import type {
  ActiveQuestView,
  CoachInteractionRow,
  CourtVerdictRow,
  DailyObjectiveRow,
  DomainLevelRow,
  IdentityLedgerRow,
  LifeGameHealth,
  LifeGameSnapshot,
  LifeGameSourceRows,
  LifeStatKey,
  LifeStatProjection,
  MomentumStateRow,
  OperatorLevelRow,
  ProofArtifactRow,
  ProofCommitmentRow,
  RunLogEntry,
  XpEventRow,
} from "./types";
import { isSafeLifeGameRecordId } from "./settlement";

export const STAT_DOMAIN_MAP: Record<Exclude<LifeStatKey, "discipline">, string[]> = {
  body: ["soccer"],
  mind: ["law", "psychology"],
  craft: ["sales", "finance", "eblocki"],
  social: ["life"],
};

const STAT_LABELS: Record<LifeStatKey, string> = {
  body: "Body",
  mind: "Mind",
  craft: "Craft",
  social: "Social",
  discipline: "Discipline",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const safeLevel = (value: number) => Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
const safeXp = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
const roundPercent = (value: number) => Math.round(clamp(value, 0, 100) * 10) / 10;

function fractionalDomainLevel(row: DomainLevelRow): number {
  const level = safeLevel(row.level);
  const progress = clamp(safeXp(row.xp_in_level) / levelThreshold(level), 0, 0.999);
  return level + progress;
}

function statFromDomain(domain: string | null | undefined): LifeStatKey | null {
  const normalised = domain?.toLowerCase();
  if (!normalised) return null;
  for (const [key, domains] of Object.entries(STAT_DOMAIN_MAP)) {
    if (domains.includes(normalised)) return key as LifeStatKey;
  }
  return normalised === "operator" ? "discipline" : null;
}

export function projectLifeStats(
  domainRows: DomainLevelRow[],
  operatorRow: OperatorLevelRow | null,
): LifeStatProjection[] {
  const projected = (Object.keys(STAT_DOMAIN_MAP) as Array<Exclude<LifeStatKey, "discipline">>).map(
    (key): LifeStatProjection => {
      const configuredDomains = STAT_DOMAIN_MAP[key];
      const rows = domainRows.filter((row) => configuredDomains.includes(row.domain.toLowerCase()));
      if (rows.length === 0) {
        return {
          key,
          label: STAT_LABELS[key],
          level: 1,
          progressPercent: 0,
          contributingDomains: [],
          source: "domain_levels",
          isProjection: true,
        };
      }

      const fractional =
        rows.reduce((sum, row) => sum + fractionalDomainLevel(row), 0) / rows.length;
      const level = Math.max(1, Math.floor(fractional));
      return {
        key,
        label: STAT_LABELS[key],
        level,
        progressPercent: roundPercent((fractional - level) * 100),
        contributingDomains: rows.map((row) => row.domain),
        source: "domain_levels",
        isProjection: true,
      };
    },
  );

  const operatorLevel = safeLevel(operatorRow?.level ?? 1);
  const operatorProgress = operatorRow
    ? roundPercent((safeXp(operatorRow.xp_in_level) / levelThreshold(operatorLevel)) * 100)
    : 0;

  projected.push({
    key: "discipline",
    label: STAT_LABELS.discipline,
    level: operatorLevel,
    progressPercent: operatorProgress,
    contributingDomains: ["operator"],
    source: "operator_level",
    isProjection: true,
  });

  return projected;
}

export function buildQuestLogActionHref(input: {
  commitmentId?: string | null;
  objectiveId?: string | null;
}): string {
  const params = new URLSearchParams({ source: "quest" });
  if (isSafeLifeGameRecordId(input.commitmentId)) params.set("contract", input.commitmentId);
  if (isSafeLifeGameRecordId(input.objectiveId)) params.set("objective", input.objectiveId);
  return `/proof?${params.toString()}`;
}

function objectiveToQuest(
  objective: DailyObjectiveRow,
  commitmentById: Map<string, ProofCommitmentRow>,
): ActiveQuestView {
  const commitment = objective.proof_commitment_id
    ? commitmentById.get(objective.proof_commitment_id) ?? null
    : null;
  return {
    id: objective.id,
    source: "daily_objective",
    title: objective.title,
    mode: objective.mode_id ?? commitment?.mode ?? null,
    kind: objective.kind,
    requiredArtifact: commitment?.required_artifact ?? objective.description,
    evidenceStandard: commitment?.evidence_standard ?? objective.why_it_matters,
    proofRequired: objective.proof_required,
    resistanceLevel: objective.resistance_level,
    logActionHref: buildQuestLogActionHref({
      commitmentId: objective.proof_commitment_id,
      objectiveId: objective.id,
    }),
  };
}

function commitmentToQuest(commitment: ProofCommitmentRow): ActiveQuestView {
  return {
    id: commitment.id,
    source: "proof_commitment",
    title: commitment.title,
    mode: commitment.mode,
    kind: "commitment",
    requiredArtifact: commitment.required_artifact,
    evidenceStandard: commitment.evidence_standard,
    proofRequired: true,
    resistanceLevel: null,
    logActionHref: buildQuestLogActionHref({ commitmentId: commitment.id }),
  };
}

export function projectQuests(
  objectives: DailyObjectiveRow[],
  commitments: ProofCommitmentRow[],
  today = localDayKey(),
): { activeQuest: ActiveQuestView | null; queuedQuests: ActiveQuestView[] } {
  const openObjectives = objectives
    .filter(
      (row) =>
        row.objective_date === today &&
        (row.status === "active" || row.status === "pending"),
    )
    .sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return a.position - b.position;
    });
  const pendingCommitments = commitments
    .filter((row) => row.status === "pending")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const commitmentById = new Map(pendingCommitments.map((row) => [row.id, row]));
  const objectiveCommitmentIds = new Set(
    openObjectives.map((row) => row.proof_commitment_id).filter((id): id is string => Boolean(id)),
  );

  const quests = [
    ...openObjectives.map((row) => objectiveToQuest(row, commitmentById)),
    ...pendingCommitments
      .filter((row) => !objectiveCommitmentIds.has(row.id))
      .map(commitmentToQuest),
  ];

  return {
    activeQuest: quests[0] ?? null,
    queuedQuests: quests.slice(1),
  };
}

function newestByProofId<T extends { proof_id: string | null; created_at: string }>(
  rows: T[],
): Map<string, T> {
  const result = new Map<string, T>();
  [...rows]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .forEach((row) => {
      if (row.proof_id && !result.has(row.proof_id)) result.set(row.proof_id, row);
    });
  return result;
}

function actionSyncState(
  xp: XpEventRow | undefined,
  verdict: CourtVerdictRow | undefined,
  health: LifeGameHealth,
): RunLogEntry["syncState"] {
  if (health.xpEvents === "error" || health.verdicts === "error") return "unavailable";
  return xp && verdict ? "complete" : "pending";
}

export function buildRunLog(input: {
  proofs: ProofArtifactRow[];
  xpEvents: XpEventRow[];
  verdicts: CourtVerdictRow[];
  ledger: IdentityLedgerRow[];
  health?: LifeGameHealth;
  limit?: number;
}): RunLogEntry[] {
  const health = input.health ?? {};
  const limit = Math.max(1, input.limit ?? 5);
  const xpByProof = newestByProofId(input.xpEvents);
  const verdictByProof = newestByProofId(input.verdicts);

  const actions: RunLogEntry[] = input.proofs.map((proof) => {
    const xp = xpByProof.get(proof.id);
    const verdict = verdictByProof.get(proof.id);
    return {
      kind: "action",
      id: proof.id,
      title: proof.title,
      stat: statFromDomain(proof.domain),
      createdAt: proof.created_at,
      evidenceStrength: proof.evidence_strength,
      courtVerdict: verdict?.verdict ?? null,
      xp: xp?.final_xp ?? null,
      syncState: actionSyncState(xp, verdict, health),
    };
  });

  const levelUps: RunLogEntry[] = input.ledger
    .filter(
      (row) =>
        row.kind === "escalation" &&
        /\blevel\s*up\b|\bL\d+\s*(?:→|->)\s*L\d+\b/i.test(row.summary),
    )
    .map((row) => ({
      kind: "level_up",
      id: row.id,
      title: `SYSTEM // ${row.summary}`,
      stat: statFromDomain(row.domain),
      createdAt: row.created_at,
      evidenceStrength: null,
      courtVerdict: row.verdict,
      xp: null,
      syncState: "complete",
    }));

  return [...actions, ...levelUps]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

function projectMomentum(row: MomentumStateRow | null): LifeGameSnapshot["momentum"] {
  if (!row) return null;
  return {
    score: clamp(row.momentum_score, 0, 100),
    streakDays: Math.max(0, row.streak_days),
    longestStreak: Math.max(0, row.longest_streak),
    proofsToday: Math.max(0, row.proofs_today),
    state: row.state,
  };
}

function projectMessages(rows: CoachInteractionRow[]) {
  return [...rows]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 3)
    .map((row) => ({
      id: row.id,
      mode: row.mode,
      directiveLabel: row.mode
        ? `${row.mode.replace(/[_-]+/g, " ")} directive`
        : "General directive",
      createdAt: row.created_at,
    }));
}

export function buildLifeGameSnapshot(
  rows: LifeGameSourceRows,
  health: LifeGameHealth,
  today = localDayKey(),
  timeZone = resolvedTimeZone(),
): LifeGameSnapshot {
  const level = safeLevel(rows.operator?.level ?? 1);
  const quests = projectQuests(rows.objectives, rows.commitments, today);

  return {
    clock: {
      localDate: today,
      timeZone,
      weekStartsOn: 1,
    },
    operator: {
      level,
      title: rows.operator?.title ?? operatorTitle(level),
      rank: rows.operator?.rank ?? rankFor(level),
      totalXp: safeXp(rows.operator?.total_xp ?? 0),
      xpInLevel: safeXp(rows.operator?.xp_in_level ?? 0),
      threshold: levelThreshold(level),
    },
    stats: projectLifeStats(rows.domains, rows.operator),
    ...quests,
    momentum: projectMomentum(rows.momentum),
    runLog: buildRunLog({
      proofs: rows.proofs,
      xpEvents: rows.xpEvents,
      verdicts: rows.verdicts,
      ledger: rows.ledger,
      health,
    }),
    recentGameMasterMessages: projectMessages(rows.coachInteractions),
    health,
  };
}
