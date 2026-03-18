// app/api/upload/route.ts
// Local file upload — saves to public/uploads/
// Falls back gracefully when filesystem write isn't available (e.g. Vercel prod)

import { NextRequest, NextResponse } from "next/server";
import { join, extname } from "path";
import { writeFile, mkdir } from "fs/promises";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".heic", ".heif", ".mp4", ".mov", ".m4v",
]);

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp",
    ".gif": "image/gif", ".heic": "image/heic",
    ".heif": "image/heif", ".mp4": "video/mp4",
    ".mov": "video/quicktime", ".m4v": "video/x-m4v",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const passcode = formData.get("passcode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file." }, { status: 400 });
    }

    // Validate passcode
    const expected = process.env.CLASS_PASSCODE;
    if (expected && passcode !== expected) {
      return NextResponse.json({ error: "Passcode salah." }, { status: 401 });
    }

    // Validate extension
    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Format ${ext} tidak didukung. Pakai: JPG, PNG, WEBP, MP4, MOV.` },
        { status: 400 }
      );
    }

    // Build safe filename
    const timestamp = Date.now();
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename  = `${timestamp}-${safeName}`;

    // Save to public/uploads/
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({
      url:      `/uploads/${filename}`,
      filename,
      mimeType: mimeFromExt(ext),
      size:     file.size,
    });
  } catch (err) {
    console.error("[api/upload] error:", err);
    return NextResponse.json(
      { error: "Upload gagal. Di production (Vercel), pakai Supabase Storage. Untuk local dev, ini seharusnya berhasil." },
      { status: 500 }
    );
  }
}

// App Router segment config — replaces the old `export const config`
export const maxDuration = 60; // seconds, for large file uploads
