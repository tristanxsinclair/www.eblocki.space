import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment, isPaymentsConfigured, priceIdToAccessLevel } from "@/lib/stripe";
import type { AccessLevel } from "@/lib/eblocki/access-level";

interface SubscriptionRow {
  id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  price_id: string;
  product_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

export interface SubscriptionState {
  loading: boolean;
  row: SubscriptionRow | null;
  accessLevel: AccessLevel;
  isActive: boolean;
  refresh: () => Promise<void>;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function computeActive(row: SubscriptionRow | null): boolean {
  if (!row) return false;
  const periodEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const inWindow = periodEnd === null || periodEnd > Date.now();
  if (ACTIVE_STATUSES.has(row.status) && inWindow) return true;
  if (row.status === "canceled" && periodEnd !== null && periodEnd > Date.now()) return true;
  return false;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [row, setRow] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRow = async () => {
    if (!user || !isPaymentsConfigured()) {
      setRow(null);
      setLoading(false);
      return;
    }
    const env = getStripeEnvironment();
    const { data } = await supabase
      .from("subscriptions")
      .select("id, stripe_customer_id, stripe_subscription_id, price_id, product_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(10);
    const rows = (data as SubscriptionRow[] | null) ?? [];
    // Founder (one-time lifetime) always wins — never downgrade a founder
    // if a later Pro row appears. Otherwise prefer the newest active row,
    // falling back to the newest row of any status.
    const founder = rows.find(
      (r) => r.price_id === "founder_lifetime" && r.status === "active",
    );
    const activePro = rows.find(
      (r) => r.status === "active" || r.status === "trialing" || r.status === "past_due",
    );
    setRow(founder ?? activePro ?? rows[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchRow();
    if (!user) return;
    const channel = supabase
      .channel(`subs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          fetchRow();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isActive = computeActive(row);
  const accessLevel: AccessLevel = isActive ? priceIdToAccessLevel(row?.price_id) : "free";

  return { loading, row, accessLevel, isActive, refresh: fetchRow };
}