"use server";
// app/actions/admin.ts
// All admin CRUD — session-protected, runs with service_role key.
// Covers: logo upload, site config, students CRUD, gallery delete, confession delete.

import { createAdminClient, validatePasscode } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { Student, GalleryMedia, Confession } from "@/lib/supabase/database.types";

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
}

// ─── Buckets ──────────────────────────────────────────────────────────────────
const ASSETS_BUCKET  = "assets";
const GALLERY_BUCKET = "gallery";
const PHOTOS_BUCKET  = "student-photos";

const MAX_LOGO_BYTES  = 5  * 1024 * 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg","image/jpg","image/png","image/webp","image/svg+xml"]);

// ─── Result types ─────────────────────────────────────────────────────────────
type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

// ─── Logo ─────────────────────────────────────────────────────────────────────
export async function uploadLogoAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireAdmin();

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "File tidak ditemukan." };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return { ok: false, error: "Format harus JPEG, PNG, WebP, atau SVG." };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: "Logo maksimum 5 MB." };

  const ext      = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const path     = `logo/logo.${ext}`;
  const supabase = createAdminClient();
  const buffer   = new Uint8Array(await file.arrayBuffer());

  const { error: storageErr } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true, cacheControl: "3600" });

  if (storageErr) return { ok: false, error: `Upload gagal: ${storageErr.message}` };

  const { data: { publicUrl } } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);
  const urlWithBust = `${publicUrl}?v=${Date.now()}`;

  await supabase.from("site_config").upsert(
    { key: "logo_url", value: urlWithBust, updated_at: new Date().toISOString() }
  );

  revalidatePath("/");
  return { ok: true, data: { url: urlWithBust } };
}

// ─── Site config ──────────────────────────────────────────────────────────────
export async function updateConfigAction(
  key: string,
  value: string
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_config")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function getSiteConfig(): Promise<Record<string, string | null>> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("site_config").select("key, value");
    if (!data) return {};
    return Object.fromEntries(data.map((r) => [r.key, r.value]));
  } catch { return {}; }
}

// ─── Students ─────────────────────────────────────────────────────────────────

async function uploadStudentPhoto(
  file: File,
  type: "class" | "grad"
): Promise<string> {
  const supabase = createAdminClient();
  const ext      = file.type.split("/")[1]?.replace("jpeg","jpg") ?? "jpg";
  const path     = `${type}/${randomUUID()}.${ext}`;
  const buffer   = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false, cacheControl: "31536000" });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return publicUrl;
}

