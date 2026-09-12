"use strict";
/**
 * Extract the actual "next upgrade" line from proof artifact inputs.
 *
 * Priority:
 *   1. Explicit `nextUpgrade` field (cleaned + capped). If that field is
 *      itself a long paste, prefer any embedded "Next upgrade:" line.
 *   2. A "Next upgrade:" or "Next required proof:" line inside `content`.
 *   3. The generated `fallback` (e.g. domain-standard upgrade).
 *   4. Safe default.
 *
 * Display is hard-capped around 280 characters so the verdict card never
 * shows the entire artifact body in the Next Upgrade slot.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEXT_UPGRADE_MAX_CHARS = void 0;
exports.extractNextUpgrade = extractNextUpgrade;
exports.NEXT_UPGRADE_MAX_CHARS = 280;
function cap(value, max = exports.NEXT_UPGRADE_MAX_CHARS) {
    const trimmed = value.trim();
    if (trimmed.length <= max)
        return trimmed;
    return trimmed.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}
function extractLine(text) {
    if (!text)
        return "";
    // Match a "Next upgrade:" / "Next required proof:" lead, then capture the
    // rest of that line plus following indented or continuation lines until
    // the next labelled heading (e.g. "Acceptance test:", "Plan:") or blank line.
    const re = /(?:^|\n)\s*(?:next\s+upgrade|next\s+required\s+proof)\s*[:-]\s*([^\n]+(?:\n(?!\s*(?:[a-z][a-z0-9 _-]{2,30}\s*:|$))[^\n]+)*)/i;
    const m = text.match(re);
    if (!m)
        return "";
    return m[1].replace(/\s+/g, " ").trim();
}
function extractNextUpgrade(input) {
    const raw = (input.nextUpgrade ?? "").trim();
    if (raw) {
        // If the user pasted the whole artifact into the next-upgrade field,
        // prefer any embedded "Next upgrade:" line; otherwise just cap the raw text.
        const embedded = extractLine(raw);
        if (embedded)
            return cap(embedded);
        return cap(raw);
    }
    const fromContent = extractLine(input.content ?? "");
    if (fromContent)
        return cap(fromContent);
    const fromReflection = extractLine(input.reflection ?? "");
    if (fromReflection)
        return cap(fromReflection);
    const fallback = (input.fallback ?? "").trim();
    if (fallback)
        return cap(fallback);
    return "Submit implementation or external test evidence.";
}
