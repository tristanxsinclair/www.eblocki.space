import type { ProofArtifactLike, VerdictLike } from "./temporal-engine";

export type TemporalRisk =
  | "no_artifact_drift"
  | "shallow_proof_loop"
  | "domain_neglect"
  | "academic_displacement"
  | "overload_spiral"
  | "low_energy_decay"
  | "identity_inflation"
  | "streak_without_depth"
  | "recovery_fragility"
  | "none_detected";

export type TemporalPath =
  | "current"
  | "corrected"
  | "decay"
  | "escalation";

export type TemporalHorizon =
  | "24h"
  | "7d"
  | "30d"
  | "90d"
  | "1y";

export type TemporalEvidenceSnapshot = {
  proofCount: number;
  averageProofQuality: number | null;
  strongestDomain: string | null;
  neglectedDomains: string[];
  recentCourtVerdicts: string[];
  recentAdversarialRisks: string[];
  stateTrend: string[];
  interventionFollowThroughRate: number | null;
  dataQuality: "empty" | "thin" | "usable" | "strong";
};

export type CounterfactualPath = {
  path: TemporalPath;
  summary: string;
  expectedChange: number;
  confidence: number;
  evidence: string[];
  userActionRequired?: string;
};

export type DisconfirmingProof = {
  claim: string;
  proofThatWouldDisproveIt: string;
};

export type FutureScene = {
  horizon: TemporalHorizon;
  pathType: TemporalPath;
  scene: string;
  evidenceSource: string[];
  behaviouralMechanism: string;
  likelyConsequence: string;
  proofThatChangesPath: string;
  confidence: "low" | "medium" | "high";
  uncertaintyNote: string;
  disconfirmingProof: string;
};

export type TemporalForecast = {
  id: string;
  userId: string;
  generatedAt: string;
  horizon: TemporalHorizon;
  primaryRisk: TemporalRisk;
  confidence: number;
  uncertaintyRange: [number, number];
  currentPath: CounterfactualPath;
  correctedPath: CounterfactualPath;
  decayPath: CounterfactualPath;
  escalationPath: CounterfactualPath;
  evidenceSnapshot: TemporalEvidenceSnapshot;
  futureScene: FutureScene;
  proofRequired: string;
  blockedAction: string;
  disconfirmingProof: DisconfirmingProof[];
  calibrationStatus: "pending" | "calibrated" | "insufficient_evidence";
};

export type TemporalForecastInput = {
  userId: string;
  horizon: TemporalHorizon;
  proofs: readonly ProofArtifactLike[] | readonly unknown[];
  courtVerdicts?: readonly VerdictLike[] | readonly unknown[];
  adversarialRisks?: readonly string[];
  stateTrend?: readonly string[];
  activeDomains?: readonly string[];
  priorityDomains?: readonly string[];
  generatedAt?: string;
};

type UnknownRecord = Record<string, unknown>;

type ProofSignal = {
  domain: string | null;
  quality: number | null;
  strength: string | null;
  level: string | null;
  recent: boolean;
  strong: boolean;
};

const DAY_MS = 86_400_000;
const RECENT_WINDOW_MS = 30 * DAY_MS;
const HIGH_LEVELS = new Set(["depth", "pressure", "transfer", "identity"]);
const SHALLOW_LEVELS = new Set(["contact", "output"]);

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function readString(record: UnknownRecord | null, keys: readonly string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readNumber(record: UnknownRecord | null, keys: readonly string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function readBoolean(record: UnknownRecord | null, keys: readonly string[]): boolean {
  if (!record) return false;
  return keys.some((key) => record[key] === true);
}

function normaliseToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum = 0, maximum = 0.9): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function uniqueNormalised(values: readonly string[] | undefined): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values ?? []) {
    if (typeof value !== "string" || !value.trim()) continue;
    const normalised = normaliseToken(value);
    if (!seen.has(normalised)) {
      seen.add(normalised);
      result.push(normalised);
    }
  }
  return result;
}

