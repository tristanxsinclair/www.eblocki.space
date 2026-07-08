import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.warn("checkout.session.completed missing metadata", session.id);
          break;
        }

        const accessLevel = plan === "founder" ? "founder" : "pro";

        await supabase
          .from("profiles")
          .update({
            access_level: accessLevel,
            stripe_customer_id: session.customer as string,
          })
          .eq("id", userId);

        console.log(`User ${userId} upgraded to ${accessLevel}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.warn("No profile found for customer:", customerId);
          break;
        }

        // If subscription is active/trialing, keep pro; otherwise downgrade
        const isActive = ["active", "trialing"].includes(subscription.status);
        await supabase
          .from("profiles")
          .update({ access_level: isActive ? "pro" : "free" })
          .eq("id", profile.id);

        console.log(`Subscription updated for ${profile.id}: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, access_level")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) break;

        // Only downgrade if currently pro (founders keep access)
        if (profile.access_level === "pro") {
          await supabase
            .from("profiles")
            .update({ access_level: "free" })
            .eq("id", profile.id);
          console.log(`Subscription cancelled for ${profile.id}, downgraded to free`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
