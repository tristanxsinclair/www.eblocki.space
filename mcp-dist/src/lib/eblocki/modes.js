"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODE_DOMAINS = exports.MODE_LABELS = void 0;
exports.scoreKeywordMatch = scoreKeywordMatch;
exports.detectMode = detectMode;
exports.detectPersonalisedMode = detectPersonalisedMode;
exports.detectModeWithUserModes = detectModeWithUserModes;
const KEYWORDS = {
    LAW_MAX: [
        "law", "laws1005", "laws1006", "legal", "case", "statute", "statutory", "irac",
        "aglc", "precedent", "ratio", "obiter", "jurisdiction", "court", "judicial",
        "exam", "tort", "contract", "constitution", "crimes", "civil", "equity",
    ],
    PSYCH_HD: [
        "psychology", "psyc1000", "cognition", "cognitive", "learning", "memory",
        "development", "motivation", "mental health", "behaviour", "behavior",
        "social media", "attention", "evidence-based", "caee", "neuro", "schema",
    ],
    SALES_CLOSE: [
        "good guys", "tgg", "sales", "gse", "warranty", "customer", "objection",
        "close", "commission", "aov", "upsell", "attachment", "appliance", "tv",
        "laptop", "fridge", "washer", "vacuum", "premium product",
    ],
    EBLOCKI: [
        "eblocki", "discipline", "productivity", "avoidance", "habit", "routine",
        "accountability", "proof", "daily control", "identity", "system", "focus",
        "streak", "behind", "scattered", "overwhelmed", "procrastinat",
    ],
    SPORT: [
        "soccer", "striker", "false 9", "football", "match", "goal", "training",
        "cockburn", "movement", "finishing", "pressing", "scooter", "trick",
        "fitness", "sprint", "conditioning",
    ],
    BRAND: [
        "brand", "linkedin", "instagram", "youtube", "caption", "reel", "content",
        "script", "post", "video", "tiktok", "thumbnail", "hook",
    ],
    CAREER_MONEY: [
        "job", "resume", "cv", "cover letter", "career", "paralegal", "law clerk",
        "money", "finance", "budget", "invest", "car", "income", "salary", "interview",
    ],
};
function scoreKeywordMatch(text, keywords = []) {
    const lower = text.toLowerCase();
    return keywords.reduce((score, keyword) => {
        const clean = String(keyword || "").trim().toLowerCase();
        if (!clean)
            return score;
        if (lower.includes(clean)) {
            return score + (clean.length > 8 ? 3 : clean.length > 4 ? 2 : 1);
        }
        return score;
    }, 0);
}
function detectMode(text) {
    const t = text.toLowerCase();
    const scores = {
        LAW_MAX: 0, PSYCH_HD: 0, SALES_CLOSE: 0, EBLOCKI: 0,
        SPORT: 0, BRAND: 0, CAREER_MONEY: 0, GENERAL_EXECUTION: 0,
    };
    Object.keys(KEYWORDS).forEach((m) => {
        for (const kw of KEYWORDS[m]) {
            if (t.includes(kw))
                scores[m] += kw.length > 6 ? 2 : 1;
        }
    });
    const sorted = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);
    const [top, secondary] = sorted;
    if (top[1] === 0) {
        return { primary: "GENERAL_EXECUTION", scores };
    }
    const result = { primary: top[0], scores };
    if (secondary && secondary[1] >= Math.max(2, top[1] * 0.6) && secondary[0] !== top[0]) {
        result.hybrid = secondary[0];
    }
    return result;
}
function detectPersonalisedMode(text, userModes) {
    const activeModes = userModes.filter((mode) => mode.is_active !== false);
    if (activeModes.length === 0)
        return null;
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
    if (!best || best.score <= 0)
        return null;
    return {
        primary: best.mode.mode_id,
        hybrid: undefined,
        customMode: best.mode,
        isCustomMode: true,
    };
}
function detectModeWithUserModes(text, userModes) {
    const personalised = detectPersonalisedMode(text, userModes);
    if (personalised)
        return personalised;
    const fallback = detectMode(text);
    return { primary: fallback.primary, hybrid: fallback.hybrid, customMode: null, isCustomMode: false };
}
exports.MODE_LABELS = {
    LAW_MAX: "Law Max",
    PSYCH_HD: "Psych HD",
    SALES_CLOSE: "Sales Close",
    EBLOCKI: "Eblocki",
    SPORT: "Sport",
    BRAND: "Brand",
    CAREER_MONEY: "Career / Money",
    GENERAL_EXECUTION: "General Execution",
};
exports.MODE_DOMAINS = {
    LAW_MAX: "law",
    PSYCH_HD: "psychology",
    SALES_CLOSE: "sales",
    EBLOCKI: "discipline",
    SPORT: "sport",
    BRAND: "brand",
    CAREER_MONEY: "career",
    GENERAL_EXECUTION: "general",
};
