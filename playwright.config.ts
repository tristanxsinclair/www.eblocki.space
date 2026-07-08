import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for Eblocki.
 * Runs against the local Vite dev server on :8080 (already started by the sandbox / `bun run dev`).
 * Auth is restored from LOVABLE_BROWSER_SUPABASE_* env vars when present; tests self-skip otherwise.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  // Give CI more headroom — cold builds, cold DB, and slower runners cause
  // benign timing flakes that shouldn't block PRs.
  timeout: isCI ? 90_000 : 60_000,
  fullyParallel: false,
  // Retry transient failures automatically on CI. Locally, keep retries off
  // so real bugs surface immediately instead of being masked.
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"]],
  // Visual regression baselines live next to the spec, per project (OS +
  // browser). Keeping them in-repo lets PRs diff both the pixels and the
  // updated baselines in one review.
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}",
  expect: {
    timeout: isCI ? 15_000 : 10_000,
    toHaveScreenshot: {
      // Allow tiny sub-pixel/anti-alias drift between runs without hiding
      // real layout regressions.
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 390, height: 844 },
    // Only capture heavy artifacts on the first retry — keeps successful runs
    // and the initial (flaky) attempt fast, and gives a diff between attempts
    // when a test is genuinely broken.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: isCI ? 15_000 : 10_000,
    navigationTimeout: isCI ? 30_000 : 20_000,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});