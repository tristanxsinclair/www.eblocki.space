import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertAllowedPriceLookupKey,
  assertKeyMatchesEnvironment,
  assertLivemodeMatchesEnvironment,
  assertRequestedEnvironmentMatchesConfig,
  assertWebhookEventMatchesEnvironment,
  detectStripeModeFromKey,
  publicStripeErrorMessage,
  readStripeApiKeyForEnvironment,
  redactSensitiveStripeText,
  validateReturnUrl,
} from "../../../../supabase/functions/_shared/stripe-config.ts";

const fixtureKey = (kind: "sk" | "pk", mode: "test" | "live") => [kind, mode, "unit"].join("_");
const fixtureId = (kind: string) => [kind, "unit123"].join("_");
const webhookSecret = () => ["whsec", "unit"].join("_");

function envReader(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return envReader({
    PAYMENTS_EXPECTED_ENV: "sandbox",
    PAYMENTS_ALLOWED_RETURN_ORIGINS: "http://localhost:8080,https://www.eblocki.space",
    STRIPE_SANDBOX_API_KEY: fixtureKey("sk", "test"),
    STRIPE_LIVE_API_KEY: fixtureKey("sk", "live"),
    PAYMENTS_SANDBOX_WEBHOOK_SECRET: webhookSecret(),
    PAYMENTS_LIVE_WEBHOOK_SECRET: webhookSecret(),
    ...overrides,
  });
}

function readRepoFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function readSourceFiles(relativeDir: string): Array<{ path: string; source: string }> {
  const root = join(process.cwd(), relativeDir);
  const files: Array<{ path: string; source: string }> = [];

  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      files.push({ path: fullPath, source: readFileSync(fullPath, "utf8") });
    }
  };

  visit(root);
  return files;
}

