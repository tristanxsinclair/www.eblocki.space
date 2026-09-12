import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lightweight visual-consistency guard.
 *
 * Scans every proof-related surface for design-token violations after the
 * Monolithic Precision refactor. If a component reintroduces a hardcoded
 * color, a purple/indigo accent, or an arbitrary hex, this test fails with
 * a pointer to the exact line.
 *
 * When you *intentionally* need one of these classes (rare — prefer a
 * semantic token in index.css), add it to ALLOWED_EXCEPTIONS with a note.
 */

const ROOT = join(__dirname, "..", "..", "..", "..");

const FILES = [
  "src/components/eblocki/ProofCapture.tsx",
  "src/components/eblocki/ProofClosureCard.tsx",
  "src/components/eblocki/ProofContractCard.tsx",
  "src/components/eblocki/ProofStandardPreviewPanel.tsx",
  "src/components/eblocki/ProofWeekPanel.tsx",
  "src/components/eblocki/Badges.tsx",
  "src/components/eblocki/CourtVerdictBadge.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/Proof.tsx",
  "src/pages/ProofWeek.tsx",
];

// Forbidden Tailwind class patterns. Each entry is a regex plus a
// human-readable reason surfaced on failure.
const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-white\b/, reason: "hardcoded white — use foreground/background tokens" },
  { pattern: /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-black\b/, reason: "hardcoded black — use foreground/background tokens" },
  { pattern: /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-(?:slate|gray|zinc|neutral|stone)-\d{2,3}\b/, reason: "raw palette color — use semantic token (muted, card, foreground, border)" },
  { pattern: /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-(?:purple|indigo|violet|fuchsia|pink|rose|blue|sky|cyan|teal|emerald|lime|yellow|amber|orange|red)-\d{2,3}\b/, reason: "off-palette hue — use primary/accent/warning/destructive/success token" },
  { pattern: /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/, reason: "arbitrary hex — move to index.css as a semantic token" },
  { pattern: /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-\[rgb/, reason: "arbitrary rgb() — move to index.css as a semantic token" },
];

// Per-file exceptions. Keep this list tiny and justified.
const ALLOWED_EXCEPTIONS: Record<string, RegExp[]> = {};

function scan(relPath: string) {
  const abs = join(ROOT, relPath);
  const source = readFileSync(abs, "utf8");
  const lines = source.split("\n");
  const violations: string[] = [];
  const exceptions = ALLOWED_EXCEPTIONS[relPath] ?? [];

  lines.forEach((line, idx) => {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    if (exceptions.some((rx) => rx.test(line))) return;
    for (const { pattern, reason } of FORBIDDEN) {
      const match = line.match(pattern);
      if (match) {
        violations.push(`${relPath}:${idx + 1}  ${reason}\n    → ${match[0]}   (line: ${line.trim()})`);
      }
    }
  });

  return violations;
}

describe("proof UI design-token consistency", () => {
  for (const file of FILES) {
    it(`${file} uses only semantic design tokens`, () => {
      const violations = scan(file);
      expect(
        violations,
        violations.length ? `\n${violations.join("\n")}\n` : undefined,
      ).toEqual([]);
    });
  }
});
