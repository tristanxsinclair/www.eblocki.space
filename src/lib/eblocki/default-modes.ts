export type DefaultModePresetId = "tristan" | "general";

export interface EblockiDefaultMode {
  mode_id: string;
  display_name: string;
  description: string;
  keywords: string[];
  proof_examples: string[];
  weak_evidence_examples: string[];
  strong_evidence_examples: string[];
  elite_evidence_examples: string[];
  preferred_response_framework: string;
  scoring_criteria: Record<string, string[]>;
  research_needs: string[];
  tone_adjustments: string;
  is_default: boolean;
  is_active: boolean;
}

const DEFAULT_RESPONSE_FRAMEWORK =
  "Bottom Line Up Front → Analysis → Actionable System → HD/Elite Upgrade";

export const TRISTAN_DEFAULT_MODES: EblockiDefaultMode[] = [
  {
    mode_id: "LAW_MAX",
    display_name: "Law Max",
    description:
      "Curtin law performance mode for LAWS1005, LAWS1006, IRAC, statutory interpretation, case analysis, AGLC4, and exam preparation.",
    keywords: [
      "law",
      "LAWS1005",
      "LAWS1006",
      "legal",
      "case",
      "statute",
      "statutory interpretation",
      "IRAC",
      "AGLC",
      "precedent",
      "ratio",
      "obiter",
      "jurisdiction",
      "court",
      "exam",
    ],
    proof_examples: [
      "IRAC answer",
      "statutory interpretation mini-answer",
      "case analysis",
      "authority table",
      "exam issue list",
    ],
    weak_evidence_examples: [
      "Re-reading notes without writing an answer",
      "Listing legal rules without applying facts",
      "Using unverified authority",
    ],
    strong_evidence_examples: [
      "A 250–400 word IRAC with issue, rule, application, counterargument, and conclusion",
      "A statutory interpretation answer using text, context, purpose, and competing construction",
    ],
    elite_evidence_examples: [
      "A timed legal answer with verified authority, precise fact application, counterargument, and corrected upgrade",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      law: [
        "issue accuracy",
        "authority use",
        "fact application",
        "counterargument",
        "conclusion strength",
      ],
    },
    research_needs: [
      "jurisdiction",
      "legislation currency",
      "case status",
      "binding vs persuasive authority",
      "AGLC4 precision",
    ],
    tone_adjustments:
      "Direct, examiner-calibrated, authority-focused, no fabricated sources.",
    is_default: true,
    is_active: true,
  },
  {
    mode_id: "PSYCH_HD",
    display_name: "Psych HD",
    description:
      "Psychology performance mode for PSYC1000, evidence-based writing, cognition, behaviour, learning, development, and critical evaluation.",
    keywords: [
      "psychology",
      "PSYC1000",
      "cognition",
      "learning",
      "memory",
      "development",
      "motivation",
      "mental health",
      "behaviour",
      "attention",
      "evidence",
      "CAEE",
    ],
    proof_examples: [
      "Concept → Application → Evidence → Evaluation paragraph",
      "research summary",
      "mechanism explanation",
      "critical evaluation",
    ],
    weak_evidence_examples: [
      "Defining a concept without applying it",
      "Using evidence without evaluating quality",
      "Making broad claims without mechanisms",
    ],
    strong_evidence_examples: [
      "A CAEE paragraph with a clear mechanism and post-2016 evidence",
    ],
    elite_evidence_examples: [
      "A concise psychology answer with concept precision, applied mechanism, current evidence, critique, and correction",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      psychology: [
        "concept clarity",
        "application",
        "evidence quality",
        "evaluation",
        "mechanism precision",
      ],
    },
    research_needs: [
      "post-2016 evidence",
      "source quality",
      "methodological limitations",
      "mechanism clarity",
    ],
    tone_adjustments:
      "Evidence-based, concise, mechanism-focused, no unsupported claims.",
    is_default: true,
    is_active: true,
  },
  {
    mode_id: "SALES_CLOSE",
    display_name: "Sales Close",
    description:
      "Retail sales performance mode for The Good Guys, GSE, objection handling, premium product confidence, AOV, and closing.",
    keywords: [
      "Good Guys",
      "TGG",
      "sales",
      "GSE",
      "warranty",
      "customer",
      "objection",
      "close",
      "commission",
      "AOV",
      "upsell",
      "product",
      "appliance",
      "TV",
      "laptop",
      "fridge",
      "washer",
      "vacuum",
    ],
    proof_examples: [
      "sales reflection",
      "objection script",
      "GSE attachment review",
      "customer diagnosis breakdown",
      "premium product comparison",
    ],
    weak_evidence_examples: [
      "Only listing product features",
      "Avoiding the close",
      "Not linking GSE to customer risk",
    ],
    strong_evidence_examples: [
      "A customer interaction review with diagnosis, premium pain, GSE attempt, objection, and close result",
    ],
    elite_evidence_examples: [
      "A shift review showing script tested, objection handled, GSE attached, and next sales upgrade defined",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      sales: [
        "diagnosis quality",
        "premium pain identified",
        "GSE attachment",
        "objection handling",
        "close attempt",
      ],
    },
    research_needs: [
      "product knowledge",
      "customer use case",
      "risk control",
      "premium comparison",
    ],
    tone_adjustments:
      "Commercial, practical, direct. Sell consequence control, not features.",
    is_default: true,
    is_active: true,
  },
  {
    mode_id: "EBLOCKI",
    display_name: "Eblocki",
    description:
      "Proof-based execution mode for discipline, avoidance, habits, accountability, identity, and behavioural systems.",
    keywords: [
      "Eblocki",
      "discipline",
      "productivity",
      "avoidance",
      "habit",
      "routine",
      "accountability",
      "proof",
      "daily control",
      "identity",
      "system",
      "focus",
      "motivation",
      "streak",
      "scattered",
      "overwhelmed",
    ],
    proof_examples: [
      "Daily Control Sheet",
      "avoidance audit",
      "friction task completion",
      "weekly pattern review",
      "proof streak entry",
    ],
    weak_evidence_examples: [
      "Planning without output",
      "Changing the system instead of doing the task",
      "Using motivation as the standard",
    ],
    strong_evidence_examples: [
      "A completed artifact plus reflection and next upgrade",
    ],
    elite_evidence_examples: [
      "A repeated proof cycle showing behaviour, feedback, correction, and identity evidence",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      eblocki: [
        "state diagnosis",
        "bottleneck clarity",
        "artifact produced",
        "reflection quality",
        "next upgrade",
      ],
    },
    research_needs: [
      "behavioural state",
      "avoidance signal",
      "proof quality",
      "feedback loop",
    ],
    tone_adjustments:
      "Direct, strategic, proof-first. No vague motivation.",
    is_default: true,
    is_active: true,
  },
  {
    mode_id: "SPORT",
    display_name: "Sport",
    description:
      "Athletic performance mode for soccer, striker/false 9 movement, finishing, match review, training, and scooter progression.",
    keywords: [
      "soccer",
      "striker",
      "false 9",
      "football",
      "match",
      "goal",
      "training",
      "movement",
      "finishing",
      "pressing",
      "scooter",
      "trick",
    ],
    proof_examples: [
      "match review",
      "training log",
      "finishing drill record",
      "movement analysis",
      "scooter progression note",
    ],
    weak_evidence_examples: [
      "Saying performance was good or bad without detail",
      "No next drill",
      "No match transfer",
    ],
    strong_evidence_examples: [
      "A match review with movement quality, best action, repeated mistake, and next training focus",
    ],
    elite_evidence_examples: [
      "A training cycle linking match weakness, drill, measurable repetition, and next match transfer",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      sport: [
        "match behaviour",
        "movement detail",
        "feedback quality",
        "next drill",
        "transfer to match context",
      ],
    },
    research_needs: [
      "position demands",
      "movement patterns",
      "energy management",
      "skill transfer",
    ],
    tone_adjustments:
      "Performance-focused, practical, movement-specific.",
    is_default: true,
    is_active: true,
  },
  {
    mode_id: "BRAND",
    display_name: "Brand",
    description:
      "Personal brand and content mode for LinkedIn, Instagram, YouTube, captions, scripts, and proof-based identity.",
    keywords: [
      "brand",
      "LinkedIn",
      "Instagram",
      "YouTube",
      "caption",
      "reel",
      "content",
      "script",
      "post",
      "video",
    ],
    proof_examples: [
      "caption",
      "reel script",
      "LinkedIn post",
      "YouTube concept",
      "brand positioning note",
    ],
    weak_evidence_examples: [
      "Generic hustle content",
      "No proof angle",
      "No audience value",
    ],
    strong_evidence_examples: [
      "A post with a clear hook, proof-based identity angle, and publishable structure",
    ],
    elite_evidence_examples: [
      "A content asset showing original insight, evidence of progress, clean hook, and platform-specific execution",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      brand: [
        "hook strength",
        "proof-based identity angle",
        "clarity",
        "originality",
        "publishability",
      ],
    },
    research_needs: [
      "audience",
      "platform format",
      "proof angle",
      "content structure",
    ],
    tone_adjustments:
      "Original, proof-based, not generic hustle content.",
    is_default: true,
    is_active: true,
  },
  {
    mode_id: "CAREER_MONEY",
    display_name: "Career/Money",
    description:
      "Career and financial literacy mode for jobs, resumes, cover letters, pathways, budgeting, cars, investing, income, and decision-making.",
    keywords: [
      "job",
      "resume",
      "cover letter",
      "career",
      "paralegal",
      "law clerk",
      "money",
      "finance",
      "budget",
      "invest",
      "car",
      "income",
      "salary",
    ],
    proof_examples: [
      "resume edit",
      "cover letter",
      "budget review",
      "decision analysis",
      "career application tracker",
    ],
    weak_evidence_examples: [
      "Choosing based on impulse",
      "Ignoring downside risk",
      "No decision rule",
    ],
    strong_evidence_examples: [
      "A decision note using utility, cost, risk, upside, opportunity cost, and final rule",
    ],
    elite_evidence_examples: [
      "A career or money decision with practical action, risk management, upside analysis, and next measurable step",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      career_money: [
        "opportunity cost",
        "downside risk",
        "earning or skill upside",
        "practical decision rule",
      ],
    },
    research_needs: [
      "cost",
      "risk",
      "upside",
      "market reality",
      "decision rule",
    ],
    tone_adjustments:
      "Practical, risk-aware, opportunity-cost focused.",
    is_default: true,
    is_active: true,
  },
];

