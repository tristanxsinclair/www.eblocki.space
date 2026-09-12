import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const paymentsNotConfiguredMessage =
  "Payments are not configured for this build. " +
  "Complete go-live in the Payments tab to enable production checkout.";

export type StripeClientConfigStatus =
  | { configured: true; environment: StripeEnv }
  | { configured: false; reason: "missing" | "invalid" };

export function getStripeClientConfigStatus(): StripeClientConfigStatus {
  if (!clientToken) return { configured: false, reason: "missing" };
  if (clientToken.startsWith("pk_test_")) return { configured: true, environment: "sandbox" };
  if (clientToken.startsWith("pk_live_")) return { configured: true, environment: "live" };
  return { configured: false, reason: "invalid" };
}

function paymentsEnvironment(): StripeEnv {
  const status = getStripeClientConfigStatus();
  if (status.configured) return status.environment;
  throw new Error(paymentsNotConfiguredMessage);
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export function isPaymentsConfigured(): boolean {
  return getStripeClientConfigStatus().configured;
}

/** Human-readable price IDs. Stable across sandbox and live. */
export const PRICE_IDS = {
  proMonthly: "pro_monthly",
  proYearly: "pro_yearly",
  founderLifetime: "founder_lifetime",
} as const;

export type PriceId = (typeof PRICE_IDS)[keyof typeof PRICE_IDS];

export function priceIdToAccessLevel(
  priceId: string | null | undefined,
): "free" | "pro" | "founder" {
  if (priceId === "founder_lifetime") return "founder";
  if (priceId === "pro_monthly" || priceId === "pro_yearly") return "pro";
  return "free";
}