export async function addStudentAction(formData: FormData): Promise<ActionResult<Student>> {
  await requireAdmin();

  const name          = (formData.get("name")         as string)?.trim();
  const custom_title  = (formData.get("custom_title") as string)?.trim();
  const quote         = (formData.get("quote")        as string)?.trim() || null;
  const destination   = (formData.get("destination")  as string)?.trim() || null;
  const class_number  = Number(formData.get("class_number")) || null;
  const is_featured   = formData.get("is_featured") === "true";
  const photoClass    = formData.get("photo_class") as File | null;
  const photoGrad     = formData.get("photo_grad")  as File | null;

  if (!name)         return { ok: false, error: "Nama wajib diisi." };
  if (!custom_title) return { ok: false, error: "Custom title wajib diisi." };
  if (!photoClass || photoClass.size === 0) return { ok: false, error: "Foto kelas wajib diupload." };
  if (photoClass.size > MAX_PHOTO_BYTES) return { ok: false, error: "Foto kelas maksimum 10 MB." };

  let photo_class_url: string;
  let photo_grad_url: string | null = null;

  try {
    photo_class_url = await uploadStudentPhoto(photoClass, "class");
    if (photoGrad && photoGrad.size > 0) {
      if (photoGrad.size > MAX_PHOTO_BYTES) return { ok: false, error: "Foto wisuda maksimum 10 MB." };
      photo_grad_url = await uploadStudentPhoto(photoGrad, "grad");
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload foto gagal." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("students")
    .insert({ name, custom_title, quote, destination, class_number, is_featured, photo_class_url, photo_grad_url })
    .select("id, name, custom_title, quote, destination, photo_class_url, photo_grad_url, class_number, is_featured, created_at")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, data: data as Student };
}

export async function updateStudentAction(
  id: string,
  formData: FormData
): Promise<ActionResult<Student>> {
  await requireAdmin();

  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Invalid ID." };

  const updates: Record<string, unknown> = {};
  const name         = (formData.get("name")         as string)?.trim();
  const custom_title = (formData.get("custom_title") as string)?.trim();
  const quote        = (formData.get("quote")        as string)?.trim() || null;
  const destination  = (formData.get("destination")  as string)?.trim() || null;
  const class_number = Number(formData.get("class_number")) || null;
  const is_featured  = formData.get("is_featured") === "true";

  if (name)         updates.name         = name;
  if (custom_title) updates.custom_title = custom_title;
  updates.quote        = quote;
  updates.destination  = destination;
  updates.class_number = class_number;
  updates.is_featured  = is_featured;

  // Handle photo replacement
  const photoClass = formData.get("photo_class") as File | null;
  const photoGrad  = formData.get("photo_grad")  as File | null;

  try {
    if (photoClass && photoClass.size > 0) {
      if (photoClass.size > MAX_PHOTO_BYTES) return { ok: false, error: "Foto kelas maksimum 10 MB." };
      updates.photo_class_url = await uploadStudentPhoto(photoClass, "class");
    }
    if (photoGrad && photoGrad.size > 0) {
      if (photoGrad.size > MAX_PHOTO_BYTES) return { ok: false, error: "Foto wisuda maksimum 10 MB." };
      updates.photo_grad_url = await uploadStudentPhoto(photoGrad, "grad");
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload foto gagal." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select("id, name, custom_title, quote, destination, photo_class_url, photo_grad_url, class_number, is_featured, created_at")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, data: data as Student };
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Invalid ID." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function getAllStudents(): Promise<Student[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("students")
    .select("id, name, custom_title, quote, destination, photo_class_url, photo_grad_url, class_number, is_featured, created_at")
    .order("class_number", { ascending: true });
  return (data as Student[]) ?? [];
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Invalid ID." };

  const supabase = createAdminClient();

  // Fetch storage_path first so we can delete from storage too
  const { data: row } = await supabase
    .from("gallery_media")
    .select("storage_path")
    .eq("id", id)
    .single();

  // Delete DB row first
  const { error: dbErr } = await supabase.from("gallery_media").delete().eq("id", id);
  if (dbErr) return { ok: false, error: dbErr.message };

  // Best-effort storage cleanup (don't fail if file is already gone)
  if (row?.storage_path) {
    await supabase.storage.from(GALLERY_BUCKET).remove([row.storage_path]).catch(
      (e) => console.warn("[admin:deleteMedia] storage cleanup:", e)
    );
  }

  revalidatePath("/");
  return { ok: true };
}

export async function getAllMedia(): Promise<GalleryMedia[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gallery_media")
    .select("id, storage_path, storage_url, media_type, mime_type, caption, category, uploaded_by, width, height, file_size_bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as GalleryMedia[]) ?? [];
}

// ─── Confessions ──────────────────────────────────────────────────────────────

export async function deleteConfessionAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Invalid ID." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("confessions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function getAllConfessions(): Promise<Confession[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("confessions")
    .select("id, content, color, x_pos, y_pos, rotation_deg, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as Confession[]) ?? [];
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<{
  students: number; media: number; confessions: number;
}> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [s, m, c] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("gallery_media").select("id", { count: "exact", head: true }),
    supabase.from("confessions").select("id", { count: "exact", head: true }),
  ]);

  return {
    students:    s.count ?? 0,
    media:       m.count ?? 0,
    confessions: c.count ?? 0,
  };
}