function safeSignals(
  values: readonly unknown[] | undefined,
  recordKeys: readonly string[],
  limit = 12,
): string[] {
  const result: string[] = [];
  for (const value of values ?? []) {
    const direct = typeof value === "string" ? value.trim() : null;
    const candidate = direct || readString(asRecord(value), recordKeys);
    if (!candidate) continue;
    result.push(candidate.slice(0, 240));
    if (result.length >= limit) break;
  }
  return result;
}

function qualityFromStrength(strength: string | null): number | null {
  switch (normaliseToken(strength ?? "")) {
    case "elite":
    case "accepted_elite":
      return 10;
    case "strong":
    case "accepted_strong":
      return 8;
    case "moderate":
    case "useful":
    case "accepted":
      return 5;
    case "weak":
    case "minimum":
    case "shallow":
    case "rejected":
      return 2;
    default:
      return null;
  }
}

function levelFromRecord(record: UnknownRecord | null): string | null {
  if (!record) return null;
  if (readBoolean(record, ["transfer_flag", "transferFlag"])) return "transfer";
  if (readBoolean(record, ["pressure_flag", "pressureFlag"])) return "pressure";

  const stringLevel = readString(record, [
    "proof_level",
    "proofLevel",
    "artifact_level",
    "artifactLevel",
    "level",
  ]);
  if (stringLevel) {
    const normalised = normaliseToken(stringLevel);
    if (normalised.includes("identity")) return "identity";
    if (normalised.includes("transfer")) return "transfer";
    if (normalised.includes("pressure")) return "pressure";
    if (normalised.includes("depth")) return "depth";
    if (normalised.includes("output")) return "output";
    if (normalised.includes("contact")) return "contact";
  }

  const tier = readNumber(record, ["proof_tier", "proofTier", "tier"]);
  if (tier === null) return null;
  if (tier >= 5) return "identity";
  if (tier >= 4) return "transfer";
  if (tier >= 3) return "depth";
  if (tier >= 2) return "output";
  return "contact";
}

function proofSignals(input: TemporalForecastInput): ProofSignal[] {
  const anchorMs = Date.parse(input.generatedAt ?? "");
  const nowMs = Number.isFinite(anchorMs) ? anchorMs : Date.now();

  return input.proofs.map((proof) => {
    const record = asRecord(proof);
    const domainValue = readString(record, [
      "domain",
      "proof_domain",
      "proofDomain",
      "category",
      "area",
    ]);
    const domain = domainValue ? normaliseToken(domainValue) : null;
    const rawQuality = readNumber(record, [
      "quality_score",
      "qualityScore",
      "quality",
      "score",
      "proof_quality",
      "proofQuality",
    ]);
    const strengthValue = readString(record, [
      "evidence_strength",
      "evidenceStrength",
      "strength",
      "verdict",
    ]);
    const strength = strengthValue ? normaliseToken(strengthValue) : null;
    const quality =
      rawQuality !== null && rawQuality >= 0 && rawQuality <= 10
        ? rawQuality
        : qualityFromStrength(strength);
    const createdAt = readString(record, [
      "created_at",
      "createdAt",
      "submitted_at",
      "submittedAt",
      "generated_at",
      "generatedAt",
    ]);
    const createdMs = createdAt ? Date.parse(createdAt) : Number.NaN;
    const ageMs = nowMs - createdMs;
    const recent = !createdAt || !Number.isFinite(createdMs)
      ? true
      : ageMs >= 0 && ageMs <= RECENT_WINDOW_MS;
    const strong =
      (quality !== null && quality >= 7) ||
      ["strong", "elite", "accepted_strong", "accepted_elite"].includes(strength ?? "");

    return {
      domain,
      quality,
      strength,
      level: levelFromRecord(record),
      recent,
      strong,
    };
  });
}

function dataQualityFor(proofCount: number): TemporalEvidenceSnapshot["dataQuality"] {
  if (proofCount === 0) return "empty";
  if (proofCount <= 3) return "thin";
  if (proofCount <= 14) return "usable";
  return "strong";
}

