import type { Mode } from "./modes";

export type EvidenceStrength = "weak" | "moderate" | "strong" | "elite";

export interface ProofScore {
  score: number;          // 1..10
  strength: EvidenceStrength;
  feedback: string;
  nextUpgrade: string;
}

const HEURISTICS: Record<string, { keywords: string[]; label: string }[]> = {
  law: [
    { keywords: ["issue"], label: "issue" },
    { keywords: ["rule", "section", "s ", "act"], label: "rule/authority" },
    { keywords: ["apply", "application", "on the facts"], label: "application" },
    { keywords: ["counter", "however", "alternatively"], label: "counterargument" },
    { keywords: ["conclu"], label: "conclusion" },
  ],
  psychology: [
    { keywords: ["concept", "define", "refers to"], label: "concept" },
    { keywords: ["apply", "example", "in practice"], label: "application" },
    { keywords: ["evidence", "study", "(20", "et al"], label: "evidence" },
    { keywords: ["evaluat", "limitation", "however"], label: "evaluation" },
    { keywords: ["mechanism", "because", "due to"], label: "mechanism" },
  ],
  sales: [
    { keywords: ["use case", "customer want", "needed"], label: "diagnosis" },
    { keywords: ["premium", "upgrade", "better"], label: "premium pain" },
    { keywords: ["gse", "warranty", "concierge"], label: "GSE attachment" },
    { keywords: ["objection", "pushback", "they said"], label: "objection handling" },
    { keywords: ["closed", "bought", "signed"], label: "close" },
  ],
  sport: [
    { keywords: ["minute", "min "], label: "minutes/context" },
    { keywords: ["movement", "run", "position"], label: "movement detail" },
    { keywords: ["mistake", "lost", "miss"], label: "honest feedback" },
    { keywords: ["next", "drill", "work on"], label: "next drill" },
    { keywords: ["match", "game"], label: "transfer to match" },
  ],
  discipline: [
    { keywords: ["state", "felt", "noticed"], label: "state diagnosis" },
    { keywords: ["bottleneck", "blocker", "friction"], label: "bottleneck" },
    { keywords: ["shipped", "produced", "wrote", "completed"], label: "artifact produced" },
    { keywords: ["reflect", "learned", "saw"], label: "reflection" },
    { keywords: ["next", "upgrade", "tomorrow"], label: "next upgrade" },
  ],
  brand: [
    { keywords: ["hook", "first line", "opener"], label: "hook" },
    { keywords: ["proof", "result", "evidence"], label: "proof-based angle" },
    { keywords: ["clear", "specific"], label: "clarity" },
    { keywords: ["original", "unique"], label: "originality" },
    { keywords: ["publish", "post", "ship"], label: "publishability" },
  ],
  career: [
    { keywords: ["opportunity cost", "instead of"], label: "opportunity cost" },
    { keywords: ["downside", "risk", "worst case"], label: "downside risk" },
    { keywords: ["upside", "earn", "skill", "compounds"], label: "upside" },
    { keywords: ["decide", "rule", "if/then"], label: "decision rule" },
  ],
  general: [
    { keywords: ["did", "shipped", "completed", "wrote"], label: "action" },
    { keywords: ["next"], label: "next step" },
    { keywords: ["learned", "noticed"], label: "reflection" },
  ],
};

function strengthFor(score: number): EvidenceStrength {
  if (score <= 3) return "weak";
  if (score <= 6) return "moderate";
  if (score <= 8) return "strong";
  return "elite";
}

export function scoreProof(domain: string, content: string, mode?: Mode): ProofScore {
  const text = (content || "").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const heuristics = HEURISTICS[domain] || HEURISTICS.general;

  let hits = 0;
  const matched: string[] = [];
  const missed: string[] = [];
  for (const h of heuristics) {
    if (h.keywords.some((k) => text.includes(k))) {
      hits++;
      matched.push(h.label);
    } else {
      missed.push(h.label);
    }
  }

  // base from coverage
  let score = Math.round((hits / heuristics.length) * 8);
  // length adjustment
  if (words < 30) score -= 2;
  else if (words >= 120) score += 1;
  if (words >= 250) score += 1;
  // bonus for self-correction language
  if (/\b(however|but|next time|upgrade|missed|i should have)\b/.test(text)) score += 1;

  score = Math.max(1, Math.min(10, score));
  const strength = strengthFor(score);

  const feedback = matched.length
    ? `Covered: ${matched.join(", ")}. ${missed.length ? `Missing: ${missed.join(", ")}.` : "Full coverage."} Length ${words} words.`
    : `No domain markers detected. Length ${words} words. Reframe using ${heuristics.map((h) => h.label).join(" / ")}.`;

  const nextUpgrade =
    strength === "elite"
      ? "Repeat under harder constraints (time pressure or higher rubric weight)."
      : missed.length
        ? `Add: ${missed.slice(0, 2).join(" + ")}.`
        : "Tighten the strongest section to publishable standard.";

  return { score, strength, feedback, nextUpgrade };
}
