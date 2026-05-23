import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("Webhook signature failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    if (userId && plan) {
      await supabase.from("user_plans").upsert({
        user_id: userId,
        plan,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from("user_plans")
      .update({ plan: "free", stripe_subscription_id: null, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const planMap: Record<string, string> = {
      [process.env.STRIPE_PRICE_STARTER!]: "starter",
      [process.env.STRIPE_PRICE_PRO!]: "pro",
    };
    const newPlan = planMap[priceId] || "free";
    await supabase.from("user_plans")
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);
  }

  return new NextResponse("OK");
}
