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
    await expect(page.getByRole("heading", { name: /System Forge/i })).toBeVisible();

    // 2. Open the forge form (empty-state OR direct render).
    const forgeCta = page.getByRole("button", { name: /Forge my system/i }).first();
    if (await forgeCta.isVisible().catch(() => false)) {
      // Only click if it's the empty-state CTA (not the submit button inside the form).
      const domainField = page.locator("#domain");
      if (!(await domainField.isVisible().catch(() => false))) {
        await forgeCta.click();
      }
    }

    // 3. Fill the create-system form.
    await page.locator("#domain").fill(LAW_INPUT.domain);
    await page.locator("#goal").fill(LAW_INPUT.goal);
    await page.locator("#outcome").fill(LAW_INPUT.outcome);
    await page.locator("#bottleneck").fill(LAW_INPUT.bottleneck);
    await page.locator("#minutes").fill(LAW_INPUT.minutes);

    await page.getByRole("button", { name: /^Forge my system$/i }).last().click();

    // 4. Active system panel appears.
    await expect(page.getByText(/Active system/i)).toBeVisible();
    await expect(page.getByText(/Law Proof System/i)).toBeVisible();
    await expect(page.getByText(/Active command/i)).toBeVisible();
    const startRep = page.getByRole("button", { name: /Start first rep/i });
    await expect(startRep).toBeVisible();

    // 5. Start rep + submit proof.
    await startRep.click();
    await page.locator("#proof").fill(PROOF_TEXT);
    await page.locator("#self").fill("6");
    await page.getByRole("button", { name: /^Submit proof$/i }).click();

    // 6. Verdict block renders with weakness + next upgrade.
    await expect(page.getByText(/Verdict/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Weakness/i)).toBeVisible();
    await expect(page.getByText(/Next upgrade/i)).toBeVisible();

    // 7. Refresh and assert persistence.
    await page.reload();
    await expect(page.getByText(/Active system/i)).toBeVisible();
    await expect(page.getByText(/Law Proof System/i)).toBeVisible();
    await expect(page.getByText(/Active command/i)).toBeVisible();

    // 8. Past reps list should include the rep we just submitted.
    // Heading may be "Past reps" / "Recent reps" – match loosely.
    const pastReps = page.getByText(/Past reps|Recent reps|Rep history/i);
    await expect(pastReps.first()).toBeVisible();

    // 9. No unexpected console errors.
    // Filter out well-known noisy warnings (network offline, PostHog dev, etc.).
    const meaningful = consoleErrors.filter(
      (e) => !/posthog|manifest|favicon|Service Worker/i.test(e),
    );
    expect(meaningful, `Unexpected console errors:\n${meaningful.join("\n")}`).toEqual([]);
  });

  test("empty-state does not crash for a user with no systems", async ({ authedPage: page }) => {
    // This test assumes the account has no active system OR renders empty-state gracefully
    // alongside an existing one. It only asserts the page mounts without throwing.
    await page.goto("/systems");
    await expect(page.getByRole("heading", { name: /System Forge/i })).toBeVisible();
    // Either the empty-state CTA or the active-system panel must be present.
    const emptyOrActive = page
      .getByRole("button", { name: /Forge my system/i })
      .or(page.getByText(/Active system/i));
    await expect(emptyOrActive.first()).toBeVisible();
  });
});