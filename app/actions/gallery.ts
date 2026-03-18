"use server";
import { createAdminClient, validatePasscode } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const GALLERY_BUCKET = "gallery";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
]);

interface ActionResult {
  error?: string;
  data?: { id: string; storage_url: string };
}

export async function uploadMediaAction(
  formData: FormData
): Promise<ActionResult> {
  const passcode = formData.get("passcode") as string;
  if (!validatePasscode(passcode)) {
    return { error: "Passcode salah. Minta ke admin kelas." };
  }

  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "Everyday";
  const caption = (formData.get("caption") as string) || null;
  const uploadedBy = (formData.get("uploadedBy") as string) || null;

  if (!file || file.size === 0) {
    return { error: "File tidak ditemukan." };
  }

  const mimeType = file.type;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      error: `Format tidak didukung: ${mimeType}. Gunakan JPEG, PNG, WebP, GIF, atau MP4.`,
    };
  }

  const isVideo = mimeType.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return {
      error: `File terlalu besar. Maksimum ${maxMB}MB untuk ${isVideo ? "video" : "gambar"}.`,
    };
  }

  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const uuid = randomUUID();
  const storagePath = `${isVideo ? "videos" : "images"}/${uuid}.${ext}`;

  const supabase = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[gallery upload] Storage error:", uploadError);
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
      mime_type: mimeType,
      caption: caption || null,
      category,
      uploaded_by: uploadedBy || null,
      file_size_bytes: file.size,
    })
    .select("id, storage_url")
    .single();

  if (dbError) {
    console.error("[gallery upload] DB insert error:", dbError);
    await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]);
    return { error: "Gagal menyimpan metadata. Coba lagi." };
  }

  return { data: { id: inserted.id, storage_url: inserted.storage_url } };
}
