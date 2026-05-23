import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const cookieStore = await cookies();
  const token = cookieStore.get("sb-token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan];
  if (!priceId) return new NextResponse("Invalid plan", { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    metadata: { user_id: user.id, plan },
    success_url: appUrl + "/dashboard?upgraded=1",
    cancel_url: appUrl + "/pricing",
  });

  return NextResponse.json({ url: session.url });
}