function strongestDomainFor(signals: ProofSignal[]): string | null {
  const domains = new Map<string, { count: number; qualityTotal: number; qualityCount: number }>();
  for (const signal of signals) {
    if (!signal.domain) continue;
    const current = domains.get(signal.domain) ?? { count: 0, qualityTotal: 0, qualityCount: 0 };
    current.count += 1;
    if (signal.quality !== null) {
      current.qualityTotal += signal.quality;
      current.qualityCount += 1;
    }
    domains.set(signal.domain, current);
  }

  return Array.from(domains.entries())
    .sort((left, right) => {
      const countDifference = right[1].count - left[1].count;
      if (countDifference !== 0) return countDifference;
      const leftAverage = left[1].qualityCount ? left[1].qualityTotal / left[1].qualityCount : -1;
      const rightAverage = right[1].qualityCount ? right[1].qualityTotal / right[1].qualityCount : -1;
      if (rightAverage !== leftAverage) return rightAverage - leftAverage;
      return left[0].localeCompare(right[0]);
    })[0]?.[0] ?? null;
}

export function buildTemporalEvidenceSnapshot(
  input: TemporalForecastInput,
): TemporalEvidenceSnapshot {
  const signals = proofSignals(input);
  const qualities = signals
    .map((signal) => signal.quality)
    .filter((quality): quality is number => quality !== null);
  const configuredDomains = uniqueNormalised([
    ...(input.priorityDomains ?? []),
    ...(input.activeDomains ?? []),
  ]);
  const neglectedDomains = configuredDomains.filter(
    (domain) =>
      !signals.some(
        (signal) => signal.domain === domain && signal.recent && signal.strong,
      ),
  );

  return {
    proofCount: input.proofs.length,
    averageProofQuality: qualities.length
      ? round(qualities.reduce((total, quality) => total + quality, 0) / qualities.length)
      : null,
    strongestDomain: strongestDomainFor(signals),
    neglectedDomains,
    recentCourtVerdicts: safeSignals(
      input.courtVerdicts,
      ["verdict", "judgment", "decision", "status", "result"],
    ),
    recentAdversarialRisks: safeSignals(
      input.adversarialRisks,
      ["risk", "risk_type", "riskType", "code", "reason"],
    ),
    stateTrend: safeSignals(
      input.stateTrend,
      ["state", "behavioural_state", "behaviouralState", "status"],
    ),
    interventionFollowThroughRate: null,
    dataQuality: dataQualityFor(input.proofs.length),
  };
}

function isAcademicDomain(domain: string): boolean {
  return /(^|_)(law|psychology|psych|academic|study)($|_)/.test(domain);
}

function isProductDomain(domain: string): boolean {
  return /(^|_)(eblocki|product|product_building|system_building)($|_)/.test(domain);
}

function signalCount(values: readonly string[], pattern: RegExp): number {
  return values.filter((value) => pattern.test(normaliseToken(value))).length;
}

function identityInflationSignal(snapshot: TemporalEvidenceSnapshot): boolean {
  const combined = [
    ...snapshot.recentAdversarialRisks,
    ...snapshot.recentCourtVerdicts,
  ].map(normaliseToken);

  return combined.some(
    (value) =>
      value.includes("identity_claim_exceeds_evidence") ||
      /identity.*(claim|escalation).*(blocked|denied|exceeds)/.test(value) ||
      /(blocked|denied).*identity.*(claim|escalation)/.test(value),
  );
}

