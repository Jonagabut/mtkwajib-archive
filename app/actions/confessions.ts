"use server";
import { headers } from "next/headers";
import { createAdminClient, validatePasscode } from "@/lib/supabase/server";
import type { NoteColor } from "@/lib/supabase/database.types";

// ─── Rate limiter ────────────────────────────────────────────────────────────
// Simple in-memory store: keyed by IP, max 5 posts per 10-minute window.
// This resets on each server restart (fine for a low-traffic yearbook site).
interface RateBucket {
  count: number;
  resetAt: number;
}
const _rateBuckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX_POSTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = _rateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    _rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX_POSTS) return false;
  bucket.count += 1;
  return true;
}

// Periodically prune expired buckets so the map doesn't grow forever.
// Called lazily on each action invocation.
let _lastPrune = 0;
function pruneRateBuckets() {
  const now = Date.now();
  if (now - _lastPrune < 60_000) return;
  _lastPrune = now;
  _rateBuckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) _rateBuckets.delete(key);
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ActionResult {
  error?: string;
  data?: { id: string };
}

const VALID_COLORS: readonly NoteColor[] = ["yellow", "pink", "lavender"];

// ─── Post confession ─────────────────────────────────────────────────────────
export async function postConfessionAction(
  formData: FormData
): Promise<ActionResult> {
  pruneRateBuckets();

  // Rate limit by forwarded IP (Vercel sets x-forwarded-for)
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  if (!checkRateLimit(ip)) {
    return {
      error: `Slow down! Maksimum ${RATE_MAX_POSTS} notes per 10 menit.`,
    };
  }

  // Passcode
  const passcode = formData.get("passcode") as string;
  if (!validatePasscode(passcode)) {
    return { error: "Passcode salah, bro." };
  }

  // Content validation
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length === 0) return { error: "Tulis sesuatu dulu!" };
  if (content.length > 300)
    return { error: "Terlalu panjang. Maksimum 300 karakter." };

  // Color validation
  const color = (formData.get("color") as NoteColor) || "yellow";
  if (!VALID_COLORS.includes(color)) return { error: "Warna tidak valid." };

  // Random position — spread notes across a 600×400 virtual canvas
  const x_pos = Math.random() * 560 + 40;
  const y_pos = Math.random() * 380 + 40;
  const rotation_deg = (Math.random() - 0.5) * 10;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("confessions")
    .insert({ content, color, x_pos, y_pos, rotation_deg })
    .select("id")
    .single();

  if (error) {
    console.error("[confession:post] DB error:", error);
    return { error: "Gagal posting note. Coba lagi." };
  }

  return { data: { id: data.id } };
}

// ─── Update position ─────────────────────────────────────────────────────────
export async function updateConfessionPositionAction(
  id: string,
  x_pos: number,
  y_pos: number
): Promise<{ error?: string }> {
  // UUID v4 format check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: "Invalid ID." };
  }

  const clampedX = Math.max(0, Math.min(x_pos, 2000));
  const clampedY = Math.max(0, Math.min(y_pos, 2000));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("confessions")
    .update({ x_pos: clampedX, y_pos: clampedY })
    .eq("id", id);

  if (error) {
    console.error("[confession:position] DB error:", error);
    return { error: "Gagal menyimpan posisi." };
  }

  return {};
}