describe("Stripe environment guard", () => {
  it("accepts sandbox checkout configuration with test-mode keys and prices", () => {
    const readEnv = baseEnv();

    const env = assertRequestedEnvironmentMatchesConfig("sandbox", readEnv);

    expect(env).toBe("sandbox");
    expect(detectStripeModeFromKey(fixtureKey("pk", "test"))).toBe("test");
    expect(assertKeyMatchesEnvironment(fixtureKey("pk", "test"), env, "client token")).toBe("test");
    expect(readStripeApiKeyForEnvironment(env, readEnv)).toBe(fixtureKey("sk", "test"));
    expect(() => assertAllowedPriceLookupKey("pro_monthly")).not.toThrow();
    expect(() => assertLivemodeMatchesEnvironment(false, env, "Stripe price")).not.toThrow();
    expect(validateReturnUrl("http://localhost:8080/checkout/return", readEnv)).toBe(
      "http://localhost:8080/checkout/return",
    );
  });

  it("accepts live checkout configuration with live-mode keys and prices", () => {
    const readEnv = baseEnv({ PAYMENTS_EXPECTED_ENV: "live" });

    const env = assertRequestedEnvironmentMatchesConfig("live", readEnv);

    expect(env).toBe("live");
    expect(detectStripeModeFromKey(fixtureKey("pk", "live"))).toBe("live");
    expect(assertKeyMatchesEnvironment(fixtureKey("pk", "live"), env, "client token")).toBe("live");
    expect(readStripeApiKeyForEnvironment(env, readEnv)).toBe(fixtureKey("sk", "live"));
    expect(() => assertAllowedPriceLookupKey("pro_yearly")).not.toThrow();
    expect(() => assertLivemodeMatchesEnvironment(true, env, "Stripe price")).not.toThrow();
    expect(validateReturnUrl("https://www.eblocki.space/checkout/return", readEnv)).toBe(
      "https://www.eblocki.space/checkout/return",
    );
  });

  it("rejects sandbox checkout configuration backed by a live secret", () => {
    const readEnv = baseEnv({ STRIPE_SANDBOX_API_KEY: fixtureKey("sk", "live") });

    expect(() => readStripeApiKeyForEnvironment("sandbox", readEnv)).toThrow(/require test mode/);
  });

  it("rejects live checkout configuration backed by a test secret", () => {
    const readEnv = baseEnv({
      PAYMENTS_EXPECTED_ENV: "live",
      STRIPE_LIVE_API_KEY: fixtureKey("sk", "test"),
    });

    expect(() => readStripeApiKeyForEnvironment("live", readEnv)).toThrow(/require live mode/);
  });

  it("fails closed when required payment config is missing", () => {
    const readEnv = envReader({});

    expect(() => assertRequestedEnvironmentMatchesConfig("sandbox", readEnv)).toThrow(
      /PAYMENTS_EXPECTED_ENV is not configured/,
    );
    expect(() => readStripeApiKeyForEnvironment("sandbox", readEnv)).toThrow(
      /STRIPE_SANDBOX_API_KEY is not configured/,
    );
    expect(() => validateReturnUrl("http://localhost:8080/checkout/return", readEnv)).toThrow(
      /PAYMENTS_ALLOWED_RETURN_ORIGINS is not configured/,
    );
  });

  it("rejects missing price mapping before checkout session creation", () => {
    expect(() => assertAllowedPriceLookupKey("unmapped_plan")).toThrow(
      /Payment price is not configured/,
    );
  });

  it("does not let the return URL page grant entitlement directly", () => {
    const source = readRepoFile("src/pages/CheckoutReturn.tsx");

    expect(source).not.toMatch(/functions\.invoke/);
    expect(source).not.toMatch(/\.from\(["'](?:profiles|subscriptions)["']\)/);
    expect(source).not.toMatch(/\.(?:insert|update|upsert)\(/);
  });

  it("rejects webhook events whose mode does not match the endpoint environment", () => {
    expect(() => assertWebhookEventMatchesEnvironment({ livemode: true }, "sandbox")).toThrow(
      /not sandbox/,
    );
    expect(() => assertWebhookEventMatchesEnvironment({ livemode: false }, "live")).toThrow(
      /not live/,
    );
  });

  it("keeps duplicate webhook handling idempotent by subscription identifier", () => {
    const source = readRepoFile("supabase/functions/payments-webhook/index.ts");

    expect(source.match(/onConflict: "stripe_subscription_id"/g)).toHaveLength(2);
    expect(source.match(/\.eq\("stripe_subscription_id"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("keeps Founder one-time handling separate from recurring subscription events", () => {
    const source = readRepoFile("supabase/functions/payments-webhook/index.ts");

    expect(source).toContain('session.mode !== "payment"');
    expect(source).toContain('session.payment_status !== "paid"');
    expect(source).toContain('priceId !== "founder_lifetime"');
    expect(source).toContain("onetime_");
  });

  it("keeps privileged payment variables out of client source", () => {
    const forbiddenClientEnv = /import\.meta\.env\.VITE_[A-Z0-9_]*(?:SERVICE_ROLE|WEBHOOK|SECRET|STRIPE_(?:SANDBOX|LIVE)|API_KEY|LOVABLE_API_KEY)/;
    const offenders = readSourceFiles("src")
      .filter(({ source }) => forbiddenClientEnv.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("redacts secrets and Stripe object identifiers from operational errors", () => {
    const secret = fixtureKey("sk", "live");
    const customer = fixtureId("cus");
    const subscription = fixtureId("sub");
    const webhook = webhookSecret();
    const message = `${secret} ${customer} ${subscription} ${webhook}`;
    const redacted = redactSensitiveStripeText(message);

    expect(redacted).not.toContain(secret);
    expect(redacted).not.toContain(customer);
    expect(redacted).not.toContain(subscription);
    expect(redacted).not.toContain(webhook);
    expect(publicStripeErrorMessage(new Error(message), "Payment failed.")).toBe("Payment failed.");
  });
});
