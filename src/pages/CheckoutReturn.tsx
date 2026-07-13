import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { accessLevel, refresh, isActive } = useSubscription();

  useEffect(() => {
    // Webhook is the source of truth; poll a few times in case it lags.
    let cancelled = false;
    const intervals = [800, 1500, 2500, 4000];
    intervals.forEach((delay) => {
      setTimeout(() => {
        if (!cancelled) refresh();
      }, delay);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heading = isActive
    ? accessLevel === "founder"
      ? "Welcome, Founder."
      : "You're Pro."
    : "Confirming payment…";

  const sub = isActive
    ? accessLevel === "founder"
      ? "Lifetime access unlocked. All current and future Eblocki software is yours."
      : "Pro unlocked. Court of Evidence, Identity Ledger, Sentinel, and adaptive coaching are live."
    : "Stripe is delivering the confirmation. This usually takes a few seconds.";
  const paymentReference = sessionId ? sessionId.slice(-6) : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-mono tracking-tight mb-3">{heading}</h1>
        <p className="text-sm text-muted-foreground mb-8">{sub}</p>
        <div className="flex flex-col gap-2">
          <Button asChild className="font-mono">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="font-mono">
            <Link to="/settings">Manage billing</Link>
          </Button>
        </div>
        {paymentReference && (
          <p className="text-[10px] text-muted-foreground/60 font-mono mt-8 break-all">
            ref ...{paymentReference}
          </p>
        )}
      </div>
    </div>
  );
}
