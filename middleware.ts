import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "alhazayed@gmail.com";

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    );
    if (!res.ok) return false;
    const user = await res.json();
    return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes
  if (
    pathname.startsWith("/api/scan") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/pricing" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("sb-token")?.value;

  // ── Admin routes: full server-side email verification ──────────────────────
  if (pathname.startsWith("/admin") || pathname === "/admin") {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    const isAdmin = await verifyAdminToken(token);
    if (!isAdmin) {
      // Silently redirect to dashboard — no hint that /admin exists
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Admin API routes: same verification ───────────────────────────────────
  if (pathname.startsWith("/api/admin")) {
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isAdmin = await verifyAdminToken(token);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.next();
  }

  // ── Regular protected routes: just check token exists ────────────────────
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/admin/:path*",
    "/admin",
    "/api/admin/:path*",
  ],
};
