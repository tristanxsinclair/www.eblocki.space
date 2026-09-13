import { z } from "zod";
import { academicEvidence, evidenceOnly, type AcademicDimension } from "./academic-evidence";
import type { ProofScoringResult } from "./proof-scoring";
import { DOMAIN_STANDARD_REGISTRY, selectDomainStandard, type DomainStandardKey } from "./domain-standards";

export interface CorrectionParent {
  id: string;
  domain: string;
  content: string | null;
  title?: string | null;
  artifact_type?: string | null;
  quality_score: number | null;
  evidence_strength: string | null;
  assessment?: unknown;
}
const comparisonSchema = z.object({
  parentId: z.string(),
  originalScore: z.number().nullable(),
  newScore: z.number(),
  scoreDelta: z.number().nullable(),
  originalStrength: z.string().nullable(),
  newStrength: z.string(),
  requestedCorrection: z.string(),
  status: z.enum(["resolved", "partially_resolved", "unresolved", "incomparable"]),
  change: z.enum(["improved", "regressed", "unchanged", "mixed", "unknown"]),
  explanation: z.string(),
  improved: z.array(z.string()),
  remaining: z.array(z.string()),
});
export type CorrectionComparison = z.infer<typeof comparisonSchema>;
const snapshotSchema = z.object({
  version: z.literal(1),
  standardKey: z.string().refine(key => Object.prototype.hasOwnProperty.call(DOMAIN_STANDARD_REGISTRY, key)),
  gap: z.string(),
  correctionTarget: z.enum(["explanation", "application", "discrimination", "correction"]).nullable(),
  systemRecommendation: z.string(),
  userProposedNextStep: z.string(),
  comparison: comparisonSchema.nullable(),
});
export type AssessmentSnapshot = z.infer<typeof snapshotSchema>;
export function readAssessment(value: unknown): AssessmentSnapshot | null {
  const result = snapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}
/** Mode IDs are routing hints; persisted correction contexts use domain identity. */
export function canonicalCorrectionDomain(value: string): string {
  const domain = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    psych_hd: "psychology", psych: "psychology", law_max: "law",
    sales_close: "sales", general_execution: "general", career: "career_money",
  };
  return Object.prototype.hasOwnProperty.call(aliases, domain) ? aliases[domain] : domain;
}

/** Call only after fetching and validating the owned parent, before scoring. */
export function correctionAssessmentContext(parent: CorrectionParent, explicitDomain?: string | null): {
  domain: string; selectedStandard: DomainStandardKey;
} {
  const domain = canonicalCorrectionDomain(explicitDomain || parent.domain) || "general";
  const changed = domain !== canonicalCorrectionDomain(parent.domain);
  const snapshot = parent.assessment;
  const key = snapshot && typeof snapshot === "object" && "standardKey" in snapshot ? snapshot.standardKey : null;
  const validKey = typeof key === "string" && Object.prototype.hasOwnProperty.call(DOMAIN_STANDARD_REGISTRY, key);
  return {
    domain,
    selectedStandard: !changed && validKey ? key as DomainStandardKey : selectDomainStandard({
      domain,
      // Changed contexts must not be re-routed by the old artifact's wording.
      artifactType: changed ? undefined : parent.artifact_type,
      signalText: changed ? undefined : [parent.title, parent.content].filter(Boolean).join("\n"),
    }).key,
  };
}

export function compareCorrection(parent: CorrectionParent | null, child: {
  parentId: string; domain: string; content: string; score: ProofScoringResult;
}): CorrectionComparison {
  const originalScore = parent?.quality_score != null && Number.isFinite(parent.quality_score) ? parent.quality_score : null;
  const delta = originalScore == null ? null : child.score.qualityScore - originalScore;
  const saved = readAssessment(parent?.assessment);
  const base: CorrectionComparison = {
    parentId: child.parentId, originalScore, newScore: child.score.qualityScore,
    scoreDelta: delta, originalStrength: parent?.evidence_strength ?? null,
    newStrength: child.score.evidenceStrength,
    requestedCorrection: saved?.systemRecommendation ?? "Historical correction target was not recorded with system provenance.",
    status: "incomparable", change: "unknown", improved: [], remaining: [child.score.gap],
    explanation: "Parent evidence or a verified correction target is unavailable. No improvement claim can be made.",
  };
  if (!parent?.content || !saved) return base;
  const parentContext = correctionAssessmentContext(parent);
  if (parentContext.domain !== canonicalCorrectionDomain(child.domain) || parentContext.selectedStandard !== child.score.standardKey) {
    return { ...base, explanation: "The domain or evidence standard changed; raw scores are shown but are not a valid improvement comparison." };
  }
  const oldText = evidenceOnly(parent.content).toLowerCase().replace(/\s+/g, " ");
  const newText = evidenceOnly(child.content).toLowerCase().replace(/\s+/g, " ");
  if (oldText === newText) return {
    ...base, status: "unresolved", change: "unchanged",
    explanation: "The original evidence is unchanged or only extended. The requested correction is not established by length or a new title.",
  };
  const target = saved.correctionTarget;
  if (!target || !child.score.dimensions) return base;
  const oldDimensions = academicEvidence(parent.content);
  const improved = (Object.keys(oldDimensions) as AcademicDimension[]).filter(k => !oldDimensions[k] && child.score.dimensions?.[k]);
  const lost = (Object.keys(oldDimensions) as AcademicDimension[]).filter(k => oldDimensions[k] && !child.score.dimensions?.[k]);
  const addressed = !!child.score.dimensions[target] && child.score.dimensions[target] !== oldDimensions[target];
  // Rubric marking / novel transfer cannot be certified by text patterns.
  const weighedAlternative = target !== "discrimination" || /\b(?:dominant|more likely|stronger explanation|better explains)\b/i.test(child.score.dimensions.discrimination ?? "");
  const status = addressed ? (target === "correction" || !weighedAlternative ? "partially_resolved" : "resolved") : improved.length ? "partially_resolved" : "unresolved";
  return {
    ...base, status,
    change: improved.length ? (lost.length ? "mixed" : "improved") : lost.length ? "regressed" : "unchanged",
    improved: improved.map(k => `New structural evidence of ${k}.`),
    remaining: [...lost.map(k => `Previously visible ${k} is not detected in this attempt.`), child.score.gap],
    explanation: `Raw score ${delta == null ? "change unknown" : `${delta > 0 ? "+" : ""}${delta}`}. ${addressed ? (status === "resolved" ? "New worked evidence addresses the recorded structural target." : "New worked evidence addresses part of the target; authoritative marking or weighing the competing explanation remains unverified.") : "The recorded target is not fully demonstrated by new worked evidence."} Difficulty and factual accuracy are unverified; a score change alone does not establish learning or regression.`,
  };
}
export function assessmentSnapshot(score: ProofScoringResult, userProposedNextStep: string, comparison: CorrectionComparison | null): AssessmentSnapshot {
  return { version: 1, standardKey: score.standardKey, gap: score.gap, correctionTarget: score.correctionTarget,
    systemRecommendation: score.nextUpgrade, userProposedNextStep, comparison };
}
