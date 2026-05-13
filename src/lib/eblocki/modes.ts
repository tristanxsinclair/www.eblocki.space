export type Mode =
  | "LAW_MAX"
  | "PSYCH_HD"
  | "SALES_CLOSE"
  | "EBLOCKI"
  | "SPORT"
  | "BRAND"
  | "CAREER_MONEY"
  | "GENERAL_EXECUTION";

export interface UserMode {
  id?: string;
  user_id?: string;
  mode_id: string;
  display_name: string;
  description: string;
  keywords: string[];
  proof_examples: string[];
  weak_evidence_examples: string[];
  strong_evidence_examples: string[];
  elite_evidence_examples: string[];
  preferred_response_framework: string;
  scoring_criteria: Record<string, string[] | string>;
  research_needs: string[];
  tone_adjustments: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ModeDetectionResult {
  primary: Mode | string;
  hybrid?: Mode | string;
  customMode?: UserMode | null;
  isCustomMode: boolean;
}

const KEYWORDS: Record<Exclude<Mode, "GENERAL_EXECUTION">, string[]> = {
  LAW_MAX: [
    "law","laws1005","laws1006","legal","case","statute","statutory","irac",
    "aglc","precedent","ratio","obiter","jurisdiction","court","judicial",
    "exam","tort","contract","constitution","crimes","civil","equity",
  ],
  PSYCH_HD: [
    "psychology","psyc1000","cognition","cognitive","learning","memory",
    "development","motivation","mental health","behaviour","behavior",
    "social media","attention","evidence-based","caee","neuro","schema",
  ],
  SALES_CLOSE: [
    "good guys","tgg","sales","gse","warranty","customer","objection",
    "close","commission","aov","upsell","attachment","appliance","tv",
    "laptop","fridge","washer","vacuum","premium product",
  ],
  EBLOCKI: [
    "eblocki","discipline","productivity","avoidance","habit","routine",
    "accountability","proof","daily control","identity","system","focus",
    "streak","behind","scattered","overwhelmed","procrastinat",
  ],
  SPORT: [
    "soccer","striker","false 9","football","match","goal","training",
    "cockburn","movement","finishing","pressing","scooter","trick",
    "fitness","sprint","conditioning",
  ],
  BRAND: [
    "brand","linkedin","instagram","youtube","caption","reel","content",
    "script","post","video","tiktok","thumbnail","hook",
  ],
  CAREER_MONEY: [
    "job","resume","cv","cover letter","career","paralegal","law clerk",
    "money","finance","budget","invest","car","income","salary","interview",
  ],
};

export interface ModeDetection {
  primary: Mode;
  hybrid?: Mode;
  scores: Record<Mode, number>;
}

export function scoreKeywordMatch(text: string, keywords: string[] = []): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, keyword) => {
    const clean = String(keyword || "").trim().toLowerCase();
    if (!clean) return score;
    if (lower.includes(clean)) {
      return score + (clean.length > 8 ? 3 : clean.length > 4 ? 2 : 1);
    }
    return score;
  }, 0);
}

function detectMode(text: string): ModeDetection {
  const t = text.toLowerCase();
  const scores = {
    LAW_MAX: 0, PSYCH_HD: 0, SALES_CLOSE: 0, EBLOCKI: 0,
    SPORT: 0, BRAND: 0, CAREER_MONEY: 0, GENERAL_EXECUTION: 0,
  } as Record<Mode, number>;

  (Object.keys(KEYWORDS) as (keyof typeof KEYWORDS)[]).forEach((m) => {
    for (const kw of KEYWORDS[m]) {
      if (t.includes(kw)) scores[m] += kw.length > 6 ? 2 : 1;
    }
  });

const sorted = (Object.entries(scores) as [Mode, number][])
    .sort((a, b) => b[1] - a[1]);

  const [top, secondary] = sorted;
  if (top[1] === 0) {
    return { primary: "GENERAL_EXECUTION", scores };
  }
  const result: ModeDetection = { primary: top[0], scores };
  if (secondary && secondary[1] >= Math.max(2, top[1] * 0.6) && secondary[0] !== top[0]) {
    result.hybrid = secondary[0];
  }
  return result;
}

export function detectPersonalisedMode(text: string, userModes: UserMode[]): ModeDetectionResult | null {
  const activeModes = userModes.filter((mode) => mode.is_active !== false);
  if (activeModes.length === 0) return null;

  const scored = activeModes
    .map((mode) => {
      const keywordScore = scoreKeywordMatch(text, mode.keywords ?? []);
      const nameScore = scoreKeywordMatch(text, [mode.mode_id, mode.display_name, mode.description ?? ""]);
      const proofScore = scoreKeywordMatch(text, mode.proof_examples ?? []);
      const researchScore = scoreKeywordMatch(text, mode.research_needs ?? []);
      return {
        mode,
        score: keywordScore + nameScore + proofScore + researchScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) return null;

  return {
    primary: best.mode.mode_id,
    hybrid: undefined,
    customMode: best.mode,
    isCustomMode: true,
  };
}

export function detectModeWithUserModes(text: string, userModes: UserMode[]) {
  const personalised = detectPersonalisedMode(text, userModes);
  if (personalised) return personalised;
  const fallback = detectMode(text);
  return { primary: fallback.primary, hybrid: fallback.hybrid, customMode: null, isCustomMode: false };
}

export const MODE_LABELS: Record<Mode, string> = {
  LAW_MAX: "Law Max",
  PSYCH_HD: "Psych HD",
  SALES_CLOSE: "Sales Close",
  EBLOCKI: "Eblocki",
  SPORT: "Sport",
  BRAND: "Brand",
  CAREER_MONEY: "Career / Money",
  GENERAL_EXECUTION: "General Execution",
};

export const MODE_DOMAINS: Record<Mode, string> = {
  LAW_MAX: "law",
  PSYCH_HD: "psychology",
  SALES_CLOSE: "sales",
  EBLOCKI: "discipline",
  SPORT: "sport",
  BRAND: "brand",
  CAREER_MONEY: "career",
  GENERAL_EXECUTION: "general",
};
