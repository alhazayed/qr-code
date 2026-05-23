import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "alhazayed@gmail.com";

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  starter: 25,
  pro: Infinity,
};

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const cookieStore = await cookies();
  const token = cookieStore.get("sb-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin bypasses all limits
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAdmin) {
    const { data: planData } = await supabase
      .from("user_plans").select("plan").eq("user_id", user.id).single();

    const plan = planData?.plan || "free";
    const limit = PLAN_LIMITS[plan] ?? 3;

    if (limit !== Infinity) {
      const { count } = await supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count || 0) >= limit) {
        return NextResponse.json(
          { error: `Plan limit reached. Your ${plan} plan allows ${limit} QR codes. Please upgrade.` },
          { status: 403 }
        );
      }
    }
  }

  const { name, destination_url } = await req.json();
  if (!destination_url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const { data, error } = await supabase
    .from("qr_codes")
    .insert({ name: name || destination_url, destination_url, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
