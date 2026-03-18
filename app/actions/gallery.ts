"use server";
import { createAdminClient, validatePasscode } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import type { GalleryMedia } from "@/lib/supabase/database.types";

const GALLERY_BUCKET = "gallery";
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;   // 50 MB (HEIC files are bigger)
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;  // 500 MB (MOV from iPhone are huge)
const PAGE_SIZE = 24;

// All accepted MIME types → storage extension
// Covers every format iPhone Camera produces
const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg",           "jpg"],
  ["image/jpg",            "jpg"],   // non-standard but some browsers send this
  ["image/png",            "png"],
  ["image/webp",           "webp"],
  ["image/gif",            "gif"],
  ["image/heic",           "heic"],  // iPhone default since iOS 11
  ["image/heif",           "heif"],
  ["image/heic-sequence",  "heic"],
  ["image/heif-sequence",  "heif"],
  ["video/mp4",            "mp4"],
  ["video/quicktime",      "mov"],   // iPhone .mov — most common iPhone video
  ["video/x-m4v",          "m4v"],
  ["video/x-mov",          "mov"],
]);

// HEIC/HEIF: stored fine, but browser can't render inline
const BROWSER_UNRENDERABLE = new Set([
  "image/heic", "image/heif",
  "image/heic-sequence", "image/heif-sequence",
]);

// ─── Upload ───────────────────────────────────────────────────────────────────
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

  // Normalize MIME — iPhone sometimes sends empty/generic type for HEIC/MOV
  let mimeType = file.type;
  if (!mimeType || mimeType === "application/octet-stream") {
    const name = file.name.toLowerCase();
    if      (name.endsWith(".heic"))                     mimeType = "image/heic";
    else if (name.endsWith(".heif"))                     mimeType = "image/heif";
    else if (name.endsWith(".mov"))                      mimeType = "video/quicktime";
    else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (name.endsWith(".png"))                      mimeType = "image/png";
    else if (name.endsWith(".mp4"))                      mimeType = "video/mp4";
  }

  const ext = ALLOWED_MIME_TYPES.get(mimeType);
  if (!ext) {
    return {
      error: `Format tidak didukung: ${mimeType || file.name}. Yang didukung: JPEG, PNG, WebP, GIF, HEIC, MP4, MOV.`,
    };
  }

  const isVideo = mimeType.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { error: `Terlalu besar. Maks ${maxMB} MB untuk ${isVideo ? "video" : "gambar"}.` };
  }

  const category   = (formData.get("category")   as string) || "Everyday";
  const caption    = ((formData.get("caption")    as string) || "").trim() || null;
  const uploadedBy = ((formData.get("uploadedBy") as string) || "").trim() || null;

  const uuid        = randomUUID();
  const storagePath = `${isVideo ? "videos" : "images"}/${uuid}.${ext}`;

  const supabase = createAdminClient();
  const buffer   = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "31536000",
    });

  if (uploadError) {
    console.error("[gallery:upload] Storage error:", uploadError);
    return { error: "Upload gagal. Cek apakah bucket 'gallery' sudah dibuat dan public." };
  }

  const { data: { publicUrl: storageUrl } } = supabase.storage
    .from(GALLERY_BUCKET)
    .getPublicUrl(storagePath);

  const { data: inserted, error: dbError } = await supabase
    .from("gallery_media")
    .insert({
      storage_path:    storagePath,
      storage_url:     storageUrl,
      media_type:      isVideo ? "video" : "image",
      mime_type:       mimeType,
      caption,
      category,
      uploaded_by:     uploadedBy,
      file_size_bytes: file.size,
    })
    .select("id, storage_url")
    .single();

  if (dbError) {
    console.error("[gallery:upload] DB insert error:", dbError);
    await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]);
    return { error: "Gagal simpan ke database. Coba lagi." };
  }

  return { data: { id: inserted.id, storage_url: inserted.storage_url } };
}

// ─── Cursor-based load-more ───────────────────────────────────────────────────
interface LoadMoreResult {
  error?: string;
  data?: { items: GalleryMedia[]; hasMore: boolean; nextCursor: string | null };
}

export async function loadMoreMediaAction(
  cursor: string,
  category: string
): Promise<LoadMoreResult> {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(cursor)) return { error: "Invalid cursor." };

  const supabase = createAdminClient();

  let query = supabase
    .from("gallery_media")
    .select("id, storage_path, storage_url, media_type, mime_type, caption, category, uploaded_by, width, height, file_size_bytes, created_at")
    .lt("created_at", cursor)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (category !== "Semua") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("[gallery:loadMore] DB error:", error);
    return { error: "Gagal load lebih banyak." };
  }

  const items      = (data as GalleryMedia[]).slice(0, PAGE_SIZE);
  const hasMore    = data.length > PAGE_SIZE;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;

  return { data: { items, hasMore, nextCursor } };
}

export { BROWSER_UNRENDERABLE };
