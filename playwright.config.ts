import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for Eblocki.
 * Runs against the local Vite dev server on :8080 (already started by the sandbox / `bun run dev`).
 * Auth is restored from LOVABLE_BROWSER_SUPABASE_* env vars when present; tests self-skip otherwise.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});