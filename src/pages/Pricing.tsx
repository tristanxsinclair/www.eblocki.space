import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PRICE_IDS, isPaymentsConfigured } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Seo } from "@/components/Seo";

interface Tier {
  id: "free" | "pro" | "founder";
  name: string;
  priceLabel: string;
  cadence: string;
  bullets: string[];
  priceId?: string;
  cta: string;
  highlight?: boolean;
  contact?: boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    cadence: "forever",
    bullets: [
      "Daily check-in + streak",
      "Basic proof logging",
      "Basic stats",
      "Onboarding",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$11.99",
    cadence: "AUD / month · or $64 AUD / year",
    bullets: [
      "Court of Evidence + adversarial review",
      "Identity Ledger + weekly executive review",
      "Sentinel risk forecast",
      "Adaptive coaching",
      "Advanced proof analytics",
      "7-day refund on first month",
    ],
    priceId: PRICE_IDS.proMonthly,
    cta: "Go Pro",
    highlight: true,
  },
  {
    id: "founder",
    name: "Founder",
    priceLabel: "By application",
    cadence: "one-time · lifetime · limited seats",
    bullets: [
      "Everything in Pro, forever",
      "All future software + updates",
      "Priority feedback channel",
      "Early access to experimental features",
      "Direct line to the founder",
    ],
    cta: "Apply for Founder",
    contact: true,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { accessLevel } = useSubscription();
  const navigate = useNavigate();
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [proInterval, setProInterval] = useState<"monthly" | "yearly">("monthly");

  const startCheckout = (tier: Tier) => {
    if (tier.id === "free") {
      navigate(user ? "/dashboard" : "/auth");
      return;
    }
    if (tier.contact) {
      navigate("/founder");
      return;
    }
    if (!user) {
      navigate("/auth", { state: { from: "/pricing" } });
      return;
    }
    if (!isPaymentsConfigured()) return;
    const priceId =
      tier.id === "pro"
        ? proInterval === "yearly"
          ? PRICE_IDS.proYearly
          : PRICE_IDS.proMonthly
        : tier.priceId!;
    setCheckoutPriceId(priceId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Pricing — Eblocki"
        description="Free, Pro, and Founder plans. Stop fake productivity. Log proof. Get the next command."
        path="/pricing"
      />
      <PaymentTestModeBanner />
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link to="/" aria-label="Eblocki home">
          <EblockiLogo variant="compact" size="sm" />
        </Link>
        <Link to={user ? "/dashboard" : "/auth"} className="font-mono text-xs text-muted-foreground hover:text-foreground">
          {user ? "Dashboard →" : "Sign in →"}
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-5xl font-mono tracking-tight mb-3">Stop fake productivity.</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Log proof. Get the next command. Compound real identity evidence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const currentPlan = accessLevel === tier.id;
            const Icon = tier.id === "founder" ? Crown : tier.id === "pro" ? Zap : Shield;
            return (
              <div
                key={tier.id}
                className={`rounded-lg border p-6 flex flex-col ${
                  tier.highlight
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/60 bg-card"
                }`}
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <h2 className="font-mono text-lg">{tier.name}</h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono">{tier.priceLabel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{tier.cadence}</p>
                </div>

                {tier.id === "pro" && (
                  <div className="flex gap-2 mb-4 text-xs font-mono">
                    <button
                      className={`px-3 py-1 rounded border ${
                        proInterval === "monthly"
                          ? "border-primary bg-primary/10"
                          : "border-border/60"
                      }`}
                      onClick={() => setProInterval("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      className={`px-3 py-1 rounded border ${
                        proInterval === "yearly"
                          ? "border-primary bg-primary/10"
                          : "border-border/60"
                      }`}
                      onClick={() => setProInterval("yearly")}
                    >
                      Yearly — save 55%
                    </button>
                  </div>
                )}

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => startCheckout(tier)}
                  variant={tier.highlight ? "default" : "outline"}
                  disabled={currentPlan}
                  className="w-full font-mono"
                >
                  {currentPlan ? "Current plan" : tier.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-16 max-w-2xl mx-auto space-y-6">
          <h2 className="font-mono text-lg tracking-tight text-center">Common questions</h2>
          {[
            { q: "Can I cancel anytime?", a: "Yes. Cancel from Settings → Manage billing. Access continues until the end of the paid period." },
            { q: "Do you offer refunds?", a: "7-day no-questions refund on your first month of Pro. Email admin@eblocki.space." },
            { q: "How does Founder work?", a: "Founder is application-only, limited seats, lifetime access. Apply at /founder — we reply within 48 hours." },
            { q: "Is my proof data private?", a: "Yes. Stored per-user with row-level security. See Privacy for details." },
            { q: "Does it work on mobile?", a: "Yes. Web, iOS, and Android via the same account. Sign in on any device." },
          ].map((f) => (
            <details key={f.q} className="border border-border/40 rounded-md p-4 bg-card/50">
              <summary className="cursor-pointer font-mono text-sm">{f.q}</summary>
              <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Prices in AUD. Secure payments via Stripe. Cancel anytime.{" "}
          <Link to="/legal/terms" className="underline">Terms</Link> ·{" "}
          <Link to="/legal/privacy" className="underline">Privacy</Link>
        </p>
      </main>

      <Dialog open={!!checkoutPriceId} onOpenChange={(open) => !open && setCheckoutPriceId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono">Checkout</DialogTitle>
          </DialogHeader>
          {checkoutPriceId && user && (
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              userId={user.id}
              customerEmail={user.email ?? undefined}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}