export function selectTemporalRisk(
  snapshot: TemporalEvidenceSnapshot,
  input: TemporalForecastInput,
): TemporalRisk {
  const signals = proofSignals(input);
  const configuredDomains = uniqueNormalised([
    ...(input.priorityDomains ?? []),
    ...(input.activeDomains ?? []),
  ]);
  const academicDomains = configuredDomains.filter(isAcademicDomain);
  const recentProductProof = signals.some(
    (signal) => signal.recent && !!signal.domain && isProductDomain(signal.domain),
  );
  const recentStrongAcademicProof = signals.some(
    (signal) =>
      signal.recent &&
      signal.strong &&
      !!signal.domain &&
      isAcademicDomain(signal.domain),
  );

  if (recentProductProof && academicDomains.length > 0 && !recentStrongAcademicProof) {
    return "academic_displacement";
  }

  if (snapshot.proofCount === 0) return "no_artifact_drift";

  if (identityInflationSignal(snapshot)) return "identity_inflation";

  const recentSignals = signals.filter((signal) => signal.recent);
  const recentQualities = recentSignals
    .map((signal) => signal.quality)
    .filter((quality): quality is number => quality !== null);
  const recentAverage = recentQualities.length
    ? recentQualities.reduce((total, quality) => total + quality, 0) / recentQualities.length
    : null;
  const lowFlatQuality =
    recentSignals.length >= 4 &&
    recentQualities.length >= 3 &&
    recentAverage !== null &&
    (recentAverage < 5 ||
      Math.max(...recentQualities) - Math.min(...recentQualities) <= 1);
  const knownLevels = recentSignals
    .map((signal) => signal.level)
    .filter((level): level is string => level !== null);
  const shallowLevelCount = knownLevels.filter((level) => SHALLOW_LEVELS.has(level)).length;
  const mostlyShallowLevels =
    recentSignals.length >= 4 &&
    knownLevels.length >= 3 &&
    shallowLevelCount / knownLevels.length >= 0.75;

  if (lowFlatQuality || mostlyShallowLevels) return "streak_without_depth";

  const highLevelCount = knownLevels.filter((level) => HIGH_LEVELS.has(level)).length;
  const shallowWithoutDepth =
    knownLevels.length > 0
      ? highLevelCount === 0 || highLevelCount / knownLevels.length < 0.2
      : snapshot.averageProofQuality !== null && snapshot.averageProofQuality < 6.5;

  if (shallowWithoutDepth) return "shallow_proof_loop";

  if (snapshot.neglectedDomains.length > 0) return "domain_neglect";

  if (signalCount(snapshot.stateTrend, /low_energy/) >= 2) return "low_energy_decay";

  if (signalCount(snapshot.stateTrend, /(overloaded|scattered)/) >= 2) {
    return "overload_spiral";
  }

  if (
    signalCount(snapshot.stateTrend, /recovery/) >= 1 &&
    (snapshot.dataQuality === "thin" ||
      snapshot.averageProofQuality === null ||
      snapshot.averageProofQuality < 5)
  ) {
    return "recovery_fragility";
  }

  return "none_detected";
}

export function buildDisconfirmingProof(
  risk: TemporalRisk,
  snapshot: TemporalEvidenceSnapshot,
): DisconfirmingProof[] {
  const neglected = snapshot.neglectedDomains[0] ?? "the neglected domain";

  const byRisk: Record<TemporalRisk, DisconfirmingProof> = {
    academic_displacement: {
      claim: "Product or system work may be replacing assessable academic proof.",
      proofThatWouldDisproveIt:
        "Submit one law or psychology assessment-linked artifact before more Eblocki-building.",
    },
    no_artifact_drift: {
      claim: "No behavioural trajectory can be modelled without proof.",
      proofThatWouldDisproveIt: "Submit one measurable proof artifact.",
    },
    identity_inflation: {
      claim: "Identity claim appears ahead of evidence.",
      proofThatWouldDisproveIt:
        "Submit one accepted_strong or elite artifact that survives Court and adversarial review.",
    },
    streak_without_depth: {
      claim: "Recent proof volume may be repeating without a standard increase.",
      proofThatWouldDisproveIt:
        "Submit one depth, pressure, or transfer artifact accepted_strong or higher.",
    },
    shallow_proof_loop: {
      claim: "Recent proof shows activity but limited depth.",
      proofThatWouldDisproveIt:
        "Submit one depth, pressure, or transfer artifact accepted_strong or higher.",
    },
    domain_neglect: {
      claim: "One or more active domains are under-evidenced.",
      proofThatWouldDisproveIt:
        "Submit one accepted_strong artifact in " + neglected + ".",
    },
    low_energy_decay: {
      claim: "Repeated low-energy states may be reducing proof output.",
      proofThatWouldDisproveIt:
        "Submit one appropriately scoped artifact during a low-energy period.",
    },
    overload_spiral: {
      claim: "Repeated overloaded or scattered states may be fragmenting proof.",
      proofThatWouldDisproveIt:
        "Close competing work and submit one depth artifact against a single priority.",
    },
    recovery_fragility: {
      claim: "Recovery evidence is currently too thin to show stable follow-through.",
      proofThatWouldDisproveIt:
        "Complete one light recovery-compatible artifact, then repeat after deliberate rest.",
    },
    none_detected: {
      claim: "No configured temporal risk threshold is currently met.",
      proofThatWouldDisproveIt:
        "A new evidence pattern that crosses a configured risk threshold would change this result.",
    },
  };

  return [byRisk[risk]];
}

