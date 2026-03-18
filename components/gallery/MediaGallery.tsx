"use client";
// components/gallery/MediaGallery.tsx
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Masonry from "react-masonry-css";
import {
  X,
  Download,
  Play,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
} from "lucide-react";
import type { GalleryMedia } from "@/lib/supabase/database.types";
import { uploadMediaAction } from "@/app/actions/gallery";

// ────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────
const CATEGORIES = [
  "Semua",
  "Jam Kosong",
  "Classmeet",
  "Trauma MTK",
  "Study Session",
  "Field Trip",
  "Kelulusan",
  "Everyday",
];

const BREAKPOINTS = {
  default: 4,
  1100: 3,
  700: 2,
  500: 2,
};

// ────────────────────────────────────────────
// LIGHTBOX COMPONENT
// ────────────────────────────────────────────
interface LightboxProps {
  media: GalleryMedia;
  all: GalleryMedia[];
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

function Lightbox({ media, all, onClose, onNavigate }: LightboxProps) {
  const [downloading, setDownloading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentIndex = all.findIndex((m) => m.id === media.id);

  // ── Download handler: fetches original file, triggers native browser download
  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(media.storage_url);
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const ext = media.mime_type?.split("/")[1] ?? (media.media_type === "video" ? "mp4" : "jpg");
      const filename = `MTK_Archive_${media.id.slice(0, 8)}.${ext}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab
      window.open(media.storage_url, "_blank");
    } finally {
      setDownloading(false);
    }
  }, [media, downloading]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate("prev");
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
      {/* Inner container — stops propagation */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-5xl mx-4 flex flex-col gap-3 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] text-gold bg-gold/10 rounded-md px-2 py-1">
              {media.category}
            </span>
            {media.uploaded_by && (
              <span className="ml-2 font-mono text-[11px] text-muted">
                oleh {media.uploaded_by}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Download button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-void rounded-xl text-sm font-semibold hover:bg-gold-dim transition-colors disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {downloading ? "Downloading..." : "Download"}
            </motion.button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-ink hover:bg-faint rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Media viewer ── */}
        <div className="relative rounded-2xl overflow-hidden bg-faint flex items-center justify-center max-h-[70vh]">
          {media.media_type === "video" ? (
            /* ── HTML5 Video Player (styled) ── */
            <video
              ref={videoRef}
              src={media.storage_url}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="w-full max-h-[70vh] rounded-2xl object-contain"
              style={{ background: "#08080e" }}
            >
              <p className="text-muted text-sm p-4">
                Your browser does not support the video tag.
              </p>
            </video>
          ) : (
            /* ── Image viewer ── */
            <div className="relative w-full" style={{ maxHeight: "70vh" }}>
              <Image
                src={media.storage_url}
                alt={media.caption ?? "Archive photo"}
                width={media.width ?? 1200}
                height={media.height ?? 800}
                className="object-contain w-full max-h-[70vh] rounded-2xl"
                priority
              />
            </div>
          )}
        </div>

        {/* ── Caption + metadata ── */}
        {(media.caption || media.file_size_bytes) && (
          <div className="flex items-end justify-between px-1">
            {media.caption && (
              <p className="font-body text-sm text-muted leading-relaxed max-w-lg">
                {media.caption}
              </p>
            )}
            {media.file_size_bytes && (
              <span className="font-mono text-[10px] text-muted/50 shrink-0 ml-4">
                {(media.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </div>
        )}

        {/* ── Navigation arrows ── */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate("prev")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full p-3 text-muted hover:text-gold transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        {currentIndex < all.length - 1 && (
          <button
            onClick={() => onNavigate("next")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-3 text-muted hover:text-gold transition-colors"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// MEDIA CARD
// ────────────────────────────────────────────
interface MediaCardProps {
  media: GalleryMedia;
  onOpen: () => void;
  index: number;
}

function MediaCard({ media, onOpen, index }: MediaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.06 }}
      className="mb-4 group relative cursor-pointer rounded-xl overflow-hidden bg-faint border border-border hover:border-gold/40 transition-all duration-300"
      onClick={onOpen}
    >
      {media.media_type === "video" ? (
        /* ── Video Thumbnail ── */
        <div className="relative aspect-video bg-faint">
          <video
            src={media.storage_url + "#t=1"}
            preload="metadata"
            className="w-full h-full object-cover"
            muted
          />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-void/40 group-hover:bg-void/20 transition-colors">
            <div className="w-12 h-12 rounded-full bg-gold/90 flex items-center justify-center shadow-gold-glow">
              <Play size={18} fill="currentColor" className="text-void ml-0.5" />
            </div>
          </div>
          {/* Video badge */}
          <span className="absolute top-2 left-2 font-mono text-[10px] text-void bg-gold rounded px-1.5 py-0.5">
            VIDEO
          </span>
        </div>
      ) : (
        /* ── Image Thumbnail ── */
        <div className="relative overflow-hidden">
          <Image
            src={media.storage_url}
            alt={media.caption ?? ""}
            width={media.width ?? 600}
            height={media.height ?? 400}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Hover zoom icon */}
          <div className="absolute inset-0 bg-void/0 group-hover:bg-void/30 transition-colors flex items-center justify-center">
            <ZoomIn
              size={24}
              className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Bottom meta */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-gold/80 bg-gold/10 rounded px-1.5 py-0.5 truncate">
            {media.category}
          </span>
          {media.uploaded_by && (
            <span className="font-mono text-[10px] text-muted truncate">
              @{media.uploaded_by}
            </span>
          )}
        </div>
        {media.caption && (
          <p className="mt-1.5 font-body text-xs text-muted line-clamp-2">
            {media.caption}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// UPLOAD MODAL
// ────────────────────────────────────────────
function UploadModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(formData: FormData) {
    setStatus("loading");
    setErrorMsg("");
    try {
      const result = await uploadMediaAction(formData);
      if (result?.error) {
        setErrorMsg(result.error);
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan. Coba lagi.");
      setStatus("error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="card-glass w-full max-w-md p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl text-ink">Upload ke Archive</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-display text-xl text-gold">Upload berhasil!</p>
          </div>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                PASSCODE KELAS *
              </label>
              <input
                name="passcode"
                type="password"
                placeholder="Masukkan passcode"
                required
                className="input-dark"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                FILE (Image / MP4) *
              </label>
              <input
                name="file"
                type="file"
                accept="image/*,video/mp4"
                required
                className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-void hover:file:bg-gold-dim cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                KATEGORI *
              </label>
              <select name="category" required className="input-dark">
                {CATEGORIES.filter((c) => c !== "Semua").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                CAPTION (opsional)
              </label>
              <input
                name="caption"
                type="text"
                placeholder="Ceritain dikit..."
                maxLength={200}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                NAMA LO (opsional)
              </label>
              <input
                name="uploadedBy"
                type="text"
                placeholder="Biar orang tau siapa yang upload"
                maxLength={60}
                className="input-dark"
              />
            </div>

            {errorMsg && (
              <p className="text-coral text-sm font-body bg-coral/10 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-gold justify-center mt-2 disabled:opacity-60"
            >
              {status === "loading" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {status === "loading" ? "Uploading..." : "Upload ke Archive"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// MAIN GALLERY COMPONENT
// ────────────────────────────────────────────
export default function MediaGallery({
  initialMedia,
}: {
  initialMedia: GalleryMedia[];
}) {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const filtered =
    activeCategory === "Semua"
      ? initialMedia
      : initialMedia.filter((m) => m.category === activeCategory);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const navigate = (direction: "prev" | "next") => {
    if (lightboxIndex === null) return;
    if (direction === "prev" && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (direction === "next" && lightboxIndex < filtered.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] tracking-wide transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-gold text-void"
                  : "bg-faint text-muted border border-border hover:border-gold/40 hover:text-gold"
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowUpload(true)}
          className="btn-gold py-2 px-4 text-xs"
        >
          <Upload size={13} />
          Upload Foto/Video
        </motion.button>
      </div>

      {/* ── Media count ── */}
      <p className="font-mono text-[11px] text-muted mb-6">
        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        {activeCategory !== "Semua" && ` dalam "${activeCategory}"`}
      </p>

      {/* ── Masonry Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4 text-center">
          <p className="text-4xl">📷</p>
          <p className="font-display text-xl text-muted">
            Belum ada foto di kategori ini.
          </p>
          <button onClick={() => setShowUpload(true)} className="btn-gold mt-2">
            <Upload size={14} /> Jadi yang pertama upload!
          </button>
        </div>
      ) : (
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
              onOpen={() => openLightbox(i)}
            />
          ))}
        </Masonry>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <Lightbox
            media={filtered[lightboxIndex]}
            all={filtered}
            onClose={closeLightbox}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal onClose={() => setShowUpload(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
