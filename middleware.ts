// middleware.ts — Edge runtime compatible (no Buffer, no Node.js crypto)
// Uses Web Crypto API (available everywhere including Edge)
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "__mtkw_admin";

async function verifyTokenEdge(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    if (!payload || !sig) return false;

    // Import key using Web Crypto
    const enc     = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );

    // Decode hex signature to Uint8Array
    const sigBytes = new Uint8Array(
      sig.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
    );

    // Verify HMAC
    const valid = await crypto.subtle.verify(
      "HMAC", keyData, sigBytes, enc.encode(payload)
    );
    if (!valid) return false;

    // Decode payload (base64url → JSON)
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json   = atob(padded + "=".repeat((4 - padded.length % 4) % 4));
    const data   = JSON.parse(json);
    return Math.floor(Date.now() / 1000) <= data.exp;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Login page — always accessible
  if (pathname === "/admin" || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  // If secret not set yet, let the page handle it (shows login)
  if (!secret) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const valid = await verifyTokenEdge(token, secret);
  if (!valid) {
    const loginUrl = new URL("/admin", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
