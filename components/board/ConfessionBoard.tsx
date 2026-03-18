"use client";
// components/board/ConfessionBoard.tsx — v3
// Dense sticky-note board:
//  - CSS columns masonry: 2 col mobile → 3 → 4 → 5
//  - Compact note cards (small padding, small text)
//  - rotation clip-fix: wrapper contains, note rotates inside
//  - Seed notes when empty, realtime via Supabase
//  - Bug fixes: removed unused selectedColor, fixed AnimatePresence placement

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Pin, Wifi, WifiOff, MessageSquare } from "lucide-react";
import type { Confession, NoteColor } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { postConfessionAction } from "@/app/actions/confessions";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_CHARS = 280;

const COLOR_OPTIONS = [
  { value: "yellow"   as NoteColor, label: "Kuning", bg: "#f5e27a", pin: "#c9a232", text: "#3d2f00" },
  { value: "pink"     as NoteColor, label: "Pink",   bg: "#f7b8a0", pin: "#c4674e", text: "#3d1200" },
  { value: "lavender" as NoteColor, label: "Ungu",   bg: "#c4b8f0", pin: "#7a6faa", text: "#1a1040" },
] as const;

const BG: Record<NoteColor, string> = {
  yellow:   "linear-gradient(150deg, #f7e98a 0%, #eecf35 100%)",
  pink:     "linear-gradient(150deg, #fac4a8 0%, #f08a6a 100%)",
  lavender: "linear-gradient(150deg, #ccc0f4 0%, #a898e0 100%)",
};
const TEXT: Record<NoteColor, string> = {
  yellow: "#3d2f00", pink: "#3d1200", lavender: "#1a1040",
};
const PIN: Record<NoteColor, string> = {
  yellow: "#c9a232", pink: "#c4674e", lavender: "#7a6faa",
};

// ─── Seed notes (shown when board empty) ────────────────────────────────────

const SEED_NOTES: Confession[] = [
  {
    id: "seed-1",
    content: "MTK itu bukan pelajaran — itu latihan mental nerima kenyataan pahit. Tapi kita survive! 😭",
    color: "yellow",
    rotation_deg: -2,
    created_at: "2024-01-01T00:00:00",
    x_pos: 0, y_pos: 0,
  },
  {
    id: "seed-2",
    content: "Ga pernah beneran ngerti limit dan turunan. Tapi nilainya lumayan. Rezeki anak soleh 💀",
    color: "pink",
    rotation_deg: 2.5,
    created_at: "2024-01-01T00:00:01",
    x_pos: 0, y_pos: 0,
  },
  {
    id: "seed-3",
    content: "Makasih buat semua yang kasih contekan 🙏",
    color: "lavender",
    rotation_deg: -1,
    created_at: "2024-01-01T00:00:02",
    x_pos: 0, y_pos: 0,
  },
  {
    id: "seed-4",
    content: "Siapa yang inget kita belajar bareng ampe subuh? Worth it ga tuh? 😂",
    color: "yellow",
    rotation_deg: 1.5,
    created_at: "2024-01-01T00:00:03",
    x_pos: 0, y_pos: 0,
  },
  {
    id: "seed-5",
    content: "Akhirnya lulus juga. Gue kira bakal repeat year karena MTK 💪",
    color: "pink",
    rotation_deg: -2.5,
    created_at: "2024-01-01T00:00:04",
    x_pos: 0, y_pos: 0,
  },
  {
    id: "seed-6",
    content: "Bestie yang sering jadi korban contekan — lo pahlawan tanpa tanda jasa fr fr ✨",
    color: "lavender",
    rotation_deg: 1,
    created_at: "2024-01-01T00:00:05",
    x_pos: 0, y_pos: 0,
  },
];

// ─── NoteCard — compact ──────────────────────────────────────────────────────

