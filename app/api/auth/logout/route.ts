import { NextResponse } from "next/server";

export async function POST() {
  const res = new NextResponse("OK", { status: 200 });
  res.cookies.set("sb-token", "", { maxAge: 0, path: "/" });
  return res;
}
