import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const res = new NextResponse("OK", { status: 200 });
  res.cookies.set("sb-token", token, {
    httpOnly: true, secure: true, sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  return res;
}
