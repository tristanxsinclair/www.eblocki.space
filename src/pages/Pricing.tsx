import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PRICE_IDS, isPaymentsConfigured } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

interface Tier {
  id: "free" | "pro" | "founder";
  name: string;
  priceLabel: string;
  cadence: string;
  bullets: string[];
  priceId?: string;
  cta: string;
  highlight?: boolean;
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
    cadence: "per month · or $64 / year",
    bullets: [
      "Court of Evidence + adversarial review",
      "Identity Ledger + weekly executive review",
      "Sentinel risk forecast",
      "Adaptive coaching",
      "Advanced proof analytics",
    ],
    priceId: PRICE_IDS.proMonthly,
    cta: "Go Pro",
    highlight: true,
  },
  {
    id: "founder",
    name: "Founder",
    priceLabel: "$169.99",
    cadence: "one-time · lifetime",
    bullets: [
      "Everything in Pro, forever",
      "All future software + updates",
      "Priority feedback channel",
      "Early access to experimental features",
    ],
    priceId: PRICE_IDS.founderLifetime,
    cta: "Become a Founder",
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
      <PaymentTestModeBanner />
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-mono text-sm tracking-tight">Eblocki</Link>
        <Link to={user ? "/dashboard" : "/auth"} className="font-mono text-xs text-muted-foreground hover:text-foreground">
          {user ? "Dashboard →" : "Sign in →"}
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-4xl font-mono tracking-tight mb-3">Stop fake productivity.</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Log proof. Get the next command. Compound real identity evidence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const currentPlan = accessLevel === tier.id;
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
                  <h2 className="font-mono text-lg mb-1">{tier.name}</h2>
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

        <p className="text-center text-xs text-muted-foreground mt-10">
          Prices in USD. Taxes handled at checkout for supported regions.
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