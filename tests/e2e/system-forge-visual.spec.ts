import { test, expect } from "./fixtures/auth";

/**
 * Visual regression suite for the main System Forge screens.
 *
 * Captures element-level screenshots (not full-page) at the four states that
 * matter for the beta UX:
 *   1. Hero card
 *   2. Forge form (empty inputs)
 *   3. Active system panel (post-forge)
 *   4. Verdict block (post-rep)
 *   5. Recent reps list
 *
 * Baselines live under tests/e2e/__snapshots__/. Update with:
 *   bun run test:e2e:update
 *
 * Dynamic content (timestamps in the reps list) is masked so the diff only
 * catches real layout / styling shifts.
 */

const LAW_INPUT = {
  domain: "law",
  goal: "improve IRAC application",
  outcome: "produce stronger legal answers",
  bottleneck: "too much reading without timed output",
  minutes: "20",
};

const PROOF_TEXT =
  "Wrote one 10-minute IRAC paragraph on offer and acceptance using Carlill v Carbolic Smoke Ball as the authority. " +
  "Issue named in one sentence, rule stated, applied 3 facts, gave a defensible conclusion. " +
  "Weakness: application section was 60 words but only used 2 facts — next rep will apply 4 facts under the same 10-minute cap. " +
  "Time: 10 minutes. Words: 190. Correction: tighten rule statement to one sentence.";

test.describe("System Forge visual regression", () => {
  test("hero + empty form", async ({ authedPage: page }) => {
    await page.goto("/systems");
    await expect(page.getByTestId("system-forge-page")).toBeVisible();

    // Hero card — always rendered regardless of active-system state.
    await expect(page.getByTestId("system-forge-hero")).toHaveScreenshot("hero.png");

    // Open the forge form if the empty-state CTA is showing.
    const openForm = page.getByTestId("system-forge-open-form");
    if (await openForm.isVisible().catch(() => false)) {
      await openForm.click();
    }

    const formCard = page.getByTestId("system-forge-form-card");
    if (await formCard.isVisible().catch(() => false)) {
      await expect(formCard).toHaveScreenshot("form-empty.png");
    } else {
      // Account already has an active system — snapshot that instead so this
      // spec has stable coverage regardless of account state.
      await expect(page.getByTestId("system-forge-active")).toHaveScreenshot("active-existing.png", {
        mask: [page.locator("time"), page.getByTestId("system-forge-rep-item")],
      });
    }
  });

  test("active system + verdict + reps list", async ({ authedPage: page }) => {
    await page.goto("/systems");
    await expect(page.getByTestId("system-forge-page")).toBeVisible();

    const openForm = page.getByTestId("system-forge-open-form");
    if (await openForm.isVisible().catch(() => false)) {
      await openForm.click();
    }

    // Only run the create+rep flow if the form is available; otherwise the
    // account already has an active system and creating another would mutate
    // more state than this test should own.
    const formCard = page.getByTestId("system-forge-form-card");
    const hasForm = await formCard.isVisible().catch(() => false);
    if (!hasForm) {
      test.skip(true, "Account already has an active system — visual flow needs a fresh account.");
    }

    await page.getByTestId("system-forge-domain").fill(LAW_INPUT.domain);
    await page.getByTestId("system-forge-goal").fill(LAW_INPUT.goal);
    await page.getByTestId("system-forge-outcome").fill(LAW_INPUT.outcome);
    await page.getByTestId("system-forge-bottleneck").fill(LAW_INPUT.bottleneck);
    await page.getByTestId("system-forge-minutes").fill(LAW_INPUT.minutes);
    await page.getByTestId("system-forge-submit").click();

    const active = page.getByTestId("system-forge-active");
    await expect(active).toBeVisible();

    // Active panel, pre-rep. Mask any dynamic reps that might exist.
    await expect(page.getByTestId("system-forge-active-command")).toHaveScreenshot(
      "active-command.png",
    );

    // Start + submit the rep.
    await page.getByTestId("system-forge-start-rep").click();
    await page.getByTestId("system-forge-proof").fill(PROOF_TEXT);
    await page.getByTestId("system-forge-self-score").fill("6");
    await page.getByTestId("system-forge-submit-proof").click();

    // Verdict block. Verdict copy is deterministic given the same proof text,
    // domain, and self-score, so no masking is needed.
    const verdict = page.getByTestId("system-forge-verdict");
    await expect(verdict).toBeVisible({ timeout: 15_000 });
    await expect(verdict).toHaveScreenshot("verdict.png");

    // Recent reps list — mask each item's timestamp (rendered via
    // toLocaleString) so the pixel diff only catches structural changes.
    const repsList = page.getByTestId("system-forge-reps-list");
    await expect(repsList).toBeVisible();
    await expect(repsList).toHaveScreenshot("reps-list.png", {
      mask: [repsList.locator("span.text-xs.text-muted-foreground")],
    });
  });
});