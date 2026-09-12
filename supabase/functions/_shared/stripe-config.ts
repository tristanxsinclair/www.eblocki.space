export type StripeEnv = "sandbox" | "live";
export type StripeMode = "test" | "live";
export type EnvReader = (key: string) => string | undefined | null;

export class StripeConfigError extends Error {
  readonly code = "stripe_config_error";

  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

export const STRIPE_PRICE_LOOKUP_KEYS = [
  "pro_monthly",
  "pro_yearly",
  "founder_lifetime",
] as const;

export type StripePriceLookupKey = (typeof STRIPE_PRICE_LOOKUP_KEYS)[number];

const PRICE_LOOKUP_SET = new Set<string>(STRIPE_PRICE_LOOKUP_KEYS);

export function parseStripeEnvironment(value: unknown, label = "environment"): StripeEnv {
  if (value === "sandbox" || value === "live") return value;
  throw new StripeConfigError(`${label} must be sandbox or live.`);
}

export function stripeModeForEnvironment(env: StripeEnv): StripeMode {
  return env === "live" ? "live" : "test";
}

export function detectStripeModeFromKey(value: string | null | undefined): StripeMode | "unknown" {
  const key = value?.trim() ?? "";
  if (/^(sk|rk|pk)_test_/.test(key)) return "test";
  if (/^(sk|rk|pk)_live_/.test(key)) return "live";
  return "unknown";
}

export function readRequiredEnv(key: string, readEnv: EnvReader): string {
  const value = readEnv(key)?.trim();
  if (!value) throw new StripeConfigError(`${key} is not configured.`);
  return value;
}

export function assertKeyMatchesEnvironment(
  keyValue: string,
  env: StripeEnv,
  label: string,
): StripeMode | "unknown" {
  const actual = detectStripeModeFromKey(keyValue);
  const expected = stripeModeForEnvironment(env);
  if (actual !== "unknown" && actual !== expected) {
    throw new StripeConfigError(
      `${label} is ${actual} mode, but ${env} payments require ${expected} mode.`,
    );
  }
  return actual;
}

export function readStripeApiKeyForEnvironment(env: StripeEnv, readEnv: EnvReader): string {
  const keyName = env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY";
  const apiKey = readRequiredEnv(keyName, readEnv);
  assertKeyMatchesEnvironment(apiKey, env, keyName);
  return apiKey;
}

export function readWebhookSecretForEnvironment(env: StripeEnv, readEnv: EnvReader): string {
  const keyName = env === "sandbox"
    ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET"
    : "PAYMENTS_LIVE_WEBHOOK_SECRET";
  return readRequiredEnv(keyName, readEnv);
}

export function assertRequestedEnvironmentMatchesConfig(
  requested: unknown,
  readEnv: EnvReader,
): StripeEnv {
  const requestedEnv = parseStripeEnvironment(requested);
  const expectedEnv = parseStripeEnvironment(
    readRequiredEnv("PAYMENTS_EXPECTED_ENV", readEnv),
    "PAYMENTS_EXPECTED_ENV",
  );
  if (requestedEnv !== expectedEnv) {
    throw new StripeConfigError(
      `Requested ${requestedEnv} payments do not match this deployment's ${expectedEnv} payment environment.`,
    );
  }
  return requestedEnv;
}

export function assertAllowedPriceLookupKey(value: string): asserts value is StripePriceLookupKey {
  if (!PRICE_LOOKUP_SET.has(value)) {
    throw new StripeConfigError("Payment price is not configured for checkout.");
  }
}

export function assertLivemodeMatchesEnvironment(
  livemode: unknown,
  env: StripeEnv,
  label: string,
): void {
  if (typeof livemode !== "boolean") {
    throw new StripeConfigError(`${label} is missing Stripe mode metadata.`);
  }
  const expectedLive = env === "live";
  if (livemode !== expectedLive) {
    throw new StripeConfigError(
      `${label} belongs to ${livemode ? "live" : "test"} mode, not ${env}.`,
    );
  }
}

export function assertWebhookEventMatchesEnvironment(
  event: { livemode?: boolean },
  env: StripeEnv,
): void {
  assertLivemodeMatchesEnvironment(event.livemode, env, "Webhook event");
}

export function validateReturnUrl(value: unknown, readEnv: EnvReader): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new StripeConfigError("returnUrl is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new StripeConfigError("returnUrl must be an absolute URL.");
  }

  const allowedOrigins = readRequiredEnv("PAYMENTS_ALLOWED_RETURN_ORIGINS", readEnv)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedOrigins.includes(parsed.origin)) {
    throw new StripeConfigError("returnUrl origin is not allowed for this payment environment.");
  }

  return value;
}

export function redactSensitiveStripeText(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "");
  return text
    .replace(/\b(sk|rk|pk)_(test|live)_[A-Za-z0-9_-]+/g, "$1_$2_[redacted]")
    .replace(/\bwhsec_[A-Za-z0-9_-]+/g, "whsec_[redacted]")
    .replace(/\b(cs|cus|sub|price|prod|evt|pi|in)_[A-Za-z0-9_-]+/g, "$1_[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, "jwt_[redacted]");
}

export function publicStripeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof StripeConfigError) return redactSensitiveStripeText(error.message);
  return fallback;
}
