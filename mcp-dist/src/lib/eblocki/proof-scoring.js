"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreProof = scoreProof;
exports.evidenceStrengthFromScore = evidenceStrengthFromScore;
exports.scoreProofArtifact = scoreProofArtifact;
const domain_standards_1 = require("./domain-standards");
const next_upgrade_extract_1 = require("./next-upgrade-extract");
const HEURISTICS = {
    law: [
        { keywords: ["issue"], label: "issue" },
        { keywords: ["rule", "section", "s ", "act", "authority"], label: "rule/authority" },
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
function strengthFor(score) {
    if (score <= 3)
        return "weak";
    if (score <= 6)
        return "moderate";
    if (score <= 8)
        return "strong";
    return "elite";
}
function scoreProof(domain, content, mode) {
    const text = (content || "").toLowerCase();
    const words = text.split(/\s+/).filter(Boolean).length;
    const heuristics = HEURISTICS[domain] || HEURISTICS.general;
    let hits = 0;
    const matched = [];
    const missed = [];
    for (const h of heuristics) {
        if (h.keywords.some((k) => text.includes(k))) {
            hits++;
            matched.push(h.label);
        }
        else {
            missed.push(h.label);
        }
    }
    let score = Math.round((hits / heuristics.length) * 8);
    if (words < 30)
        score -= 2;
    else if (words >= 120)
        score += 1;
    if (words >= 250)
        score += 1;
    if (/\b(however|but|next time|upgrade|missed|i should have)\b/.test(text))
        score += 1;
    score = Math.max(1, Math.min(10, score));
    const strength = strengthFor(score);
    const feedback = matched.length
        ? `Covered: ${matched.join(", ")}. ${missed.length ? `Missing: ${missed.join(", ")}.` : "Full coverage."} Length ${words} words.`
        : `No domain markers detected. Length ${words} words. Reframe using ${heuristics.map((h) => h.label).join(" / ")}.`;
    const nextUpgrade = strength === "elite"
        ? "Repeat under harder constraints (time pressure or higher rubric weight)."
        : missed.length
            ? `Add: ${missed.slice(0, 2).join(" + ")}.`
            : "Tighten the strongest section to publishable standard.";
    return { score, strength, feedback, nextUpgrade };
}
const DOMAIN_MARKERS = {
    law: ["issue", "rule", "application", "conclusion", "authority", "statute", "case", "jurisdiction", "counterargument", "citation"],
    law_academic: ["source", "jurisdiction", "authority", "current version", "key rule", "unit relevance", "assessment", "limitation", "confidence"],
    psychology: ["concept", "application", "evidence", "evaluation", "study", "research", "mechanism", "cognition", "behaviour", "development"],
    sales: ["customer", "objection", "gse", "warranty", "close", "premium", "pain", "diagnosis", "aov", "attachment"],
    eblocki: ["state", "proof", "artifact", "avoidance", "bottleneck", "friction", "upgrade", "control", "identity"],
    product: ["issue", "output", "screen", "corrected logic", "implementation", "test", "acceptance", "route", "standard", "upgrade"],
    sport: ["movement", "training", "match", "goal", "pressing", "finishing", "drill", "positioning", "energy"],
    brand: ["hook", "caption", "post", "script", "audience", "identity", "content", "publish", "original"],
    career_money: ["cost", "risk", "income", "opportunity", "resume", "cover letter", "budget", "decision", "upside"],
    general: ["proof", "reflection", "feedback", "upgrade", "action"],
};
function clampScore(score) {
    return Math.max(1, Math.min(10, Math.round(score)));
}
function evidenceStrengthFromScore(score) {
    if (score <= 3)
        return "weak";
    if (score <= 6)
        return "moderate";
    if (score <= 8)
        return "strong";
    return "elite";
}
function countDomainMarkers(domain, text) {
    const markers = DOMAIN_MARKERS[domain] ?? DOMAIN_MARKERS.general;
    const lower = text.toLowerCase();
    return markers.reduce((count, marker) => lower.includes(marker.toLowerCase()) ? count + 1 : count, 0);
}
function hasImplementationProof(text) {
    return /\b(file changes|logic implemented|tests added|build result|test result|commit|pull request|deployed|implemented)\b/i.test(text);
}
function scoreProofArtifact(input) {
    const domain = String(input.domain || "general").toLowerCase();
    const title = input.title?.trim() || "";
    const artifactType = input.artifactType?.trim() || "";
    const content = input.content?.trim() || "";
    const reflection = input.reflection?.trim() || "";
    const nextUpgrade = input.nextUpgrade?.trim() || "";
    // Standard selection scans title/content/reflection so product-system
    // critiques (coach, router, proof action card, specificity leak…) cannot
    // fall through to General Proof Standard just because artifactType is vague.
    const signalText = [title, content, reflection].filter(Boolean).join("\n");
    const standard = (0, domain_standards_1.selectDomainStandard)({ domain, artifactType, signalText });
    const combined = [title, artifactType, content, reflection, nextUpgrade].filter(Boolean).join("\n");
    const standardHits = standard.criteria.filter((criterion) => combined.toLowerCase().includes(criterion.split(" ")[0].toLowerCase())).length;
    let score = 1;
    if (title.length > 4)
        score += 1;
    if (artifactType.length > 2)
        score += 1;
    if (content.length >= 80)
        score += 1;
    if (content.length >= 250)
        score += 1;
    if (reflection.length >= 40)
        score += 1;
    if (nextUpgrade.length >= 20)
        score += 1;
    const markerCount = countDomainMarkers(domain, combined);
    if (markerCount >= 2)
        score += 1;
    if (markerCount >= 4)
        score += 1;
    if (standardHits >= 3)
        score += 1;
    const hasCorrectionLanguage = /\b(correct|improve|revise|upgrade|next time|weakness|feedback|mistake|fix|implementation|test)\b/i.test(combined);
    if (hasCorrectionLanguage)
        score += 1;
    let finalScore = clampScore(score);
    const evidenceBody = [title, artifactType, content, reflection].filter(Boolean).join("\n");
    const implementationProven = hasImplementationProof(evidenceBody);
    if (standard.key === "product_system_review_standard" && !implementationProven) {
        // Product-system reviews cap at strong 8 without shipped implementation
        // or external test evidence. Aspirational language in `nextUpgrade` does
        // not count.
        finalScore = Math.min(finalScore, 8);
    }
    if (standard.key === "general_proof_standard") {
        // General Proof Standard is a fallback, not a loophole. Elite requires a
        // concrete completed artifact (length + applied detail + feedback). Cap
        // at 8 otherwise so meta-analysis / plans / future intentions cannot
        // accidentally reach elite via the general path.
        const hasConcreteArtifact = content.length >= 250 && reflection.length >= 40 && /\b(shipped|completed|wrote|produced|published|submitted|recorded|delivered|built|drafted|ran|published|attached)\b/i.test(combined);
        if (!hasConcreteArtifact) {
            finalScore = Math.min(finalScore, 8);
        }
    }
    const evidenceStrength = evidenceStrengthFromScore(finalScore);
    let feedback = "";
    let suggestedUpgrade = "";
    if (evidenceStrength === "weak") {
        feedback = `Weak evidence against ${standard.label}. The artifact is too vague or underdeveloped.`;
        suggestedUpgrade = standard.missingStandard;
    }
    else if (evidenceStrength === "moderate") {
        feedback = `Moderate evidence against ${standard.label}. A concrete artifact exists, but standard coverage is still limited.`;
        suggestedUpgrade = standard.nextUpgrade;
    }
    else if (evidenceStrength === "strong") {
        feedback = `Strong evidence against ${standard.label}. The artifact shows applied skill and feedback awareness.`;
        suggestedUpgrade = standard.nextUpgrade;
    }
    else {
        feedback = `Elite evidence against ${standard.label}. The artifact includes action, application, feedback, and a clear upgrade path.`;
        suggestedUpgrade = "Preserve this standard and repeat it across the next proof cycle.";
    }
    const resolvedNextUpgrade = (0, next_upgrade_extract_1.extractNextUpgrade)({
        nextUpgrade,
        content,
        reflection,
        fallback: suggestedUpgrade,
    });
    return {
        qualityScore: finalScore,
        evidenceStrength,
        feedback,
        nextUpgrade: resolvedNextUpgrade,
    };
}
