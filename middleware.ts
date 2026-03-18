// middleware.ts
// Protects /admin routes — redirects to /admin/login if no valid session.
// Runs on Edge runtime so it's fast and does not add latency to public pages.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "__mtkw_admin";

function verifyTokenEdge(token: string): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!secret) return false;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(payload).digest("hex")
  );
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return false;
  if (!timingSafeEqual(expected, actual)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Math.floor(Date.now() / 1000) <= data.exp;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page through
  if (pathname === "/admin" || pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect all other /admin/* routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token || !verifyTokenEdge(token)) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