function evidenceForRisk(
  risk: TemporalRisk,
  snapshot: TemporalEvidenceSnapshot,
): string[] {
  const details: Record<TemporalRisk, string[]> = {
    academic_displacement: [
      "Recent product-system proof is present.",
      "Priority academic proof is not currently strong enough to close the displacement signal.",
    ],
    no_artifact_drift: ["Proof count is 0."],
    identity_inflation: [
      "Court or adversarial evidence indicates that an identity claim is ahead of accepted proof.",
    ],
    streak_without_depth: [
      "Proof volume exists, but recent quality or level signals are low or flat.",
    ],
    shallow_proof_loop: [
      "Proof exists, but depth, pressure, transfer, or identity-level evidence is limited.",
    ],
    domain_neglect: [
      "Neglected domains: " + (snapshot.neglectedDomains.join(", ") || "none recorded") + ".",
    ],
    low_energy_decay: ["Low-energy states repeat in the recent state trend."],
    overload_spiral: ["Overloaded or scattered states repeat in the recent state trend."],
    recovery_fragility: [
      "Recovery appears in the state trend while proof volume or quality remains thin.",
    ],
    none_detected: ["No configured risk threshold was met by the available evidence."],
  };
  return details[risk];
}

function mechanismForRisk(risk: TemporalRisk): string {
  const mechanisms: Record<TemporalRisk, string> = {
    academic_displacement: "Available effort is being evidenced in product work before academic output.",
    no_artifact_drift: "Without an artifact, the model has no observable behaviour to extend.",
    identity_inflation: "Identity language is advancing faster than accepted evidence.",
    streak_without_depth: "Repeated completion is preserving cadence without raising proof depth.",
    shallow_proof_loop: "Activity is being recorded at a lower proof level than the next standard requires.",
    domain_neglect: "Attention is concentrated while an active domain remains under-evidenced.",
    low_energy_decay: "Repeated low-energy states are narrowing the amount of observable output.",
    overload_spiral: "Competing priorities are fragmenting attention and proof completion.",
    recovery_fragility: "Recovery is not yet followed by enough evidence to show stable re-entry.",
    none_detected: "Available evidence does not cross a configured risk threshold.",
  };
  return mechanisms[risk];
}

function consequenceForRisk(risk: TemporalRisk): string {
  const consequences: Record<TemporalRisk, string> = {
    academic_displacement: "If the pattern repeats, assessable academic output is likely to remain under-evidenced.",
    no_artifact_drift: "If no artifact appears, the trajectory remains unmodelled and progress claims remain unsupported.",
    identity_inflation: "If the gap repeats, identity escalation is likely to remain blocked by evidence standards.",
    streak_without_depth: "If the pattern repeats, cadence may continue while the demonstrated standard stays flat.",
    shallow_proof_loop: "If the pattern repeats, activity may grow faster than demonstrated capability.",
    domain_neglect: "If the pattern repeats, the neglected domain is likely to carry increasing evidence debt.",
    low_energy_decay: "If the pattern repeats, proof volume is likely to contract.",
    overload_spiral: "If the pattern repeats, fragmented effort is likely to reduce completed depth work.",
    recovery_fragility: "If the pattern repeats, re-entry after recovery may remain inconsistent.",
    none_detected: "Current evidence suggests continuing observation rather than a strong risk claim.",
  };
  return consequences[risk];
}

