export type LawUnit = "BLAW1003" | "LAWS1004";

export type LawSourceBankEntry = {
  unit: LawUnit;
  sourceName: string;
  jurisdiction: string;
  authorityLevel: string;
  sourceType: string;
  currentVersionChecked: boolean;
  keyProvisionOrMaterial: string;
  keyRule: string;
  unitRelevance: string;
  possibleAssessmentUse: string;
  limitationOrCounterargument: string;
  confidenceRating: 1 | 2 | 3 | 4 | 5;
};

export const LAW_MASTERY_LOOP = [
  "Source Bank",
  "Issue Matrix",
  "Paragraph",
  "Problem Answer",
  "Review",
  "Upgrade",
] as const;

const STARTER_SOURCE_PROMPTS: Record<LawUnit, Array<Pick<LawSourceBankEntry, "sourceName" | "jurisdiction" | "authorityLevel" | "sourceType">>> = {
  BLAW1003: [
    { sourceName: "Native Title Act 1993 (Cth)", jurisdiction: "Commonwealth", authorityLevel: "legislation", sourceType: "Act" },
    { sourceName: "National Native Title Tribunal material", jurisdiction: "Commonwealth", authorityLevel: "tribunal / official guidance", sourceType: "official material" },
    { sourceName: "Federal Court native title material", jurisdiction: "Commonwealth", authorityLevel: "court / official guidance", sourceType: "court material" },
    { sourceName: "Closing the Gap", jurisdiction: "Australia", authorityLevel: "government policy framework", sourceType: "policy material" },
    { sourceName: "ALRC Pathways to Justice", jurisdiction: "Australia", authorityLevel: "law reform report", sourceType: "report" },
    { sourceName: "Bringing Them Home", jurisdiction: "Australia", authorityLevel: "inquiry report", sourceType: "report" },
    { sourceName: "WA Aboriginal cultural heritage materials", jurisdiction: "Western Australia", authorityLevel: "state materials", sourceType: "official material" },
  ],
  LAWS1004: [
    { sourceName: "Competition and Consumer Act 2010 (Cth)", jurisdiction: "Commonwealth", authorityLevel: "legislation", sourceType: "Act" },
    { sourceName: "Schedule 2 Australian Consumer Law", jurisdiction: "Commonwealth", authorityLevel: "legislation", sourceType: "Schedule" },
    { sourceName: "ACL misleading or deceptive conduct", jurisdiction: "Commonwealth", authorityLevel: "statutory topic", sourceType: "issue prompt" },
    { sourceName: "ACL consumer guarantees", jurisdiction: "Commonwealth", authorityLevel: "statutory topic", sourceType: "issue prompt" },
    { sourceName: "ACCC guidance", jurisdiction: "Commonwealth", authorityLevel: "regulator guidance", sourceType: "official guidance" },
    { sourceName: "Corporations Act 2001 (Cth)", jurisdiction: "Commonwealth", authorityLevel: "legislation", sourceType: "Act" },
    { sourceName: "ASIC business/company material", jurisdiction: "Commonwealth", authorityLevel: "regulator guidance", sourceType: "official guidance" },
  ],
};

export function createLawSourceBankEntryTemplate(
  unit: LawUnit,
  source: Pick<LawSourceBankEntry, "sourceName" | "jurisdiction" | "authorityLevel" | "sourceType">,
): LawSourceBankEntry {
  return {
    unit,
    sourceName: source.sourceName,
    jurisdiction: source.jurisdiction,
    authorityLevel: source.authorityLevel,
    sourceType: source.sourceType,
    currentVersionChecked: false,
    keyProvisionOrMaterial: "Verify from the current source before completing.",
    keyRule: "Do not complete until checked against the source.",
    unitRelevance: "Link to the unit topic after checking the syllabus or assessment task.",
    possibleAssessmentUse: "Identify whether this supports a problem answer, issue matrix, or policy discussion.",
    limitationOrCounterargument: "Add a limitation, competing authority, or uncertainty after verification.",
    confidenceRating: 1,
  };
}

export function getLawMasteryStarterPath(unit: LawUnit): LawSourceBankEntry[] {
  return STARTER_SOURCE_PROMPTS[unit].map((source) => createLawSourceBankEntryTemplate(unit, source));
}

export function buildTwoSourceBankProofTask(): string {
  return [
    "Create two source-bank entries:",
    "1. BLAW1003 - Native Title Act 1993 (Cth)",
    "2. LAWS1004 - Competition and Consumer Act 2010 (Cth), Schedule 2 Australian Consumer Law",
  ].join("\n");
}

export function validateLawSourceBankEntry(entry: LawSourceBankEntry): boolean {
  return Boolean(
    entry.unit &&
      entry.sourceName.trim() &&
      entry.jurisdiction.trim() &&
      entry.authorityLevel.trim() &&
      entry.sourceType.trim() &&
      typeof entry.currentVersionChecked === "boolean" &&
      entry.keyProvisionOrMaterial.trim() &&
      entry.keyRule.trim() &&
      entry.unitRelevance.trim() &&
      entry.possibleAssessmentUse.trim() &&
      entry.limitationOrCounterargument.trim() &&
      entry.confidenceRating >= 1 &&
      entry.confidenceRating <= 5,
  );
}
