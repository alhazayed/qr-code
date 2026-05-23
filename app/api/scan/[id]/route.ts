import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { id } = await params;

  const { data: code, error } = await supabase
    .from("qr_codes")
    .select("id, destination_url")
    .eq("id", id)
    .single();

  if (error || !code) {
    return new NextResponse("QR code not found", { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;

  // MUST await — Vercel kills fire-and-forget promises before they complete
  await Promise.all([
    supabase.from("scans").insert({ qr_code_id: id, ip, user_agent: userAgent, country }),
    supabase.rpc("increment_scan", { code_id: id }),
  ]);

  return NextResponse.redirect(code.destination_url, { status: 302 });
}
