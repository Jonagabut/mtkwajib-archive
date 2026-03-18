// lib/auth.ts — Node.js server only (never runs on Edge)
// HMAC-SHA256 signed session cookie, no external deps.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "__mtkw_admin";
const MAX_AGE_SEC = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  // Fallback to a derived secret if env var missing — still works but less secure
  return process.env.ADMIN_SESSION_SECRET
    ?? `fallback_${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "mtkw"}_secret`;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function buildToken(username: string): string {
  const exp     = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): { username: string } | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = Buffer.from(sign(payload));
    const actual   = Buffer.from(sig);
    if (expected.length !== actual.length) return null;
    if (!timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Math.floor(Date.now() / 1000) > data.exp) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export function checkCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USERNAME ?? "";
  const validPass = process.env.ADMIN_PASSWORD ?? "";
  if (!validUser || !validPass) return false;
  try {
    const uMatch = timingSafeEqual(Buffer.from(username), Buffer.from(validUser));
    const pMatch = timingSafeEqual(Buffer.from(password), Buffer.from(validPass));
    return uMatch && pMatch;
  } catch {
    // timingSafeEqual throws if buffers differ in length — that means no match
    return false;
  }
}

export async function createSession(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, buildToken(username), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   MAX_AGE_SEC,
    path:     "/admin",
  });
}

export async function getSession(): Promise<{ username: string } | null> {
  try {
    const cookieStore = await cookies();
    const token       = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {}
}
