"use server";
import { createAdminClient, validatePasscode } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import type { GalleryMedia } from "@/lib/supabase/database.types";

const GALLERY_BUCKET = "gallery";
const PAGE_SIZE = 24;

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg",          "jpg"],
  ["image/jpg",           "jpg"],
  ["image/png",           "png"],
  ["image/webp",          "webp"],
  ["image/gif",           "gif"],
  ["image/heic",          "heic"],
  ["image/heif",          "heif"],
  ["image/heic-sequence", "heic"],
  ["image/heif-sequence", "heif"],
  ["video/mp4",           "mp4"],
  ["video/quicktime",     "mov"],
  ["video/x-m4v",         "m4v"],
  ["video/x-mov",         "mov"],
]);

const MAX_IMAGE_MB = 50;
const MAX_VIDEO_MB = 500;

// ─── Step 1: Get presigned upload URL ────────────────────────────────────────
// Client calls this FIRST to get a short-lived signed URL, then uploads the
// file DIRECTLY from browser to Supabase Storage — completely bypasses Vercel's
// 4.5 MB serverless body limit.

interface PresignResult {
  error?: string;
  data?: {
    signedUrl: string;
    token: string;
    storagePath: string;
    publicUrl: string;
  };
}

export async function getUploadUrlAction(
  mimeType: string,
  fileName: string,
  fileSizeMB: number,
  passcode: string
): Promise<PresignResult> {
  if (!validatePasscode(passcode)) {
    return { error: "Passcode salah. Minta ke admin kelas." };
  }

  // Normalize mime from file extension if browser sends empty/octet-stream
  let resolvedMime = mimeType;
  if (!resolvedMime || resolvedMime === "application/octet-stream") {
    const lowerName = fileName.toLowerCase();
    if      (lowerName.endsWith(".heic"))                      resolvedMime = "image/heic";
    else if (lowerName.endsWith(".heif"))                      resolvedMime = "image/heif";
    else if (lowerName.endsWith(".mov"))                       resolvedMime = "video/quicktime";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) resolvedMime = "image/jpeg";
    else if (lowerName.endsWith(".png"))                       resolvedMime = "image/png";
    else if (lowerName.endsWith(".mp4"))                       resolvedMime = "video/mp4";
  }

  const ext = ALLOWED_MIME_TYPES.get(resolvedMime);
  if (!ext) {
    return { error: `Format tidak didukung: ${resolvedMime}. Yang didukung: JPEG, PNG, WebP, GIF, HEIC, MP4, MOV.` };
  }

  const isVideo  = resolvedMime.startsWith("video/");
  const maxSizeMB = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (fileSizeMB > maxSizeMB) {
    return { error: `Terlalu besar. Maks ${maxSizeMB} MB untuk ${isVideo ? "video" : "gambar"}.` };
  }

  const uuid        = randomUUID();
  const storagePath = `${isVideo ? "videos" : "images"}/${uuid}.${ext}`;

  const supabase = createAdminClient();

  // Create a signed upload URL valid for 10 minutes
  const { data, error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error("[gallery:presign] error:", error);
    return { error: "Gagal menyiapkan upload. Coba lagi." };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(GALLERY_BUCKET)
    .getPublicUrl(storagePath);

  return {
    data: {
      signedUrl:   data.signedUrl,
      token:       data.token,
      storagePath,
      publicUrl,
    },
  };
}

// ─── Step 2: Confirm upload & save metadata ───────────────────────────────────
// Called after the client has successfully uploaded the file directly to storage.

interface ConfirmResult {
  error?: string;
  data?: { id: string; storage_url: string };
}

export async function confirmUploadAction(
  storagePath: string,
  publicUrl: string,
  mimeType: string,
  fileSizeBytes: number,
  category: string,
  caption: string | null,
  uploadedBy: string | null,
  passcode: string
): Promise<ConfirmResult> {
  if (!validatePasscode(passcode)) {
    return { error: "Passcode salah." };
  }

  // Validate path looks like our generated paths (prevent injection)
  if (!/^(images|videos)\/[0-9a-f-]{36}\.[a-z0-9]+$/.test(storagePath)) {
    return { error: "Invalid storage path." };
  }

  const isVideo = mimeType.startsWith("video/");

  const supabase = createAdminClient();
  const { data: inserted, error: dbError } = await supabase
    .from("gallery_media")
    .insert({
      storage_path:    storagePath,
      storage_url:     publicUrl,
      media_type:      isVideo ? "video" : "image",
      mime_type:       mimeType,
      caption:         caption || null,
      category:        category || "Everyday",
      uploaded_by:     uploadedBy || null,
      file_size_bytes: fileSizeBytes,
    })
    .select("id, storage_url")
    .single();

  if (dbError) {
    console.error("[gallery:confirm] DB insert error:", dbError);
    // Best-effort cleanup of orphaned file
    await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]).catch(() => {});
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
    .select(
      "id, storage_path, storage_url, media_type, mime_type, caption, category, uploaded_by, width, height, file_size_bytes, created_at"
    )
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

export { ALLOWED_MIME_TYPES };
