import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

const STORAGE_KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION_JSON = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const COOKIES_JSON = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

export const hasInjectedSession = Boolean(STORAGE_KEY && SESSION_JSON);

/**
 * Restore the managed Supabase session (localStorage + optional SSR cookies)
 * into the current browser context, scoped to the app origin. Must be called
 * before navigating to any protected route.
 */
export async function restoreSupabaseSession(context: BrowserContext, page: Page, baseURL: string) {
  if (!hasInjectedSession) return;

  if (COOKIES_JSON) {
    try {
      const cookies = JSON.parse(COOKIES_JSON) as Array<Record<string, unknown>>;
      const scoped = cookies.map((c) => ({ ...c, url: baseURL }));
      // @ts-expect-error – Playwright cookie shape is compatible at runtime
      await context.addCookies(scoped);
    } catch {
      // ignore malformed cookies – localStorage restore is sufficient for SPA
    }
  }

  await page.goto(baseURL);
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [STORAGE_KEY!, SESSION_JSON!],
  );
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ context, page, baseURL }, use) => {
    test.skip(!hasInjectedSession, "No injected Supabase session – sign in via the Lovable preview to run E2E.");
    await restoreSupabaseSession(context, page, baseURL ?? "http://localhost:8080");
    await use(page);
  },
});

export { expect };