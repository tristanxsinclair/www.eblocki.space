import { type Mode, MODE_DOMAINS } from "./modes";

const SERIOUS_VERBS = [
  "write","draft","study","produce","submit","build","practise","practice",
  "reflect","revise","sell","train","complete","prepare","ship","read",
  "analyse","analyze","argue","summarise","summarize","review","record",
];

export interface ProofContract {
  shouldCreate: boolean;
  domain: string;
  mode: Mode;
  title: string;
  requiredArtifact: string;
  evidenceStandard: string;
  dueDate: string | null;
  seriousnessScore: number; // 1..10
  reason: string;
}

const STANDARDS: Partial<Record<Mode, { artifact: string; standard: string }>> = {
  LAW_MAX: {
    artifact: "Written IRAC answer (250+ words)",
    standard: "Issue / Rule + authority / Application to facts / Counterargument / Conclusion",
  },
  PSYCH_HD: {
    artifact: "Applied paragraph (200+ words)",
    standard: "Concept / Application / Evidence (post-2016 where possible) / Evaluation",
  },
  SALES_CLOSE: {
    artifact: "Shift reflection (one customer)",
    standard: "Diagnosis / Premium pain / GSE attempt / Objection handled / Close outcome",
  },
  EBLOCKI: {
    artifact: "Daily Control Sheet line + completed task",
    standard: "State / Bottleneck / Artifact produced / Reflection / Next upgrade",
  },
  SPORT: {
    artifact: "Training/match log",
    standard: "Minutes / Movement / Best action / Worst repeated mistake / Next drill",
  },
  BRAND: {
    artifact: "One published piece (post/script/reel)",
    standard: "Hook / Proof-based angle / Clarity / Originality / Published",
  },
  CAREER_MONEY: {
    artifact: "Decision document or asset (resume/cover/budget)",
    standard: "Utility / Total cost / Downside / Upside / Opportunity cost / Decision rule",
  },
  GENERAL_EXECUTION: {
    artifact: "Concrete output proving the action happened",
    standard: "Action / Evidence / Reflection / Next",
  },
};

export function buildProofContract(input: {
  message: string;
  assistantOutput: string;
  mode: Mode;
}): ProofContract {
  const text = `${input.message}\n${input.assistantOutput}`.toLowerCase();
  let seriousness = 0;
  for (const v of SERIOUS_VERBS) {
    if (new RegExp(`\\b${v}\\b`).test(text)) seriousness += 1;
  }
  // structural / time markers
  if (/\b(today|tonight|tomorrow|by \d|deadline)\b/.test(text)) seriousness += 2;
  if (/\b(exam|due|assessment|shift|match)\b/.test(text)) seriousness += 2;
  if (input.assistantOutput.length > 300) seriousness += 1;

  seriousness = Math.max(1, Math.min(10, seriousness));
  const std = STANDARDS[input.mode] ?? STANDARDS.GENERAL_EXECUTION!;

  // crude title extract
  const firstLine = input.message.split("\n")[0].slice(0, 80) || "Next action";

  return {
    shouldCreate: seriousness >= 4,
    domain: MODE_DOMAINS[input.mode],
    mode: input.mode,
    title: firstLine,
    requiredArtifact: std.artifact,
    evidenceStandard: std.standard,
    dueDate: null,
    seriousnessScore: seriousness,
    reason:
      seriousness >= 4
        ? `Detected ${seriousness} action signals — proof contract enforced.`
        : "Casual question — no contract created.",
  };
}

export const PROOF_QUESTION = "What proof artifact will confirm completion?";
