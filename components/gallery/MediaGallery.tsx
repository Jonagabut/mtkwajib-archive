"use client";
// components/gallery/MediaGallery.tsx
// v4: static-first gallery — photos live in public/gallery/, no upload UI needed.
// Lightbox: keyboard nav (←/→/Esc) + touch swipe + download.

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Masonry from "react-masonry-css";
import {
  X, Download, Play, ZoomIn, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import type { GalleryMedia } from "@/lib/supabase/database.types";
import { loadMoreMediaAction } from "@/app/actions/gallery";

const BROWSER_UNRENDERABLE = new Set([
  "image/heic","image/heif","image/heic-sequence","image/heif-sequence",
]);

const ALL_CATEGORIES = [
  "Semua","Jam Kosong","Classmeet","Trauma MTK",
  "Study Session","Field Trip","Kelulusan","Everyday",
] as const;
type Category = (typeof ALL_CATEGORIES)[number];

const BREAKPOINTS = { default: 4, 1100: 3, 700: 2, 500: 2 };

// ─── Lightbox ────────────────────────────────────────────

function Lightbox({ media, all, onClose, onNavigate }: {
  media: GalleryMedia;
  all: GalleryMedia[];
  onClose: () => void;
  onNavigate: (dir: "prev" | "next") => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const currentIndex = all.findIndex((m) => m.id === media.id);
  const isLocal = media.storage_url.startsWith("/");

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res  = await fetch(media.storage_url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const ext  = media.mime_type?.split("/")[1]?.replace("jpeg","jpg")
                   ?? (media.media_type === "video" ? "mp4" : "jpg");
      const a    = Object.assign(document.createElement("a"), {
        href: url, download: `MTK_Archive_${media.id.slice(0,8)}.${ext}`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { window.open(media.storage_url, "_blank"); }
    finally   { setDownloading(false); }
  }, [media, downloading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape")     onClose();
    if (e.key === "ArrowLeft")  onNavigate("prev");
    if (e.key === "ArrowRight") onNavigate("next");
  }, [onClose, onNavigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center bg-void/95"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const d = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(d) > 50) onNavigate(d < 0 ? "next" : "prev");
        touchStartX.current = null;
      }}
      tabIndex={-1}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-5xl mx-4 flex flex-col gap-3 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
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
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue text-void rounded-xl
                         text-sm font-semibold hover:bg-blue-dim transition-colors disabled:opacity-60"
            >
              {downloading
                ? <Loader2 size={14} className="animate-spin" />
                : <Download size={14} />}
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

        {/* Media */}
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
              unoptimized={isLocal}
              className="object-contain w-full max-h-[70vh] rounded-2xl"
              priority
            />
          )}
        </div>

        {/* Caption */}
        {(media.caption || media.file_size_bytes) && (
          <div className="flex items-end justify-between px-1">
            {media.caption && (
              <p className="font-body text-sm text-muted leading-relaxed max-w-lg capitalize">
                {media.caption}
              </p>
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
  media: GalleryMedia; onOpen: () => void; index: number;
}) {
  const isLocal = media.storage_url.startsWith("/");
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
          <video src={`${media.storage_url}#t=1`} preload="metadata"
            className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center bg-void/40 group-hover:bg-void/20 transition-colors">
            <div className="w-12 h-12 rounded-full bg-blue/90 flex items-center justify-center shadow-blue-glow">
              <Play size={18} fill="currentColor" className="text-void ml-0.5" />
            </div>
          </div>
          <span className="absolute top-2 left-2 font-mono text-[10px] text-void bg-blue rounded px-1.5 py-0.5">VIDEO</span>
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
            unoptimized={isLocal}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-void/0 group-hover:bg-void/25 transition-colors flex items-center justify-center">
            <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
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
          <p className="mt-1.5 font-body text-xs text-muted capitalize">{media.caption}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Gallery ─────────────────────────────────────────

export default function MediaGallery({ initialMedia }: { initialMedia: GalleryMedia[] }) {
  const [allMedia,       setAllMedia]       = useState<GalleryMedia[]>(initialMedia);
  const [activeCategory, setActiveCategory] = useState<Category>("Semua");
  const [lightboxIndex,  setLightboxIndex]  = useState<number | null>(null);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [hasMore,        setHasMore]        = useState(initialMedia.length === 48);
  const [cursor,         setCursor]         = useState<string | null>(
    initialMedia.length > 0 ? initialMedia[initialMedia.length - 1].created_at : null
  );

  const filtered = useMemo(
    () => activeCategory === "Semua"
      ? allMedia
      : allMedia.filter((m) => m.category === activeCategory),
    [allMedia, activeCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: allMedia.length };
    for (const m of allMedia) counts[m.category] = (counts[m.category] ?? 0) + 1;
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
      if (!result.error && result.data) {
        setAllMedia((prev) => [...prev, ...result.data!.items]);
        setHasMore(result.data.hasMore);
        setCursor(result.data.nextCursor);
      }
    } finally { setLoadingMore(false); }
  }, [cursor, loadingMore, activeCategory]);

  const navigate = useCallback((dir: "prev" | "next") => {
    setLightboxIndex((idx) => {
      if (idx === null) return null;
      if (dir === "prev") return idx > 0 ? idx - 1 : idx;
      return idx < filtered.length - 1 ? idx + 1 : idx;
    });
  }, [filtered.length]);

  return (
    <>
      {/* Filter bar — horizontal scroll on mobile */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
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
                  }`}>{count}</span>
                )}
              </motion.button>
            );
          })}
        </div>
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
          <p className="font-body text-sm text-muted/50">
            Tambahkan foto ke folder <code className="text-blue text-xs">public/gallery/</code> lalu push ke GitHub.
          </p>
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
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleLoadMore} disabled={loadingMore}
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
    </>
  );
}
