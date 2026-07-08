import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { useSubscription } from "@/hooks/useSubscription";

export function BillingCard() {
  const { row, accessLevel, isActive, loading } = useSubscription();
  const [busy, setBusy] = useState(false);

  const openPortal = async () => {
    if (!isPaymentsConfigured()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/settings`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url as string, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const planLabel =
    accessLevel === "founder" ? "Founder — lifetime" : accessLevel === "pro" ? "Pro" : "Free";
  const nextRenewal = row?.current_period_end
    ? new Date(row.current_period_end).toLocaleDateString()
    : null;

  return (
    <Card className="panel p-4 md:p-5 space-y-4 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Billing</span>
          <h2 className="text-xl font-semibold mt-2 flex items-center gap-2">
            {accessLevel === "founder" && <Sparkles className="h-4 w-4 text-primary" />}
            {planLabel}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Loading…"
              : isActive
                ? accessLevel === "founder"
                  ? "Lifetime access. All current and future Eblocki software."
                  : row?.cancel_at_period_end
                    ? `Access until ${nextRenewal}, then downgrades to Free.`
                    : nextRenewal
                      ? `Renews ${nextRenewal}.`
                      : "Active."
                : "Upgrade to unlock Court of Evidence, Identity Ledger, Sentinel, and adaptive coaching."}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {accessLevel === "free" ? (
          <Button asChild className="justify-start font-mono">
            <Link to="/pricing">
              <Sparkles className="h-4 w-4 mr-2" /> See plans
            </Link>
          </Button>
        ) : accessLevel === "pro" ? (
          <>
            <Button variant="outline" onClick={openPortal} disabled={busy} className="justify-start">
              <CreditCard className="h-4 w-4 mr-2" /> {busy ? "Opening…" : "Manage billing"}
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/pricing">
                <Sparkles className="h-4 w-4 mr-2" /> Upgrade to Founder
              </Link>
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={openPortal} disabled={busy} className="justify-start">
            <ExternalLink className="h-4 w-4 mr-2" /> {busy ? "Opening…" : "View receipts"}
          </Button>
        )}
      </div>
    </Card>
  );
}