function pathBaseConfidence(snapshot: TemporalEvidenceSnapshot): number {
  switch (snapshot.dataQuality) {
    case "empty": return 0.2;
    case "thin": return 0.38;
    case "usable": return 0.6;
    case "strong": return 0.78;
  }
}

export function buildCounterfactualPaths(
  risk: TemporalRisk,
  snapshot: TemporalEvidenceSnapshot,
): {
  currentPath: CounterfactualPath;
  correctedPath: CounterfactualPath;
  decayPath: CounterfactualPath;
  escalationPath: CounterfactualPath;
} {
  const evidence = evidenceForRisk(risk, snapshot);
  const disconfirming = buildDisconfirmingProof(risk, snapshot)[0];
  const baseConfidence = pathBaseConfidence(snapshot);

  return {
    currentPath: {
      path: "current",
      summary:
        consequenceForRisk(risk) +
        " This forecast weakens if new proof changes the observed pattern.",
      expectedChange: 0,
      confidence: baseConfidence,
      evidence,
      userActionRequired: "Keep the next artifact observable and comparable.",
    },
    correctedPath: {
      path: "corrected",
      summary:
        "If corrective proof appears, the current evidence suggests the risk signal is likely to weaken.",
      expectedChange: 0.35,
      confidence: clamp(baseConfidence - 0.05),
      evidence,
      userActionRequired: disconfirming.proofThatWouldDisproveIt,
    },
    decayPath: {
      path: "decay",
      summary:
        "If this pattern repeats without disconfirming proof, evidence quality or coverage is likely to weaken.",
      expectedChange: -0.3,
      confidence: clamp(baseConfidence - 0.05),
      evidence,
      userActionRequired: "Interrupt the pattern with the smallest proof that directly tests the claim.",
    },
    escalationPath: {
      path: "escalation",
      summary:
        "If corrective proof repeats at a stronger standard, the evidence may support a higher future baseline.",
      expectedChange: 0.55,
      confidence: clamp(baseConfidence - 0.1),
      evidence,
      userActionRequired:
        disconfirming.proofThatWouldDisproveIt +
        " Then repeat that standard in a second proof cycle.",
    },
  };
}

export function calculateTemporalConfidence(
  snapshot: TemporalEvidenceSnapshot,
  horizon: TemporalHorizon,
): {
  confidence: number;
  uncertaintyRange: [number, number];
  label: "low" | "medium" | "high";
} {
  const baseByQuality: Record<TemporalEvidenceSnapshot["dataQuality"], number> = {
    empty: 0.2,
    thin: 0.38,
    usable: 0.6,
    strong: 0.78,
  };
  const horizonPenalty: Record<TemporalHorizon, number> = {
    "24h": 0,
    "7d": 0.05,
    "30d": 0.15,
    "90d": 0.25,
    "1y": 0.4,
  };
  const uncertaintyByQuality: Record<TemporalEvidenceSnapshot["dataQuality"], number> = {
    empty: 0.2,
    thin: 0.18,
    usable: 0.13,
    strong: 0.1,
  };

  const confidence = round(clamp(baseByQuality[snapshot.dataQuality] - horizonPenalty[horizon]));
  const spread = uncertaintyByQuality[snapshot.dataQuality] + horizonPenalty[horizon] / 2;
  const uncertaintyRange: [number, number] = [
    round(clamp(confidence - spread)),
    round(clamp(confidence + spread)),
  ];
  const label = confidence < 0.4 ? "low" : confidence < 0.7 ? "medium" : "high";

  return { confidence, uncertaintyRange, label };
}

