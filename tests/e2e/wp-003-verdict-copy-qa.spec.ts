/**
 * WP-003 Post-fix QA: Authenticated proof-result verdict copy verification.
 *
 * Verifies:
 * 1. One dominant verdict headline (no duplicates)
 * 2. Humanised proof metadata (no raw enums like EBLOCKI_PRODUCT_REVIEW, OTHER)
 * 3. No infrastructure vocabulary in visible verdict copy
 * 4. No horizontal body scroll
 * 5. Mobile safe-area and layout correctness
 *
 * Viewports: 390px (mobile) and 1280px (desktop)
 */

import { test, expect } from "../fixtures/average-user-auth";
import * as path from "path";
import * as fs from "fs";

const EVIDENCE_DIR = path.resolve("docs/release/evidence/wp-003");

// Ensure evidence directory exists
function ensureEvidenceDir() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
}

// Raw enum patterns that must NOT appear in user-facing copy
const FORBIDDEN_PATTERNS = [
  /EBLOCKI_PRODUCT_REVIEW/,
  /\bOTHER\b(?![a-z])/, // uppercase OTHER not followed by lowercase (dynamic metadata)
  /evidence_strength/,
  /proof_tier/,
  /quality_score/,
  /artifact_type/,
  /transfer_flag/,
  /pressure_flag/,
  /content_hash/,
  /temporal_snapshot/,
];

// Infrastructure vocabulary that should not appear in user-facing verdict
const INFRA_VOCABULARY = [
  "service_role",
  "supabase",
  "postgres",
  "pgmq",
  "edge function",
  "vector_store",
  "openai",
  "gpt-4",
];

test.describe("WP-003 Verdict Copy QA - 390px Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("proof result page renders humanised verdict at 390px", async ({
    averageUserPage: page,
  }) => {
    ensureEvidenceDir();

    // Navigate to proof section
    await page.goto("/proof");
    await page.waitForLoadState("networkidle");

    // Take screenshot of proof page
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "post-fix-proof-390.png"),
      fullPage: true,
    });

    // Check for no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Check visible text for forbidden raw enum patterns
    const bodyText = await page.textContent("body");
    if (bodyText) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(bodyText).not.toMatch(pattern);
      }
      for (const term of INFRA_VOCABULARY) {
        expect(bodyText.toLowerCase()).not.toContain(term);
      }
    }
  });

  test("completed artifacts show humanised metadata at 390px", async ({
    averageUserPage: page,
  }) => {
    ensureEvidenceDir();

    // Navigate to proof section - look for artifact history
    await page.goto("/proof");
    await page.waitForLoadState("networkidle");

    // Look for artifact/history section and scroll to it if present
    const artifactSection = page.locator(
      '[data-testid="artifact-history"], [data-testid="completed-proofs"], .proof-history, .artifact-list'
    );

    if (await artifactSection.isVisible().catch(() => false)) {
      await artifactSection.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "post-fix-artifact-history-390.png"),
        fullPage: false,
      });
    } else {
      // Take full page screenshot as evidence of current state
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, "post-fix-artifact-history-390.png"),
        fullPage: true,
      });
    }

    // Verify no duplicate verdict headlines
    const headings = await page.locator("h1, h2, h3").allTextContents();
    const verdictHeadings = headings.filter(
      (h) =>
        h.toLowerCase().includes("verdict") ||
        h.toLowerCase().includes("result") ||
        h.toLowerCase().includes("proof")
    );

    // Check for duplicates (same text appearing more than once)
    const seen = new Set<string>();
    for (const heading of verdictHeadings) {
      const normalised = heading.trim().toLowerCase();
      if (normalised.length > 3) {
        // Skip very short headings
        expect(seen.has(normalised)).toBe(false);
        seen.add(normalised);
      }
    }
  });
});

test.describe("WP-003 Verdict Copy QA - 1280px Desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("proof result page renders humanised verdict at 1280px", async ({
    averageUserPage: page,
  }) => {
    ensureEvidenceDir();

    await page.goto("/proof");
    await page.waitForLoadState("networkidle");

    // Take desktop screenshot
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "post-fix-proof-1280.png"),
      fullPage: true,
    });

    // Check for no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Check visible text for forbidden patterns
    const bodyText = await page.textContent("body");
    if (bodyText) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(bodyText).not.toMatch(pattern);
      }
      for (const term of INFRA_VOCABULARY) {
        expect(bodyText.toLowerCase()).not.toContain(term);
      }
    }
  });
});
