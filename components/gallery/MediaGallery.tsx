"use client";
// components/gallery/MediaGallery.tsx
// v3: local upload via /api/upload (no Supabase storage needed)
//     Supabase used for load-more pagination if configured.
//     Lightbox: keyboard/touch nav + download.

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Masonry from "react-masonry-css";
import {
  X, Download, Play, ZoomIn, ChevronLeft, ChevronRight,
  Upload, Loader2, FolderOpen,
} from "lucide-react";
import type { GalleryMedia } from "@/lib/supabase/database.types";
import { loadMoreMediaAction } from "@/app/actions/gallery";

const BROWSER_UNRENDERABLE = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

const ALL_CATEGORIES = [
  "Semua", "Jam Kosong", "Classmeet", "Trauma MTK",
  "Study Session", "Field Trip", "Kelulusan", "Everyday",
] as const;

type Category = (typeof ALL_CATEGORIES)[number];

const BREAKPOINTS = { default: 4, 1100: 3, 700: 2, 500: 2 };

// ─── Lightbox ────────────────────────────────────────────

interface LightboxProps {
  media: GalleryMedia;
  all: GalleryMedia[];
  onClose: () => void;
  onNavigate: (dir: "prev" | "next") => void;
}

function Lightbox({ media, all, onClose, onNavigate }: LightboxProps) {
  const [downloading, setDownloading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const currentIndex = all.findIndex((m) => m.id === media.id);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(media.storage_url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const ext  = media.mime_type?.split("/")[1]?.replace("jpeg", "jpg") ??
                   (media.media_type === "video" ? "mp4" : "jpg");
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `MTK_Archive_${media.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(media.storage_url, "_blank");
    } finally {
      setDownloading(false);
    }
  }, [media, downloading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  onNavigate("prev");
      if (e.key === "ArrowRight") onNavigate("next");
    },
    [onClose, onNavigate]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center bg-void/95"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-5xl mx-4 flex flex-col gap-3 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(delta) > 50) onNavigate(delta < 0 ? "next" : "prev");
          touchStartX.current = null;
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-blue bg-blue/10 rounded-md px-2 py-1">
              {media.category}
            </span>
            {media.uploaded_by && (
              <span className="font-mono text-[11px] text-muted">oleh {media.uploaded_by}</span>
            )}
            <span className="font-mono text-[10px] text-muted/40">
              {currentIndex + 1} / {all.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue text-void rounded-xl
                         text-sm font-semibold hover:bg-blue-dim transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? "Downloading…" : "Download"}
            </motion.button>
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-ink hover:bg-faint rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media viewer */}
        <div className="relative rounded-2xl overflow-hidden bg-faint flex items-center justify-center max-h-[70vh]">
          {media.media_type === "video" ? (
            <video
              src={media.storage_url}
              controls autoPlay playsInline preload="metadata"
              className="w-full max-h-[70vh] rounded-2xl object-contain"
              style={{ background: "#08080e" }}
            />
          ) : (
            <Image
              src={media.storage_url}
              alt={media.caption ?? "Archive photo"}
              width={media.width ?? 1200}
              height={media.height ?? 800}
              unoptimized={media.storage_url.startsWith("/")}
              className="object-contain w-full max-h-[70vh] rounded-2xl"
              priority
            />
          )}
        </div>

        {/* Caption */}
        {(media.caption || media.file_size_bytes) && (
          <div className="flex items-end justify-between px-1">
            {media.caption && (
              <p className="font-body text-sm text-muted leading-relaxed max-w-lg">{media.caption}</p>
            )}
            {media.file_size_bytes && (
              <span className="font-mono text-[10px] text-muted/50 shrink-0 ml-4">
                {(media.file_size_bytes / 1_048_576).toFixed(1)} MB
              </span>
            )}
          </div>
        )}

        {/* Prev/next */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate("prev")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full p-3 text-muted hover:text-blue transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        {currentIndex < all.length - 1 && (
          <button
            onClick={() => onNavigate("next")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-3 text-muted hover:text-blue transition-colors"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── MediaCard ────────────────────────────────────────────

function MediaCard({ media, onOpen, index }: {
  media: GalleryMedia;
  onOpen: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, delay: (index % 8) * 0.05 }}
      className="mb-4 group relative cursor-pointer rounded-xl overflow-hidden
                 bg-faint border border-border hover:border-blue/40
                 transition-all duration-300 hover:shadow-card-hover"
      onClick={onOpen}
    >
      {media.media_type === "video" ? (
        <div className="relative aspect-video bg-faint">
          <video
            src={`${media.storage_url}#t=1`}
            preload="metadata"
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-void/40 group-hover:bg-void/20 transition-colors">
            <div className="w-12 h-12 rounded-full bg-blue/90 flex items-center justify-center shadow-blue-glow">
              <Play size={18} fill="currentColor" className="text-void ml-0.5" />
            </div>
          </div>
          <span className="absolute top-2 left-2 font-mono text-[10px] text-void bg-blue rounded px-1.5 py-0.5">
            VIDEO
          </span>
        </div>
      ) : BROWSER_UNRENDERABLE.has(media.mime_type ?? "") ? (
        <div className="relative aspect-square bg-faint flex flex-col items-center justify-center gap-2 p-4">
          <div className="w-12 h-12 rounded-full bg-blue/10 border border-blue/30 flex items-center justify-center">
            <Download size={18} className="text-blue" />
          </div>
          <span className="font-mono text-[10px] text-blue/70">HEIC</span>
          <span className="font-body text-[11px] text-muted/60 text-center">Tap untuk download</span>
        </div>
      ) : (
        <div className="relative overflow-hidden">
          <Image
            src={media.storage_url}
            alt={media.caption ?? ""}
            width={media.width ?? 600}
            height={media.height ?? 400}
            unoptimized={media.storage_url.startsWith("/")}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-void/0 group-hover:bg-void/25 transition-colors flex items-center justify-center">
            <ZoomIn
              size={24}
              className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
            />
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-blue/80 bg-blue/10 rounded px-1.5 py-0.5 truncate">
            {media.category}
          </span>
          {media.uploaded_by && (
            <span className="font-mono text-[10px] text-muted truncate">@{media.uploaded_by}</span>
          )}
        </div>
        {media.caption && (
          <p className="mt-1.5 font-body text-xs text-muted line-clamp-2">{media.caption}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── UploadModal (local file upload via /api/upload) ──────

function UploadModal({ onClose, onUploaded }: {
  onClose: () => void;
  onUploaded: (media: GalleryMedia) => void;
}) {
  const [status,    setStatus]    = useState<"idle" | "loading" | "success" | "error">("idle");
  const [progress,  setProgress]  = useState(0);
  const [errorMsg,  setErrorMsg]  = useState("");
  const fileRef      = useRef<HTMLInputElement>(null);
  const passcodeRef  = useRef<HTMLInputElement>(null);
  const categoryRef  = useRef<HTMLSelectElement>(null);
  const captionRef   = useRef<HTMLInputElement>(null);
  const nameRef      = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    setProgress(10);

    const file       = fileRef.current?.files?.[0];
    const passcode   = passcodeRef.current?.value ?? "";
    const category   = categoryRef.current?.value ?? "Everyday";
    const caption    = captionRef.current?.value?.trim() || null;
    const uploadedBy = nameRef.current?.value?.trim() || null;

    if (!file) { setErrorMsg("Pilih file dulu."); setStatus("error"); return; }

    try {
      // Upload via API route (saves to public/uploads/)
      const fd = new FormData();
      fd.append("file",     file);
      fd.append("passcode", passcode);

      setProgress(30);

      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Upload gagal.");
      }

      setProgress(90);

      // Build a GalleryMedia-like object from the response
      const newMedia: GalleryMedia = {
        id:              `local-${Date.now()}`,
        storage_path:    `uploads/${json.filename}`,
        storage_url:     json.url,
        media_type:      json.mimeType?.startsWith("video/") ? "video" : "image",
        mime_type:       json.mimeType ?? file.type ?? null,
        caption:         caption,
        category:        category,
        uploaded_by:     uploadedBy,
        width:           null,
        height:          null,
        file_size_bytes: json.size ?? file.size,
        created_at:      new Date().toISOString(),
      };

      setProgress(100);
      setStatus("success");
      setTimeout(() => { onUploaded(newMedia); onClose(); }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setStatus("error");
      setProgress(0);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm p-4"
      onClick={status === "loading" ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="card-glass w-full max-w-md p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-blue" />
            <h3 className="font-display text-xl text-ink">Upload ke Archive</h3>
          </div>
          <button
            onClick={onClose}
            disabled={status === "loading"}
            className="text-muted hover:text-ink disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-display text-xl text-blue">Upload berhasil!</p>
            <p className="font-body text-sm text-muted mt-2">Foto sudah masuk archive.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">PASSCODE KELAS *</label>
              <input
                ref={passcodeRef}
                type="password"
                placeholder="Masukkan passcode"
                required
                className="input-dark"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                FILE (Foto atau Video) *
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.heic,.heif,video/mp4,video/quicktime,.mov"
                required
                className="w-full text-sm text-muted
                           file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                           file:text-xs file:font-semibold file:bg-blue file:text-void
                           hover:file:bg-blue-dim cursor-pointer"
              />
              <p className="font-mono text-[10px] text-muted/50 mt-1">JPEG, PNG, HEIC, MP4, MOV</p>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">KATEGORI *</label>
              <select ref={categoryRef} required className="input-dark">
                {(ALL_CATEGORIES.filter((c) => c !== "Semua") as string[]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">CAPTION (opsional)</label>
              <input ref={captionRef} type="text" placeholder="Ceritain dikit…" maxLength={200} className="input-dark" />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">NAMA LO (opsional)</label>
              <input ref={nameRef} type="text" placeholder="Biar orang tau siapa yang upload" maxLength={60} className="input-dark" />
            </div>

            {/* Progress */}
            {status === "loading" && progress > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 bg-faint rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="font-mono text-[10px] text-muted text-right">{progress}%</p>
              </div>
            )}

            {errorMsg && (
              <p className="text-coral text-sm bg-coral/10 rounded-lg px-3 py-2 flex items-center gap-2">
                <span>⚠</span>{errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-blue justify-center mt-2 disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {status === "loading" ? `Uploading… ${progress}%` : "Upload ke Archive"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── MediaGallery (main) ──────────────────────────────────

export default function MediaGallery({ initialMedia }: { initialMedia: GalleryMedia[] }) {
  const [allMedia,        setAllMedia]        = useState<GalleryMedia[]>(initialMedia);
  const [activeCategory,  setActiveCategory]  = useState<Category>("Semua");
  const [lightboxIndex,   setLightboxIndex]   = useState<number | null>(null);
  const [showUpload,      setShowUpload]       = useState(false);
  const [loadingMore,     setLoadingMore]      = useState(false);
  const [hasMore,         setHasMore]          = useState(initialMedia.length === 24);
  const [cursor,          setCursor]           = useState<string | null>(
    initialMedia.length > 0 ? initialMedia[initialMedia.length - 1].created_at : null
  );

  const filtered = useMemo(
    () =>
      activeCategory === "Semua"
        ? allMedia
        : allMedia.filter((m) => m.category === activeCategory),
    [allMedia, activeCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: allMedia.length };
    for (const m of allMedia) {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    }
    return counts;
  }, [allMedia]);

  const handleCategoryChange = useCallback((cat: Category) => {
    setLightboxIndex(null);
    setActiveCategory(cat);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await loadMoreMediaAction(cursor, activeCategory);
      if (result.error || !result.data) return;
      setAllMedia((prev) => [...prev, ...result.data!.items]);
      setHasMore(result.data.hasMore);
      setCursor(result.data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, activeCategory]);

  const handleUploaded = useCallback((media: GalleryMedia) => {
    setAllMedia((prev) => [media, ...prev]);
  }, []);

  const navigate = useCallback(
    (dir: "prev" | "next") => {
      setLightboxIndex((idx) => {
        if (idx === null) return null;
        if (dir === "prev") return idx > 0 ? idx - 1 : idx;
        return idx < filtered.length - 1 ? idx + 1 : idx;
      });
    },
    [filtered.length]
  );

  return (
    <>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        {/* Scrollable filter chips on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap sm:flex-wrap">
          {ALL_CATEGORIES.map((cat) => {
            const count  = categoryCounts[cat] ?? 0;
            const active = activeCategory === cat;
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryChange(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-lg font-mono text-[11px] tracking-wide
                            transition-all duration-200 flex items-center gap-1.5 ${
                  active
                    ? "bg-blue text-void"
                    : "bg-faint text-muted border border-border hover:border-blue/40 hover:text-blue"
                }`}
              >
                {cat}
                {count > 0 && (
                  <span className={`text-[9px] px-1 rounded ${
                    active ? "bg-void/20 text-void" : "bg-border text-muted/70"
                  }`}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowUpload(true)}
          className="btn-blue py-2 px-4 text-xs shrink-0"
        >
          <Upload size={13} />
          Upload
        </motion.button>
      </div>

      {/* Count */}
      <p className="font-mono text-[11px] text-muted mb-6">
        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        {activeCategory !== "Semua" && ` dalam "${activeCategory}"`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4 text-center">
          <p className="text-4xl">📷</p>
          <p className="font-display text-xl text-muted">Belum ada foto di kategori ini.</p>
          <button onClick={() => setShowUpload(true)} className="btn-blue mt-2">
            <Upload size={14} /> Jadi yang pertama upload!
          </button>
        </div>
      ) : (
        <>
          <Masonry
            breakpointCols={BREAKPOINTS}
            className="masonry-grid"
            columnClassName="masonry-column"
          >
            {filtered.map((media, i) => (
              <MediaCard
                key={media.id}
                media={media}
                index={i}
                onOpen={() => setLightboxIndex(i)}
              />
            ))}
          </Masonry>

          {hasMore && activeCategory === "Semua" && (
            <div className="flex justify-center mt-10">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-outline disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                {loadingMore ? "Loading…" : "Load More"}
              </motion.button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <Lightbox
            media={filtered[lightboxIndex]}
            all={filtered}
            onClose={() => setLightboxIndex(null)}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onUploaded={handleUploaded}
          />
        )}
      </AnimatePresence>
    </>
  );
}
