import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import {
  assertLivemodeMatchesEnvironment,
  assertRequestedEnvironmentMatchesConfig,
  publicStripeErrorMessage,
  redactSensitiveStripeText,
  validateReturnUrl,
} from "../_shared/stripe-config.ts";

const readDenoEnv = (key: string) => Deno.env.get(key);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { returnUrl, environment } = await req.json();
    const env = assertRequestedEnvironmentMatchesConfig(environment, readDenoEnv);
    const safeReturnUrl = returnUrl ? validateReturnUrl(returnUrl, readDenoEnv) : undefined;

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? "");
    if (authError || !user) throw new Error("Unauthorized");

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) throw new Error("No subscription found");

    const stripe = createStripeClient(env);
    const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
    if ("deleted" in customer && customer.deleted) throw new Error("Stripe customer is deleted");
    assertLivemodeMatchesEnvironment((customer as any).livemode, env, "Stripe customer");

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      ...(safeReturnUrl && { return_url: safeReturnUrl }),
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("create-portal-session error:", redactSensitiveStripeText(e));
    return new Response(JSON.stringify({ error: publicStripeErrorMessage(e, "Could not open billing portal.") }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
