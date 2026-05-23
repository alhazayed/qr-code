import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const cookieStore = await cookies();
  const token = cookieStore.get("sb-token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: plan } = await supabase.from("user_plans").select("stripe_customer_id").eq("user_id", user.id).single();
  if (!plan?.stripe_customer_id) return new NextResponse("No subscription", { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: plan.stripe_customer_id,
    return_url: appUrl + "/dashboard",
  });

  return NextResponse.json({ url: session.url });
}
