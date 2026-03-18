// lib/auth.ts
// Lightweight admin session using signed httpOnly cookies.
// No external auth library needed — uses Node.js built-in crypto.
// Session is a base64-encoded JSON payload + HMAC-SHA256 signature.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "__mtkw_admin";
const MAX_AGE_SEC = 60 * 60 * 8; // 8-hour session

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("Missing ADMIN_SESSION_SECRET env var");
  return s;
}

// ─── HMAC sign / verify ───────────────────────────────────────────────────────

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function buildToken(username: string): string {
  const exp     = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
  const sig     = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { username: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  // Timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(sign(payload));
  const actual   = Buffer.from(sig);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual))  return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Math.floor(Date.now() / 1000) > data.exp) return null; // expired
    return { username: data.u };
  } catch {
    return null;
  }
}

// ─── Credential check ─────────────────────────────────────────────────────────
// Credentials stored as env vars — never hardcoded.
// Timing-safe comparison to prevent username/password enumeration.

export function checkCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USERNAME ?? "";
  const validPass = process.env.ADMIN_PASSWORD ?? "";
  if (!validUser || !validPass) return false;

  // Both comparisons always run (no short-circuit) to prevent timing oracle
  const userBuf     = Buffer.from(username);
  const validUserBuf = Buffer.from(validUser);
  const passBuf     = Buffer.from(password);
  const validPassBuf = Buffer.from(validPass);

  const userMatch = userBuf.length === validUserBuf.length &&
    timingSafeEqual(userBuf, validUserBuf);
  const passMatch = passBuf.length === validPassBuf.length &&
    timingSafeEqual(passBuf, validPassBuf);

  return userMatch && passMatch;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function createSession(username: string): Promise<void> {
  const token     = buildToken(username);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "lax",
    maxAge:    MAX_AGE_SEC,
    path:      "/admin",
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
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
