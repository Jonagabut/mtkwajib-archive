"use server";
import { createAdminClient } from "@/lib/supabase/server";
import type { NoteColor } from "@/lib/supabase/database.types";

// ─── Rate limit via DB ────────────────────────────────────────────────────────
// No passcode needed for notes — siapapun bisa tempel.
// Rate limit: max 30 notes per 10 menit secara global (anti-spam).

const RATE_WINDOW_MIN = 10;
const RATE_MAX_GLOBAL = 30;

async function checkGlobalRateLimit(): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const since    = new Date(Date.now() - RATE_WINDOW_MIN * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("confessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    if (error) return true;
    return (count ?? 0) < RATE_MAX_GLOBAL;
  } catch {
    return true;
  }
}

interface ActionResult {
  error?: string;
  data?: { id: string };
}

const VALID_COLORS: readonly NoteColor[] = ["yellow", "pink", "lavender"];

// ─── Post confession — NO passcode required ───────────────────────────────────
export async function postConfessionAction(
  formData: FormData
): Promise<ActionResult> {
  // Content validation
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length === 0) return { error: "Tulis sesuatu dulu!" };
  if (content.length > 280) return { error: "Terlalu panjang. Maksimum 280 karakter." };

  // Color validation
  const color = (formData.get("color") as NoteColor) || "yellow";
  if (!VALID_COLORS.includes(color)) return { error: "Warna tidak valid." };

  // Global rate limit
  const allowed = await checkGlobalRateLimit();
  if (!allowed) {
    return { error: `Board lagi rame banget! Coba lagi dalam beberapa menit.` };
  }

  const x_pos        = Math.random() * 560 + 40;
  const y_pos        = Math.random() * 380 + 40;
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

// ─── Update position ──────────────────────────────────────────────────────────
export async function updateConfessionPositionAction(
  id: string,
  x_pos: number,
  y_pos: number
): Promise<{ error?: string }> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
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
