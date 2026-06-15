/**
 * Eblocki Product Matching Intelligence Layer.
 *
 * Deterministic engine that turns behavioural evidence into a single
 * trust-gated recommendation. NEVER recommends on commission alone.
 * NEVER fires without evidence. Internal Pro is preferred when a
 * diagnosed need is genuinely served by an existing Eblocki feature.
 */

import type { TemporalResult } from "./temporal-engine";
import type { AccessLevel } from "./access-level";

export type ProductCategory =
  | "study_tool"
  | "course"
  | "book"
  | "software"
  | "fitness_equipment"
  | "sport_training"
  | "recovery_tool"
  | "finance_tool"
  | "productivity_tool"
  | "creator_tool"
  | "sales_resource"
  | "coaching_service"
  | "language_resource"
  | "hardware"
  | "other";

export type MonetisationType =
  | "none"
  | "affiliate"
  | "sponsored"
  | "internal_pro"
  | "founder_offer"
  | "partner";

export type NeedSource =
  | "proof_history"
  | "operating_profile"
  | "sentinel_risk"
  | "cortex_counterfactual"
  | "domain_stats"
  | "manual_user_input";

export interface UserNeedSignal {
  id: string;
  domain: string;
  need: string;
  evidence: string[];
  urgency: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  source: NeedSource;
}

export interface ProductMatch {
  id: string;
  category: ProductCategory;
  title: string;
  description: string;
  fitReason: string;
  evidence: string[];
  fitScore: number;
  trustScore: number;
  urgencyFit: number;
  priceSensitivityFit: number;
  monetisationType: MonetisationType;
  disclosureRequired: boolean;
  ctaLabel: string;
  outcomeToTrack: string;
}

export interface ProductMatchingResult {
  primaryNeed: UserNeedSignal | null;
  recommendedMatches: ProductMatch[];
  rejectedMatches: ProductMatch[];
  recommendationSummary: string;
  trustWarning: string | null;
  nextBestCommercialAction: string | null;
}

export interface OperatingProfileLike {
  primaryDomain?: string | null;
  neglectedDomain?: string | null;
  budgetSensitivity?: "low" | "medium" | "high" | null;
  recommendationsAllowed?: boolean;
  noGoCategories?: ProductCategory[];
  trustPreference?: "strict" | "neutral" | "educational" | "minimal";
}

export interface DomainStat {
  domain: string;
  count: number;
  averageScore: number;
}

export interface ProductMatchingInput {
  operatingProfile?: OperatingProfileLike | null;
  artifacts?: Array<{ domain?: string | null; quality_score?: number | null; created_at?: string | null }>;
  domainStats?: DomainStat[];
  temporal?: TemporalResult | null;
  accessLevel?: AccessLevel;
  catalog?: ProductMatch[];
  route?: string;
}

const DAY = 86_400_000;

const INTERNAL_PRO_OFFER: ProductMatch = {
  id: "eblocki_pro",
  category: "productivity_tool",
  title: "Eblocki Pro",
  description: "Sentinel risk prediction, Cortex paths, Court of Evidence, adaptive coaching.",
  fitReason: "Diagnosed need exceeds what the free tier can resolve.",
  evidence: [],
  fitScore: 0,
  trustScore: 0.95,
  urgencyFit: 0,
  priceSensitivityFit: 0.7,
  monetisationType: "internal_pro",
  disclosureRequired: true,
  ctaLabel: "See Pro",
  outcomeToTrack: "upgrade_clicked",
};

function safeDomain(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "general";
}

function buildDomainStats(
  artifacts: ProductMatchingInput["artifacts"] = [],
  windowDays = 14,
): DomainStat[] {
  const now = Date.now();
  const grouped = new Map<string, { count: number; total: number }>();
  for (const artifact of artifacts) {
    const ts = artifact?.created_at ? Date.parse(artifact.created_at) : Number.NaN;
    if (!Number.isFinite(ts) || now - ts > windowDays * DAY) continue;
    const domain = safeDomain(artifact?.domain);
    const current = grouped.get(domain) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += typeof artifact?.quality_score === "number" ? artifact.quality_score : 0;
    grouped.set(domain, current);
  }
  return [...grouped.entries()].map(([domain, value]) => ({
    domain,
    count: value.count,
    averageScore: value.count ? value.total / value.count : 0,
  }));
}