export function buildFutureScene(
  risk: TemporalRisk,
  horizon: TemporalHorizon,
  selectedPath: CounterfactualPath,
  snapshot: TemporalEvidenceSnapshot,
  disconfirmingProof: DisconfirmingProof[],
): FutureScene {
  const confidence = calculateTemporalConfidence(snapshot, horizon);
  const proofThatChangesPath =
    disconfirmingProof[0]?.proofThatWouldDisproveIt ??
    "Submit one measurable artifact that directly tests the current claim.";
  const uncertaintyNote =
    "This is a forecast, not fate. It weakens when new proof changes the observed pattern.";

  return {
    horizon,
    pathType: selectedPath.path,
    scene:
      "Across the " +
      horizon +
      " horizon, " +
      selectedPath.summary +
      " " +
      uncertaintyNote,
    evidenceSource: selectedPath.evidence,
    behaviouralMechanism: mechanismForRisk(risk),
    likelyConsequence: consequenceForRisk(risk),
    proofThatChangesPath,
    confidence: confidence.label,
    uncertaintyNote,
    disconfirmingProof:
      (disconfirmingProof[0]?.claim ?? "The current path remains open to correction.") +
      " Proof that would change the path: " +
      proofThatChangesPath,
  };
}

function blockedActionFor(risk: TemporalRisk): string {
  const blocked: Record<TemporalRisk, string> = {
    academic_displacement: "Do not add more Eblocki-building before one assessment-linked academic artifact.",
    no_artifact_drift: "Do not claim trajectory progress until a measurable artifact exists.",
    identity_inflation: "Do not escalate the identity claim before accepted evidence closes the gap.",
    streak_without_depth: "Do not protect cadence with another contact or output-only proof.",
    shallow_proof_loop: "Do not add another shallow artifact when a depth test is available.",
    domain_neglect: "Do not add work in already-evidenced domains before testing the neglected domain.",
    low_energy_decay: "Do not expand scope; use the smallest artifact that still counts.",
    overload_spiral: "Do not open another competing objective before one priority artifact closes.",
    recovery_fragility: "Do not treat rest or intention as proof of stable re-entry.",
    none_detected: "Do not overstate certainty; keep collecting comparable proof.",
  };
  return blocked[risk];
}

function forecastId(
  userId: string,
  generatedAt: string,
  horizon: TemporalHorizon,
  risk: TemporalRisk,
): string {
  const safe = [userId, generatedAt, horizon, risk]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return "temporal-" + (safe || "forecast");
}

export function buildTemporalForecast(input: TemporalForecastInput): TemporalForecast {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const anchoredInput: TemporalForecastInput = { ...input, generatedAt };
  const evidenceSnapshot = buildTemporalEvidenceSnapshot(anchoredInput);
  const primaryRisk = selectTemporalRisk(evidenceSnapshot, anchoredInput);
  const disconfirmingProof = buildDisconfirmingProof(primaryRisk, evidenceSnapshot);
  const paths = buildCounterfactualPaths(primaryRisk, evidenceSnapshot);
  const confidence = calculateTemporalConfidence(evidenceSnapshot, input.horizon);
  const futureScene = buildFutureScene(
    primaryRisk,
    input.horizon,
    paths.currentPath,
    evidenceSnapshot,
    disconfirmingProof,
  );

  return {
    id: forecastId(input.userId, generatedAt, input.horizon, primaryRisk),
    userId: input.userId,
    generatedAt,
    horizon: input.horizon,
    primaryRisk,
    confidence: confidence.confidence,
    uncertaintyRange: confidence.uncertaintyRange,
    currentPath: paths.currentPath,
    correctedPath: paths.correctedPath,
    decayPath: paths.decayPath,
    escalationPath: paths.escalationPath,
    evidenceSnapshot,
    futureScene,
    proofRequired: disconfirmingProof[0].proofThatWouldDisproveIt,
    blockedAction: blockedActionFor(primaryRisk),
    disconfirmingProof,
    calibrationStatus:
      evidenceSnapshot.dataQuality === "empty" || evidenceSnapshot.dataQuality === "thin"
        ? "insufficient_evidence"
        : "pending",
  };
}
