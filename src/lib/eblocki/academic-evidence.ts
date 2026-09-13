/** Structural evidence only: never certifies subject correctness or unaided recall. */
export function evidenceOnly(text = ""): string {
  return text.split(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:next upgrade|next step|future upgrade|proposed upgrade)\s*:/i)[0].trim();
}

export const ACADEMIC_DIMENSIONS = ["explanation", "application", "discrimination", "correction"] as const;
export type AcademicDimension = typeof ACADEMIC_DIMENSIONS[number];
export type AcademicEvidence = Record<AcademicDimension, string | null>;

export function academicEvidence(content: string): AcademicEvidence {
  const sentences = evidenceOnly(content).split(/(?<=[.!?])\s+|\n+/).map(s => s.trim());
  // Require substantive worked sentences, not headings, rubric lists or intent claims.
  const worked = sentences.filter(s => s.split(/\s+/).length >= 12
    && !/^(?:i |we )?(?:will|plan to|need to|should|want to)|\b(?:i applied the concept|desired score|strong proof|required evidence)\b/i.test(s));
  const find = (pattern: RegExp) => worked.find(s => pattern.test(s)) ?? null;
  return {
    explanation: find(/\b(?:means|refers to|defined as|is the|because|due to)\b/i),
    application: worked.find(s => /\b(?:scenario|for example|when|patient|participant|student|reader|degraded|blurred)\b/i.test(s)
      && /\b(?:because|therefore|due to|suggests|explains|predicts)\b/i.test(s)) ?? null,
    discrimination: worked.find(s => /\b(?:whereas|although|however|rather than|both|alternative)\b/i.test(s)
      && /\b(?:because|therefore|depends|unlike|distinguish)\b/i.test(s)) ?? null,
    correction: worked.find(s => /\b(?:initially|previously|mistaken|incorrect|mistake|wrong)\b/i.test(s)
      && /\b(?:now|instead|correct|because|revised)\b/i.test(s)) ?? null,
  };
}

export function academicGap(evidence: AcademicEvidence): { target: AcademicDimension; gap: string; action: string } {
  if (!evidence.explanation) return { target: "explanation", gap: "A worked concept explanation is not yet visible.", action: "Explain one concept in a full answer, including why it works." };
  if (!evidence.application) return { target: "application", gap: "Definitions are visible, but a concrete scenario linked to a reason is not yet demonstrated.", action: "Answer one concrete scenario and explain why the concept accounts for the observed result." };
  if (!evidence.discrimination) return { target: "discrimination", gap: "Scenario application is visible; discrimination between competing explanations is not yet demonstrated.", action: "Answer one ambiguous scenario with two plausible explanations. Justify which fits better and why the alternative is weaker." };
  if (!/\b(?:dominant|more likely|stronger explanation|better explains)\b/i.test(evidence.discrimination)) return {
    target: "discrimination",
    gap: "Competing explanations are discussed, but weighing them in an ambiguous case is not yet demonstrated.",
    action: "Answer one ambiguous scenario with two plausible explanations. Justify which fits better and why the alternative is weaker.",
  };
  return { target: "correction", gap: "Structural reasoning is visible. Independent marking and transfer to a novel case remain unverified.", action: "Check this answer against an authoritative rubric, show any error and its correction, then answer a novel case." };
}
