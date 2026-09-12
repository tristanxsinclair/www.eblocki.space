import { test, expect } from "./fixtures/auth";

/**
 * System Forge end-to-end flow.
 *
 * Covers:
 *  1. /systems loads for a signed-in user (no crash on empty state).
 *  2. Create a Law system with the canonical inputs.
 *  3. Active system panel renders with the "Start first rep" CTA.
 *  4. Submit a proof artifact → verdict / weakness / next upgrade appear.
 *  5. Refresh the page and assert the active system + past rep persist.
 *
 * Requires a Lovable-injected Supabase session (see fixtures/auth.ts).
 * Skips cleanly when no session is present so CI stays green pre-auth.
 */

const LAW_INPUT = {
  domain: "law",
  goal: "improve IRAC application",
  outcome: "produce stronger legal answers",
  bottleneck: "too much reading without timed output",
  minutes: "20",
};

const PROOF_TEXT = [
  "Wrote one 10-minute IRAC paragraph on offer and acceptance using Carlill v Carbolic Smoke Ball as the authority.",
  "Issue named in one sentence, rule stated, applied 3 facts, gave a defensible conclusion.",
  "Weakness: application section was 60 words but only used 2 facts — next rep will apply 4 facts under the same 10-minute cap.",
  "Time: 10 minutes. Words: 190. Correction: tighten rule statement to one sentence.",
].join(" ");

test.describe("System Forge", () => {
  test("law user can forge a system, submit a rep, and see it persist", async ({ authedPage: page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // 1. Load /systems – protected route should render (no auth redirect).
    await page.goto("/systems");
    await expect(page).toHaveURL(/\/systems$/);
    await expect(page.getByTestId("system-forge-page")).toBeVisible();

    // 2. Open the forge form (from empty-state CTA if it's shown).
    const openForm = page.getByTestId("system-forge-open-form");
    if (await openForm.isVisible().catch(() => false)) {
      await openForm.click();
    }

    // 3. Fill the create-system form.
    await page.getByTestId("system-forge-domain").fill(LAW_INPUT.domain);
    await page.getByTestId("system-forge-goal").fill(LAW_INPUT.goal);
    await page.getByTestId("system-forge-outcome").fill(LAW_INPUT.outcome);
    await page.getByTestId("system-forge-bottleneck").fill(LAW_INPUT.bottleneck);
    await page.getByTestId("system-forge-minutes").fill(LAW_INPUT.minutes);
    await page.getByTestId("system-forge-submit").click();

    // 4. Active system panel appears.
    const active = page.getByTestId("system-forge-active");
    await expect(active).toBeVisible();
    await expect(page.getByTestId("system-forge-active-name")).toContainText(/Law Proof System/i);
    await expect(page.getByTestId("system-forge-active-command")).toBeVisible();

    // 5. Start rep + submit proof.
    await page.getByTestId("system-forge-start-rep").click();
    await page.getByTestId("system-forge-proof").fill(PROOF_TEXT);
    await page.getByTestId("system-forge-self-score").fill("6");
    await page.getByTestId("system-forge-submit-proof").click();

    // 6. Verdict block renders with weakness + next upgrade.
    await expect(page.getByTestId("system-forge-verdict")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("system-forge-weakness")).toBeVisible();
    await expect(page.getByTestId("system-forge-next-upgrade")).toBeVisible();

    // 7. Refresh and assert persistence.
    await page.reload();
    await expect(page.getByTestId("system-forge-active")).toBeVisible();
    await expect(page.getByTestId("system-forge-active-name")).toContainText(/Law Proof System/i);
    await expect(page.getByTestId("system-forge-active-command")).toBeVisible();

    // 8. Recent reps list contains the rep we just submitted.
    await expect(page.getByTestId("system-forge-reps-list")).toBeVisible();
    await expect(page.getByTestId("system-forge-rep-item").first()).toBeVisible();

    // 9. No unexpected console errors.
    // Filter out well-known noisy warnings (network offline, PostHog dev, etc.).
    const meaningful = consoleErrors.filter(
      (e) => !/posthog|manifest|favicon|Service Worker/i.test(e),
    );
    expect(meaningful, `Unexpected console errors:\n${meaningful.join("\n")}`).toEqual([]);
  });

  test("empty-state does not crash for a user with no systems", async ({ authedPage: page }) => {
    // Assert only that the page mounts and shows either the empty-state form
    // or an existing active system, without throwing.
    await page.goto("/systems");
    await expect(page.getByTestId("system-forge-page")).toBeVisible();
    const emptyOrActive = page
      .getByTestId("system-forge-empty-state")
      .or(page.getByTestId("system-forge-form-card"))
      .or(page.getByTestId("system-forge-active"));
    await expect(emptyOrActive.first()).toBeVisible();
  });
});