export const GENERAL_DEFAULT_MODES: EblockiDefaultMode[] = [
  {
    mode_id: "EXECUTION",
    display_name: "Execution",
    description:
      "General execution mode for converting goals into proof artifacts.",
    keywords: [
      "goal",
      "task",
      "project",
      "focus",
      "habit",
      "routine",
      "study",
      "work",
      "improve",
      "build",
    ],
    proof_examples: [
      "completed task artifact",
      "short reflection",
      "next action log",
      "weekly proof review",
    ],
    weak_evidence_examples: [
      "Thinking about the task without producing anything",
      "Planning without an artifact",
    ],
    strong_evidence_examples: [
      "A finished output with reflection and next step",
    ],
    elite_evidence_examples: [
      "A proof cycle showing output, feedback, correction, and next upgrade",
    ],
    preferred_response_framework: DEFAULT_RESPONSE_FRAMEWORK,
    scoring_criteria: {
      execution: [
        "clarity",
        "artifact produced",
        "reflection",
        "feedback",
        "next upgrade",
      ],
    },
    research_needs: [
      "user domain",
      "success standard",
      "proof format",
      "bottleneck",
    ],
    tone_adjustments:
      "Direct, structured, proof-first.",
    is_default: true,
    is_active: true,
  },
];

export function getDefaultModesForPreset(
  preset: DefaultModePresetId
): EblockiDefaultMode[] {
  if (preset === "tristan") return TRISTAN_DEFAULT_MODES;
  return GENERAL_DEFAULT_MODES;
}
