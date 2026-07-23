import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, createStripeClient } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function priceRefFrom(price: any): string {
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = priceRefFrom(item?.price);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = priceRefFrom(item?.price);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

// One-time (Founder lifetime) purchases: no subscription object, so we
// synthesise a row keyed on the checkout session id. status='active',
// current_period_end=null → useSubscription treats it as active forever.
async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  if (session.mode !== "payment") return; // subscription events cover the recurring case
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("checkout.session.completed missing userId");
    return;
  }
  const stripe = createStripeClient(env);
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });
  const lineItem = (full.line_items as any)?.data?.[0];
  const price = lineItem?.price;
  const priceId = priceRefFrom(price);
  const productId = typeof price?.product === "string" ? price.product : price?.product?.id;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: `onetime_${session.id}`,
      stripe_customer_id: session.customer as string,
      product_id: productId ?? "founder_plan",
      price_id: priceId ?? "founder_lifetime",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      cancel_at_period_end: false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  // If this user has any active Pro subscriptions, mark them to cancel at
  // period end so they keep Pro benefits (already covered by Founder) until
  // the paid period ends and are not billed again.
  try {
    const { data: activePro } = await getSupabase()
      .from("subscriptions")
      .select("stripe_subscription_id, price_id, status, cancel_at_period_end")
      .eq("user_id", userId)
      .eq("environment", env)
      .in("status", ["active", "trialing", "past_due"]);
    const proRows = (activePro ?? []).filter(
      (r: any) =>
        (r.price_id === "pro_monthly" || r.price_id === "pro_yearly") &&
        !r.cancel_at_period_end &&
        typeof r.stripe_subscription_id === "string" &&
        !r.stripe_subscription_id.startsWith("onetime_"),
    );
    for (const r of proRows) {
      await stripe.subscriptions.update(r.stripe_subscription_id as string, {
        cancel_at_period_end: true,
      });
    }
  } catch (e) {
    console.error("Failed to cancel active Pro after Founder purchase:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);

    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, env);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});