function NoteCard({
  note,
  isNew,
  isSeed = false,
}: {
  note: Confession;
  isNew: boolean;
  isSeed?: boolean;
}) {
  const color = (note.color as NoteColor) ?? "yellow";
  // Clamp rotation so it doesn't push out of column width
  const rot   = Math.max(-4, Math.min(4, note.rotation_deg ?? 0));

  return (
    // Outer wrapper: provides the column-flow space, no overflow clip
    <motion.div
      layout
      initial={isNew ? { scale: 0.5, opacity: 0, y: -16 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: isSeed ? 0.6 : 1, scale: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="mb-3 break-inside-avoid"
      // padding so rotated corners don't get clipped by adjacent columns
      style={{ padding: "4px 2px" }}
    >
      {/* Inner: the visible sticky note */}
      <div
        style={{
          background:  BG[color],
          boxShadow:   `2px 3px 0px ${PIN[color]}, 4px 6px 14px rgba(0,0,0,0.4)`,
          color:       TEXT[color],
          transform:   `rotate(${rot}deg)`,
          transformOrigin: "center 30%",
        }}
        className="relative rounded-lg px-3 pt-5 pb-3"
      >
        {/* Pin */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full
                     border border-white/30 flex items-center justify-center shadow z-10"
          style={{ background: PIN[color] }}
        >
          <Pin size={6} className="opacity-70 -rotate-45" />
        </div>

        {/* Content */}
        <p
          className="text-[11px] sm:text-xs leading-relaxed break-words whitespace-pre-wrap font-body"
          style={{ color: TEXT[color] }}
        >
          {note.content}
        </p>

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-2 pt-1.5"
          style={{ borderTop: `1px solid ${PIN[color]}25` }}
        >
          <span className="font-mono text-[8px] opacity-35">anon</span>
          {isSeed ? (
            <span className="font-mono text-[8px] opacity-25 italic">contoh</span>
          ) : (
            <time className="font-mono text-[8px] opacity-30">
              {new Date(note.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </time>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── PostModal ───────────────────────────────────────────────────────────────

function PostModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (note: Confession) => void;
}) {
  const [color,     setColor]     = useState<NoteColor>("yellow");
  const [status,    setStatus]    = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [charCount, setCharCount] = useState(0);

  const currentColor = COLOR_OPTIONS.find((o) => o.value === color)!;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    fd.set("color", color);

    try {
      const result = await postConfessionAction(fd);
      if (result?.error) {
        setErrorMsg(result.error);
        setStatus("error");
        return;
      }

      const content = (fd.get("content") as string).trim();
      const newNote: Confession = {
        id:           result.data!.id,
        content,
        color,
        x_pos:        0,
        y_pos:        0,
        rotation_deg: (Math.random() - 0.5) * 6,
        created_at:   new Date().toISOString(),
      };

      setStatus("success");
      setTimeout(() => { onSuccess(newNote); onClose(); }, 700);
    } catch {
      setErrorMsg("Koneksi bermasalah. Coba lagi.");
      setStatus("error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-void/92 backdrop-blur-md p-4"
      onClick={status === "loading" ? undefined : onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG[color],
          boxShadow:  `4px 5px 0px ${PIN[color]}, 0 24px 60px rgba(0,0,0,0.65)`,
        }}
      >
        {/* Top pin */}
        <div className="flex items-center justify-center pt-5 pb-2">
          <div
            className="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center shadow"
            style={{ background: PIN[color] }}
          >
            <Pin size={9} className="opacity-75 -rotate-45" />
          </div>
        </div>

        <div className="px-6 pb-6 pt-2" style={{ color: TEXT[color] }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl" style={{ color: TEXT[color] }}>
              Tempel Note 📌
            </h3>
            <button
              onClick={onClose}
              disabled={status === "loading"}
              className="opacity-50 hover:opacity-100 transition-opacity disabled:opacity-30
                         min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
              style={{ color: TEXT[color] }}
            >
              <X size={18} />
            </button>
          </div>

          {status === "success" ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📌</p>
              <p className="font-display text-lg" style={{ color: TEXT[color] }}>
                Note berhasil ditempel!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Color picker */}
              <div>
                <label className="block font-mono text-[10px] opacity-55 mb-2 uppercase tracking-wider">
                  Warna Note
                </label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setColor(opt.value)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono
                                  transition-all duration-200 ${
                        color === opt.value
                          ? "ring-2 ring-white/50 scale-105 font-bold shadow"
                          : "opacity-55 hover:opacity-85"
                      }`}
                      style={{ background: opt.bg, color: opt.text }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[10px] opacity-55 uppercase tracking-wider">
                    Tulis *
                  </label>
                  <span
                    className="font-mono text-[10px] transition-colors"
                    style={{
                      color:   charCount > MAX_CHARS * 0.88 ? "#e05a4a" : TEXT[color],
                      opacity: charCount > MAX_CHARS * 0.7  ? 1 : 0.4,
                    }}
                  >
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
                <textarea
                  name="content"
                  required
                  maxLength={MAX_CHARS}
                  rows={4}
                  placeholder="Curhat, roast, atau hal yang pengen lo sampaikan..."
                  onChange={(e) => setCharCount(e.target.value.length)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-body resize-none
                             border-2 focus:outline-none transition-all duration-200"
                  style={{
                    background:  `${PIN[color]}12`,
                    borderColor: `${PIN[color]}38`,
                    color:        TEXT[color],
                  }}
                />
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-900/40 text-red-200 text-sm rounded-xl px-3 py-2.5">
                  <span>⚠</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 rounded-xl font-body font-bold text-sm text-white
                           transition-all duration-200 active:scale-95 disabled:opacity-55
                           flex items-center justify-center gap-2 min-h-[44px] shadow"
                style={{ background: PIN[color] }}
              >
                {status === "loading"
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Pin size={15} />
                }
                {status === "loading" ? "Posting..." : "Tempel Note"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Board ──────────────────────────────────────────────────────────────

export default function ConfessionBoard({
  initialConfessions,
}: {
  initialConfessions: Confession[];
}) {
  const [notes,      setNotes]      = useState<Confession[]>(initialConfessions);
  const [showModal,  setShowModal]  = useState(false);
  const [realtimeOk, setRealtimeOk] = useState<boolean | null>(null);
  const [newNoteIds, setNewNoteIds] = useState<Set<string>>(new Set());

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setRealtimeOk(false);
      return;
    }

    const channel = supabase
      .channel("public:confessions:v3")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "confessions" },
        (payload) => {
          const incoming = payload.new as Confession;
          setNotes((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
          setNewNoteIds((prev) => new Set(Array.from(prev).concat(incoming.id)));
          setTimeout(() => {
            setNewNoteIds((prev) => {
              const s = new Set(prev);
              s.delete(incoming.id);
              return s;
            });
          }, 2500);
        }
      )
      .subscribe((s) => setRealtimeOk(s === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleNewNote = useCallback((note: Confession) => {
    setNotes((prev) => {
      if (prev.some((n) => n.id === note.id)) return prev;
      return [note, ...prev];
    });
    setNewNoteIds((prev) => new Set(Array.from(prev).concat(note.id)));
    setTimeout(() => {
      setNewNoteIds((prev) => {
        const s = new Set(prev);
        s.delete(note.id);
        return s;
      });
    }, 2500);
  }, []);

  const displayNotes = notes.length === 0 ? SEED_NOTES : notes;
  const isSeedMode   = notes.length === 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={13} className="text-blue" />
            <p className="font-mono text-[11px] text-muted">
              {isSeedMode
                ? "contoh notes"
                : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {realtimeOk === true  && (
            <span className="font-mono text-[10px] text-blue/55 flex items-center gap-1">
              <Wifi size={9} className="text-blue" /> Live
            </span>
          )}
          {realtimeOk === false && (
            <span className="font-mono text-[10px] text-muted/45 flex items-center gap-1">
              <WifiOff size={9} /> Offline
            </span>
          )}
          {realtimeOk === null  && (
            <span className="font-mono text-[10px] text-muted/45 flex items-center gap-1">
              <Loader2 size={9} className="animate-spin" /> Connecting
            </span>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="btn-blue"
        >
          <Plus size={14} /> Tempel Note
        </motion.button>
      </div>

      {/* Seed notice */}
      {isSeedMode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 px-4 py-2.5 rounded-xl bg-blue/8 border border-blue/20 text-center"
        >
          <p className="font-mono text-[11px] text-blue/55">
            Board masih kosong — ini contoh notesnya. Jadi yang pertama tempel! 👇
          </p>
        </motion.div>
      )}

      {/*
        ── Scrollable board container ───────────────────────────────────────────
        Fixed height (~70vh) so the board looks like a pinboard.
        Scrollable vertically — all notes accessible by scrolling.
        Fade gradient at bottom hints there's more content below.
        Masonry: 2 cols mobile → 3 sm → 4 md → 5 lg
      */}
      <div className="relative">
        {/* Scrollable area */}
        <div
          className="overflow-y-auto overflow-x-hidden rounded-2xl"
          style={{
            maxHeight: "70vh",
            minHeight: "280px",
            // Custom scrollbar matching the dark theme
            scrollbarWidth: "thin",
            scrollbarColor: "#4d94ff40 transparent",
          }}
        >
          <div
            className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 pb-8"
            style={{ columnGap: "12px", padding: "4px 2px 32px" }}
          >
            <AnimatePresence>
              {displayNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isNew={newNoteIds.has(note.id)}
                  isSeed={isSeedMode}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Fade-out gradient at bottom — hints scrollable */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-16 rounded-b-2xl"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--tw-shadow-color, #071428))",
            backgroundImage: "linear-gradient(to bottom, transparent 0%, #07142880 60%, #071428 100%)",
          }}
        />

        {/* Scroll hint — only shown when notes overflow */}
        {displayNotes.length > 6 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex flex-col items-center gap-1 opacity-50">
              <span className="font-mono text-[9px] text-muted tracking-widest">SCROLL</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-blue">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Post modal */}
      <AnimatePresence>
        {showModal && (
          <PostModal
            onClose={() => setShowModal(false)}
            onSuccess={handleNewNote}
          />
        )}
      </AnimatePresence>
    </>
  );
}
