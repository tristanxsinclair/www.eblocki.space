"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSensitiveData = checkSensitiveData;
exports.checkAnalysisSafety = checkAnalysisSafety;
exports.getProofStandardLookup = getProofStandardLookup;
exports.runProofCheck = runProofCheck;
exports.buildRefusalPayload = buildRefusalPayload;
const proof_contract_1 = require("./proof-contract");
const proof_standard_preview_1 = require("./proof-standard-preview");
const domain_standards_1 = require("./domain-standards");
const coach_router_1 = require("./coach-router");
const proof_scoring_1 = require("./proof-scoring");
const fake_study_detector_1 = require("./fake-study-detector");
const READ_ONLY_NOTICE = "Read-only proof analysis on pasted text only. No account access, saved history, or write actions.";
const LIMITATIONS = [
    "Judges only the text supplied in this request.",
    "Does not verify external truth, files, links, screenshots, or live systems.",
    "Does not access Supabase, saved account history, dashboard state, or prior sessions.",
    "Returns rubric-based evidence judgment only, not a factual certification of completion.",
];
const SENSITIVE_PATTERNS = [
    { reason: "password", pattern: /\bpassword\s*[:=]/i },
    { reason: "api_key", pattern: /\b(api[_ -]?key|secret key)\s*[:=]/i },
    { reason: "access_token", pattern: /\b(access token|bearer token|refresh token)\s*[:=]/i },
    { reason: "private_key", pattern: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/i },
    { reason: "credit_card", pattern: /\b(?:\d[ -]*?){13,19}\b/ },
    { reason: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
    { reason: "government_id", pattern: /\b(passport number|driver'?s license|driver licence|national id|tax file number|tfn)\b/i },
    { reason: "health_data", pattern: /\b(medicare number|health insurance number|medical record number)\b/i },
];
const ANALYSIS_BLOCK_PATTERNS = [
    { reason: "ignore_rules", pattern: /\b(ignore|bypass|override)\b[^.\n]{0,40}\b(rule|rules|policy|policies|instruction|instructions|safety)\b/i },
    { reason: "invent_evidence", pattern: /\b(invent|fabricate|make up|fake)\b[^.\n]{0,50}\b(evidence|proof|artifact|citation|result)\b/i },
    { reason: "force_completion_claim", pattern: /\b(tell me|say|claim)\b[^.\n]{0,40}\b(i'?m|i am|we are)\b[^.\n]{0,20}\b(done|finished|completed)\b/i },
    { reason: "saved_account_data_request", pattern: /\b(use|check|read|pull)\b[^.\n]{0,50}\b(saved|stored|account|dashboard|history|supabase|user data)\b/i },
    { reason: "write_action_request", pattern: /\b(save|write|sync|store|push|update|send)\b[^.\n]{0,50}\b(dashboard|account|supabase|history|result|verdict)\b/i },
];
const CLAIM_SPLIT_RE = /[\n.!?]+/;
const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "the",
    "to",
    "of",
    "or",
    "with",
    "for",
    "in",
    "on",
    "by",
    "where",
    "when",
    "from",
]);
const EVIDENCE_HINTS = {
    law_irac_standard: {
        "issue identified": ["issue"],
        "rule stated accurately": ["rule", "legal rule"],
        "authority used": ["authority", "case", "statute", "section", "citation"],
        "application to facts": ["application", "facts", "applied"],
        conclusion: ["conclusion", "therefore"],
        "counterargument or limitation where relevant": ["counterargument", "however", "limitation", "alternative"],
        "citation precision": ["citation", "section", "v"],
    },
    law_source_bank_standard: {
        "source name": ["source", "case", "statute"],
        jurisdiction: ["jurisdiction"],
        "authority level": ["authority level", "binding", "persuasive"],
        "current version checked": ["current version", "access checked", "updated"],
        "key provision/material": ["provision", "material"],
        "key rule": ["key rule", "rule"],
        "unit relevance": ["relevance", "unit"],
        "assessment use": ["assessment", "use"],
        "limitation/counterargument": ["limitation", "counterargument"],
        "confidence rating": ["confidence"],
    },
    academic_proof_plan_standard: {
        "unit objective clear": ["objective", "goal"],
        "weekly artifact system": ["weekly", "artifact"],
        "authoritative source strategy": ["source strategy", "authority"],
        "proof cadence": ["cadence", "schedule", "every week"],
        "feedback loop": ["feedback"],
        "assessment relevance": ["assessment", "exam"],
        "first executable artifact": ["first artifact", "next artifact"],
    },
    product_system_review_standard: {
        "specific product issue identified": ["issue", "bug", "wrong"],
        "evidence from actual output/screen": ["screen", "output", "actual"],
        "corrected logic proposed": ["corrected logic", "should", "instead"],
        "implementation path stated": ["implementation", "path", "change"],
        "measurable test or acceptance criterion": ["test", "acceptance", "verify"],
        "next upgrade defined": ["next", "upgrade"],
    },
    eblocki_implementation_standard: {
        "file changes made": ["file", "changed"],
        "logic implemented": ["implemented", "logic"],
        "UI updated where relevant": ["ui", "screen"],
        "tests added": ["test", "spec"],
        "build/test result shown": ["build", "passed", "result"],
        "no new lint debt in touched files": ["lint"],
        "user-facing behaviour improved": ["user-facing", "behaviour", "behavior"],
    },
    general_proof_standard: {
        "visible artifact": ["artifact", "draft", "submission", "recording", "output"],
        "applied detail": ["applied", "specific", "details"],
        "feedback awareness": ["feedback", "mistake", "improve"],
        "next upgrade": ["next", "upgrade"],
    },
};
function clean(value) {
    return (value ?? "").trim();
}
function lower(value) {
    return clean(value).toLowerCase();
}
function clipList(values, limit = 3) {
    return values.filter(Boolean).slice(0, limit);
}
function splitClaims(text) {
    return text
        .split(CLAIM_SPLIT_RE)
        .map((part) => clean(part))
        .filter(Boolean);
}
function tokenise(value) {
    return lower(value)
        .split(/[^a-z0-9]+/)
        .filter((token) => token && !STOP_WORDS.has(token));
}
function findEvidenceHints(standard, evidence) {
    return (EVIDENCE_HINTS[standard.key]?.[evidence] ??
        tokenise(evidence).slice(0, 3));
}
function hasAny(text, patterns) {
    return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}
function detectMissingEvidence(standard, artifactText) {
    const lowerArtifact = lower(artifactText);
    return standard.requiredEvidence.filter((evidence) => {
        const hints = findEvidenceHints(standard, evidence);
        return !hasAny(lowerArtifact, hints);
    });
}
function detectWeakClaims(artifactText) {
    return clipList(splitClaims(artifactText).filter((claim) => {
        const text = lower(claim);
        return (text.length < 60 &&
            /\b(plan|should|might|want|need to|going to|try to)\b/.test(text));
    }));
}
function detectUnsupportedClaims(artifactText) {
    return clipList(splitClaims(artifactText).filter((claim) => {
        const text = lower(claim);
        const claimsCompletion = /\b(done|completed|fixed|proved|implemented|mastered|finished|solved|deployed)\b/.test(text);
        const hasEvidenceMarker = /\b(file|test|result|screenshot|screen|attached|because|evidence|artifact|submitted|published|recorded|built)\b/.test(text);
        return claimsCompletion && !hasEvidenceMarker;
    }));
}
function resolveRisk(params) {
    let score = 0;
    if (params.strength === "weak")
        score += 2;
    else if (params.strength === "moderate")
        score += 1;
    if (params.studyVerdict === "weak")
        score += 2;
    else if (params.studyVerdict === "useful")
        score += 1;
    if (params.unsupportedClaims.length > 0)
        score += 2;
    if (params.weakClaims.length > 0)
        score += 1;
    if (params.routeIntent === "execution_lock")
        score += 1;
    if (score >= 5)
        return "high";
    if (score >= 3)
        return "medium";
    return "low";
}
function standardForInput(input, fallbackKey) {
    if (input.selectedStandard)
        return (0, domain_standards_1.getDomainStandard)(input.selectedStandard);
    return (0, domain_standards_1.getDomainStandard)(fallbackKey);
}
function modeForDomain(domain) {
    switch (domain) {
        case "law":
        case "law_academic":
            return "LAW_MAX";
        case "psychology":
            return "PSYCH_HD";
        case "sales":
            return "SALES_CLOSE";
        case "sport":
            return "SPORT";
        case "brand":
            return "BRAND";
        case "product":
        case "eblocki":
            return "EBLOCKI";
        case "career_money":
        case "finance":
            return "CAREER_MONEY";
        default:
            return "GENERAL_EXECUTION";
    }
}
function buildInputSignal(input) {
    return [clean(input.goal), clean(input.domainHint), clean(input.artifactText)]
        .filter(Boolean)
        .join("\n");
}
function isEmptyArtifact(text) {
    return clean(text).length === 0;
}
function checkSensitiveData(text) {
    const reasons = SENSITIVE_PATTERNS
        .filter(({ pattern }) => pattern.test(text))
        .map(({ reason }) => reason);
    return {
        blocked: reasons.length > 0,
        reasons,
    };
}
function checkAnalysisSafety(input) {
    const combined = buildInputSignal(input);
    const reasons = [];
    if (isEmptyArtifact(input.artifactText)) {
        reasons.push("empty_artifact");
    }
    reasons.push(...ANALYSIS_BLOCK_PATTERNS
        .filter(({ pattern }) => pattern.test(combined))
        .map(({ reason }) => reason));
    reasons.push(...checkSensitiveData(combined).reasons);
    return {
        blocked: reasons.length > 0,
        reasons: [...new Set(reasons)],
    };
}
function getProofStandardLookup(input) {
    const signalText = [clean(input.goal), clean(input.domainHint)].filter(Boolean).join("\n");
    const route = (0, coach_router_1.routeCoachInput)(signalText || "proof artifact");
    const preview = (0, proof_standard_preview_1.buildProofStandardPreview)({
        domain: input.domainHint || route.domain,
        intent: route.intent,
        artifactType: route.recommendedProofArtifact.artifactType,
        proofAction: route.recommendedProofArtifact.action,
        signalText,
    });
    const standard = input.selectedStandard
        ? (0, domain_standards_1.getDomainStandard)(input.selectedStandard)
        : (0, domain_standards_1.getDomainStandard)(preview.standardKey);
    return {
        standardKey: standard.key,
        standardLabel: standard.label,
        requiredEvidence: standard.requiredEvidence,
        missingStandard: standard.missingStandard,
        eliteVersion: standard.eliteVersion,
        nextUpgrade: standard.nextUpgrade,
    };
}
function runProofCheck(input) {
    const artifactText = clean(input.artifactText);
    const signalText = buildInputSignal(input);
    const route = (0, coach_router_1.routeCoachInput)(signalText || artifactText || "proof artifact");
    const preview = (0, proof_standard_preview_1.buildProofStandardPreview)({
        domain: input.domainHint || route.domain,
        intent: route.intent,
        artifactType: route.recommendedProofArtifact.artifactType,
        proofAction: route.recommendedProofArtifact.action,
        signalText,
    });
    const standard = standardForInput(input, preview.standardKey);
    const scoring = (0, proof_scoring_1.scoreProofArtifact)({
        domain: input.domainHint || route.domain,
        title: clean(input.goal) || route.recommendedProofArtifact.title,
        artifactType: route.recommendedProofArtifact.artifactType,
        content: artifactText,
        reflection: "",
        nextUpgrade: "",
    });
    const study = (0, fake_study_detector_1.classifyStudyActivity)({
        title: clean(input.goal),
        artifactType: route.recommendedProofArtifact.artifactType,
        content: artifactText,
    });
    const missingEvidence = detectMissingEvidence(standard, artifactText);
    const weakClaims = detectWeakClaims(artifactText);
    const unsupportedClaims = detectUnsupportedClaims(artifactText);
    const selfDeceptionRisk = resolveRisk({
        strength: scoring.evidenceStrength,
        unsupportedClaims,
        weakClaims,
        studyVerdict: study.verdict,
        routeIntent: route.intent,
    });
    const proofContract = (0, proof_contract_1.buildProofContract)({
        message: signalText || artifactText || "proof artifact",
        assistantOutput: route.recommendedProofArtifact.action,
        mode: modeForDomain(route.domain),
    });
    const reasoningParts = [
        scoring.feedback,
        missingEvidence.length
            ? `Missing evidence: ${missingEvidence.join(", ")}.`
            : `Required evidence is visible for ${standard.label}.`,
        `Study verdict: ${study.verdict}. ${study.reason}`,
    ];
    return {
        verdict: scoring.evidenceStrength,
        score: scoring.qualityScore,
        selectedStandard: standard.key,
        standardLabel: standard.label,
        reasoningSummary: reasoningParts.join(" "),
        selfDeceptionRisk,
        limitations: LIMITATIONS,
        missingEvidence,
        weakClaims,
        unsupportedClaims,
        minimumNextArtifact: proofContract.requiredArtifact || route.recommendedProofArtifact.requiredArtifact,
        nextCommand: study.upgradeCommand || scoring.nextUpgrade || route.recommendedProofArtifact.action,
        recommendedArtifactType: route.recommendedProofArtifact.artifactType,
        proofQuestion: proof_contract_1.PROOF_QUESTION,
        modeWarning: route.intent === "product_system_review"
            ? "Judge product behaviour by output evidence, corrected logic, implementation path, and a measurable test."
            : route.intent === "execution_lock"
                ? "Planning does not count as proof. Produce one visible artifact first."
                : "",
        readOnlyNotice: READ_ONLY_NOTICE,
    };
}
function buildRefusalPayload(input) {
    const check = checkAnalysisSafety(input);
    return {
        refused: true,
        reasons: check.reasons,
        message: "This proof check can only judge non-sensitive pasted artifact text. It will not ignore rules, invent evidence, claim saved account access, or write/sync anything. Remove sensitive data and retry with a minimal artifact summary of the artifact itself.",
        limitations: LIMITATIONS,
        readOnlyNotice: READ_ONLY_NOTICE,
    };
}
