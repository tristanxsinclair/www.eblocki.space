import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Authenticated average-user fixture for Eblocki E2E tests.
 *
 * Authenticates via the real Supabase sign-in flow using environment
 * credentials, then saves/reuses browser storage state for performance.
 *
 * Required env vars:
 *   E2E_TEST_USER_EMAIL
 *   E2E_TEST_USER_PASSWORD
 *   VITE_SUPABASE_URL (or E2E_BASE_URL for the running app)
 *
 * Storage state is saved to: playwright/.auth/average-user.json (gitignored)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const AUTH_STATE_PATH = path.resolve("playwright/.auth/average-user.json");

const E2E_EMAIL = process.env.E2E_TEST_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_USER_PASSWORD;
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasTestCredentials = Boolean(E2E_EMAIL && E2E_PASSWORD && SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Authenticate via Supabase JS client and inject session into browser storage.
 * This avoids navigating through the UI for every test while still using
 * real Supabase Auth (no RLS bypass, no service-role in client).
 */
async function authenticateAndSaveState(
  context: BrowserContext,
  page: Page,
  baseURL: string
): Promise<void> {
  // Sign in via Supabase client to get a real session
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: E2E_EMAIL!,
    password: E2E_PASSWORD!,
  });

  if (error || !data.session) {
    throw new Error(
      `E2E auth failed: ${error?.message ?? "No session returned"}. ` +
        "Ensure the test user is seeded (npm run test:user:seed)."
    );
  }

  const session = data.session;

  // Build the localStorage value that the Supabase client expects
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  const storageValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  // Navigate to the app origin so localStorage is scoped correctly
  await page.goto(baseURL);

  // Inject the session into localStorage
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [storageKey, storageValue]
  );

  // Save storage state for reuse
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  await context.storageState({ path: AUTH_STATE_PATH });
}

/**
 * Check if we have a fresh-enough saved storage state.
 * Tokens expire, so we re-authenticate if the file is older than 30 minutes.
 */
function hasFreshStorageState(): boolean {
  if (!fs.existsSync(AUTH_STATE_PATH)) return false;
  const stat = fs.statSync(AUTH_STATE_PATH);
  const ageMs = Date.now() - stat.mtimeMs;
  return ageMs < 30 * 60 * 1000; // 30 minutes
}

/**
 * Playwright test fixture that provides an authenticated page as "Alex Morgan".
 *
 * Usage in tests:
 *   import { test, expect } from "../fixtures/average-user-auth";
 *   test("proof page loads", async ({ averageUserPage }) => { ... });
 */
export const test = base.extend<{ averageUserPage: Page }>({
  averageUserPage: async ({ context, page, baseURL }, use) => {
    test.skip(
      !hasTestCredentials,
      "E2E test credentials not configured. Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD."
    );

    const effectiveBaseURL = baseURL ?? "http://localhost:8080";

    if (hasFreshStorageState()) {
      // Reuse existing storage state
      const state = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, "utf-8"));
      if (state.origins?.[0]?.localStorage) {
        await page.goto(effectiveBaseURL);
        for (const entry of state.origins[0].localStorage) {
          await page.evaluate(
            ([k, v]) => window.localStorage.setItem(k, v),
            [entry.name, entry.value]
          );
        }
      }
    } else {
      // Fresh authentication
      await authenticateAndSaveState(context, page, effectiveBaseURL);
    }

    // Reload with auth state active
    await page.goto(effectiveBaseURL);
    // Wait for the app to recognise the authenticated state
    await page.waitForTimeout(1000);

    await use(page);
  },
});

export { expect };
