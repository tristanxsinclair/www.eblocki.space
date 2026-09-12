import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptics } from "@/hooks/useHaptics";
import { Capacitor } from "@capacitor/core";
import { type AccessLevel } from "@/lib/eblocki/access-level";
import { getStripeEnvironment } from "@/lib/stripe";

const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: "$9",
    period: "/month",
    currency: "AUD",
    icon: Zap,
    features: [
      "Advanced proof analytics",
      "Identity Ledger",
      "Court of Evidence",
      "Adaptive coaching",
      "Weekly executive review",
    ],
  },
  {
    id: "founder" as const,
    name: "Founder",
    price: "$99",
    period: " one-time",
    currency: "AUD",
    icon: Crown,
    badge: "Limited",
    features: [
      "Everything in Pro",
      "Early features access",
      "Deeper personalisation",
      "Priority feedback",
      "Experimental intelligence",
    ],
  },
] as const;

interface UpgradeCardProps {
  currentLevel: AccessLevel;
}

/**
 * Stripe-powered upgrade card. Calls the create-checkout edge function
 * and redirects to Stripe Checkout (or opens in-app browser on native).
 */
export function UpgradeCard({ currentLevel }: UpgradeCardProps) {
  const navigate = useNavigate();

  if (currentLevel === "founder") {
    return (
      <Card className="panel p-5 border-primary/30">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Founder Access
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          You have full Founder Access. Thank you for supporting Eblocki.
        </p>
      </Card>
    );
  }

  if (currentLevel === "pro") {
    return (
      <Card className="panel p-5 border-primary/20">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Pro Active
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Pro subscription is active.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => handleManage()}
        >
          Manage subscription
        </Button>
      </Card>
    );
  }

  function handleCheckout(plan: "pro" | "founder") {
    haptics.light();
    if (plan === "founder") {
      navigate("/founder");
      return;
    }
    // Checkout is embedded on the Pricing page; route there to open it.
    navigate("/pricing");
  }

  async function handleManage() {
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: window.location.origin + "/settings",
        },
      });
      if (error) throw error;
      if (data?.url) {
        if (Capacitor.isNativePlatform()) {
          window.open(data.url, "_system");
        } else {
          window.open(data.url, "_blank");
        }
      } else {
        throw new Error("No portal URL returned");
      }
    } catch {
      toast.error("Could not open subscription management.");
    }
  }

  return (
    <Card className="panel p-5" id="upgrade">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Upgrade
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold">Unlock the full Eblocki system.</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Pro gives you advanced analytics, adaptive coaching, and the full Court of Evidence.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="rounded-md border border-border bg-background/40 p-4 flex flex-col"
          >
            <div className="flex items-center gap-2">
              <plan.icon className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{plan.name}</span>
              {"badge" in plan && plan.badge && (
                <span className="ml-auto rounded-sm bg-primary/10 border border-primary/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                  {plan.badge}
                </span>
              )}
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{plan.price}</span>
              <span className="text-xs text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mt-3 flex-1 space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-4 w-full motion-micro active:scale-[0.98]"
              size="sm"
              onClick={() => handleCheckout(plan.id)}
            >
              {`Get ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground font-mono border-t border-border pt-2">
        Secure payment via Stripe. Cancel anytime. AUD pricing.
      </p>
    </Card>
  );
}