/**
 * Detect the single most urgent product-shaped need. Returns null when
 * evidence is too weak — silence is preferred over a guess.
 */
export function detectPrimaryNeed(input: ProductMatchingInput): UserNeedSignal | null {
  const stats = input.domainStats?.length ? input.domainStats : buildDomainStats(input.artifacts);
  const totalArtifacts = stats.reduce((sum, stat) => sum + stat.count, 0);

  // No proof at all — no diagnosis. Suppression is the correct answer.
  if (totalArtifacts < 2) return null;

  const temporal = input.temporal ?? null;

  // Sentinel-style risk takes priority over averages.
  if (temporal?.risk?.primaryFailureMode && temporal.confidence?.band !== "low") {
    return {
      id: `risk_${temporal.risk.primaryFailureMode}`,
      domain: input.operatingProfile?.primaryDomain ?? "general",
      need: `Mitigate ${temporal.risk.primaryFailureMode.replace(/_/g, " ")} risk`,
      evidence: [
        `Forecast risk: ${temporal.risk.primaryFailureMode}`,
        `Confidence: ${temporal.confidence.band}`,
      ],
      urgency: 4,
      confidence: 0.7,
      source: "sentinel_risk",
    };
  }

  const weakest = [...stats].sort((a, b) => a.averageScore - b.averageScore)[0];
  if (weakest && weakest.count >= 2 && weakest.averageScore <= 2.5) {
    return {
      id: `weak_${weakest.domain}`,
      domain: weakest.domain,
      need: `Raise proof quality in ${weakest.domain}`,
      evidence: [
        `${weakest.count} ${weakest.domain} artifacts averaging ${weakest.averageScore.toFixed(1)}/5`,
      ],
      urgency: 3,
      confidence: 0.6,
      source: "domain_stats",
    };
  }

  const neglected = input.operatingProfile?.neglectedDomain;
  if (neglected && !stats.find((stat) => stat.domain === neglected.toLowerCase())) {
    return {
      id: `neglect_${neglected}`,
      domain: neglected,
      need: `Restart proof in ${neglected}`,
      evidence: [`No ${neglected} proof in window`],
      urgency: 2,
      confidence: 0.5,
      source: "operating_profile",
    };
  }

  return null;
}

const NEED_CATEGORY_MAP: Record<string, ProductCategory[]> = {
  law: ["study_tool", "course", "book"],
  psychology: ["course", "book", "coaching_service"],
  sales: ["sales_resource", "coaching_service", "course"],
  soccer: ["sport_training", "fitness_equipment", "recovery_tool"],
  sport: ["sport_training", "fitness_equipment", "recovery_tool"],
  finance: ["finance_tool", "course", "book"],
  language: ["language_resource", "course"],
  life: ["productivity_tool", "course"],
  general: ["productivity_tool"],
};

function scoreCandidate(candidate: ProductMatch, need: UserNeedSignal, input: ProductMatchingInput): ProductMatch {
  const profile = input.operatingProfile ?? {};
  const categoryAllowed = !profile.noGoCategories?.includes(candidate.category);
  if (!categoryAllowed) {
    return { ...candidate, fitScore: 0, trustScore: 0 };
  }
  const acceptedCategories = NEED_CATEGORY_MAP[need.domain.toLowerCase()] ?? NEED_CATEGORY_MAP.general;
  // Internal Pro is a cross-domain meta-tool — it always fits the diagnosis surface.
  const categoryFit = candidate.monetisationType === "internal_pro"
    ? 1
    : acceptedCategories.includes(candidate.category) ? 1 : 0.3;

  const monetisationPenalty = candidate.monetisationType === "affiliate" || candidate.monetisationType === "sponsored"
    ? 0.85
    : 1;

  const urgencyFit = Math.min(1, need.urgency / 5);

  const budget = profile.budgetSensitivity ?? "medium";
  const priceFit = budget === "high"
    ? candidate.priceSensitivityFit
    : budget === "low"
      ? 1
      : (candidate.priceSensitivityFit + 1) / 2;

  const fitScore = Math.max(
    0,
    Math.min(1, categoryFit * 0.5 + urgencyFit * 0.25 + priceFit * 0.15 + need.confidence * 0.1) * monetisationPenalty,
  );

  return {
    ...candidate,
    fitScore,
    urgencyFit,
    priceSensitivityFit: priceFit,
    trustScore: candidate.trustScore,
  };
}

