"use server";
import { createAdminClient, validatePasscode } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import type { GalleryMedia } from "@/lib/supabase/database.types";

const GALLERY_BUCKET = "gallery";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;   // 20 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;  // 200 MB
const PAGE_SIZE = 24;

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
]);

// ─── Upload ──────────────────────────────────────────────────────────────────
interface UploadResult {
  error?: string;
  data?: { id: string; storage_url: string };
}

export async function uploadMediaAction(
  formData: FormData
): Promise<UploadResult> {
  const passcode = formData.get("passcode") as string;
  if (!validatePasscode(passcode)) {
    return { error: "Passcode salah. Minta ke admin kelas." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "File tidak ditemukan." };

  const ext = ALLOWED_MIME_TYPES.get(file.type);
  if (!ext) {
    return {
      error: `Format tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, GIF, atau MP4.`,
    };
  }

  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return {
      error: `File terlalu besar. Maksimum ${maxMB} MB untuk ${isVideo ? "video" : "gambar"}.`,
    };
  }

  const category = (formData.get("category") as string) || "Everyday";
  const caption = ((formData.get("caption") as string) || "").trim() || null;
  const uploadedBy =
    ((formData.get("uploadedBy") as string) || "").trim() || null;

  const uuid = randomUUID();
  const storagePath = `${isVideo ? "videos" : "images"}/${uuid}.${ext}`;

  const supabase = createAdminClient();
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[gallery:upload] Storage error:", uploadError);
    return { error: "Upload gagal. Coba lagi." };
  }

  const {
    data: { publicUrl: storageUrl },
  } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);

  const { data: inserted, error: dbError } = await supabase
    .from("gallery_media")
    .insert({
      storage_path: storagePath,
      storage_url: storageUrl,
      media_type: isVideo ? "video" : "image",
      mime_type: file.type,
      caption,
      category,
      uploaded_by: uploadedBy,
      file_size_bytes: file.size,
    })
    .select("id, storage_url")
    .single();

  if (dbError) {
    console.error("[gallery:upload] DB insert error:", dbError);
    // Rollback: clean up orphaned storage object
    await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]);
    return { error: "Gagal menyimpan metadata. Coba lagi." };
  }

  return { data: { id: inserted.id, storage_url: inserted.storage_url } };
}

// ─── Cursor-based load-more ───────────────────────────────────────────────────
// `cursor` is the `created_at` ISO string of the last item currently shown.
// Returns the next PAGE_SIZE items and whether more items exist after them.
interface LoadMoreResult {
  error?: string;
  data?: { items: GalleryMedia[]; hasMore: boolean; nextCursor: string | null };
}

export async function loadMoreMediaAction(
  cursor: string,
  category: string
): Promise<LoadMoreResult> {
  // Validate cursor is a plausible ISO date string
  if (!/^\d{4}-\d{2}-\d{2}T/.test(cursor)) {
    return { error: "Invalid cursor." };
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("gallery_media")
    .select(
      "id, storage_path, storage_url, media_type, mime_type, caption, category, uploaded_by, width, height, file_size_bytes, created_at"
    )
    .lt("created_at", cursor)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1); // fetch one extra to know if more pages exist

  if (category !== "Semua") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[gallery:loadMore] DB error:", error);
    return { error: "Gagal memuat lebih banyak." };
  }

  const items = (data as GalleryMedia[]).slice(0, PAGE_SIZE);
  const hasMore = data.length > PAGE_SIZE;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  return { data: { items, hasMore, nextCursor } };
}
