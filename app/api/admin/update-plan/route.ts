import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Middleware already verifies admin before this route is reached
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { user_id, plan } = await req.json();
  if (!user_id || !plan) {
    return NextResponse.json({ error: "user_id and plan required" }, { status: 400 });
  }
  if (!["free", "starter", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_plans")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