const TRUST_THRESHOLD_BY_PREF: Record<NonNullable<OperatingProfileLike["trustPreference"]>, number> = {
  strict: 0.85,
  neutral: 0.7,
  educational: 0.6,
  minimal: 0.55,
};

export function buildProductMatchingResult(input: ProductMatchingInput): ProductMatchingResult {
  const profile = input.operatingProfile ?? {};
  const recommendationsAllowed = profile.recommendationsAllowed !== false;
  const accessLevel = input.accessLevel ?? "free";
  const stats = input.domainStats?.length ? input.domainStats : buildDomainStats(input.artifacts);
  const primaryNeed = detectPrimaryNeed({ ...input, domainStats: stats });

  if (!recommendationsAllowed) {
    return {
      primaryNeed,
      recommendedMatches: [],
      rejectedMatches: [],
      recommendationSummary: "Recommendations are disabled in user settings.",
      trustWarning: null,
      nextBestCommercialAction: null,
    };
  }

  if (!primaryNeed) {
    return {
      primaryNeed: null,
      recommendedMatches: [],
      rejectedMatches: [],
      recommendationSummary: "Not enough behavioural evidence to recommend a product. Log more proof first.",
      trustWarning: null,
      nextBestCommercialAction: "Submit one more proof artifact to unlock diagnosis.",
    };
  }

  const catalog = input.catalog ?? [];
  const internalCandidate: ProductMatch = {
    ...INTERNAL_PRO_OFFER,
    evidence: primaryNeed.evidence,
    fitReason: accessLevel === "free"
      ? `Pro unlocks the systems that resolve ${primaryNeed.domain} drift.`
      : `Already active — keep using Pro flows for ${primaryNeed.domain}.`,
  };

  const scoredCatalog = catalog.map((candidate) => scoreCandidate(candidate, primaryNeed, input));
  const scoredInternal = accessLevel === "free"
    ? scoreCandidate({ ...internalCandidate, fitScore: 0.8, trustScore: 0.95 }, primaryNeed, input)
    : null;

  const all = [...scoredCatalog];
  if (scoredInternal) all.push(scoredInternal);

  const trustPref = profile.trustPreference ?? "neutral";
  const trustThreshold = TRUST_THRESHOLD_BY_PREF[trustPref];

  const accepted: ProductMatch[] = [];
  const rejected: ProductMatch[] = [];
  for (const candidate of all.sort((a, b) => b.fitScore - a.fitScore)) {
    if (candidate.fitScore >= 0.5 && candidate.trustScore >= trustThreshold) {
      accepted.push(candidate);
    } else {
      rejected.push(candidate);
    }
  }

  // Trust gate: maximum one primary recommendation.
  const recommended = accepted.slice(0, 1);

  const trustWarning = recommended.find((match) => match.monetisationType === "affiliate" || match.monetisationType === "sponsored")
    ? "This recommendation may be monetised. Eblocki only shows it because the evidence supports the fit."
    : null;

  const summary = recommended.length
    ? `Need detected (${primaryNeed.domain}). Best fit: ${recommended[0].title}.`
    : "Need detected, but no candidate cleared the trust threshold. Recommendation suppressed.";

  return {
    primaryNeed,
    recommendedMatches: recommended,
    rejectedMatches: rejected,
    recommendationSummary: summary,
    trustWarning,
    nextBestCommercialAction: recommended[0]?.ctaLabel ?? null,
  };
}

/** Default minimal catalog used when no partner catalog is loaded. */
export const DEFAULT_INTERNAL_CATALOG: ProductMatch[] = [INTERNAL_PRO_OFFER];