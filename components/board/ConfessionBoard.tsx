"use client";
// components/board/ConfessionBoard.tsx
// Redesign: fixed masonry grid of small notes — no dragging.
// New notes appear live via Supabase Realtime.
// Post modal: passcode + warna + teks. Error shown in modal.

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Pin, Wifi, WifiOff } from "lucide-react";
import type { Confession, NoteColor } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { postConfessionAction } from "@/app/actions/confessions";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "yellow"   as NoteColor, label: "Kuning",  bg: "#f5e27a", shadow: "#c9a232", text: "#3d2f00" },
  { value: "pink"     as NoteColor, label: "Pink",    bg: "#f7b8a0", shadow: "#c4674e", text: "#3d1200" },
  { value: "lavender" as NoteColor, label: "Ungu",    bg: "#c4b8f0", shadow: "#7a6faa", text: "#1a1040" },
] as const;

const BG: Record<NoteColor, string> = {
  yellow:   "linear-gradient(145deg,#f5e27a,#eecf35)",
  pink:     "linear-gradient(145deg,#f7b8a0,#f08a6a)",
  lavender: "linear-gradient(145deg,#c4b8f0,#a898e0)",
};
const TEXT_COLOR: Record<NoteColor, string> = {
  yellow: "#3d2f00", pink: "#3d1200", lavender: "#1a1040",
};
const PIN: Record<NoteColor, string> = {
  yellow: "#c9a232", pink: "#c4674e", lavender: "#7a6faa",
};

// ─── Single Note Card ─────────────────────────────────────────────────────────

function NoteCard({ note, isNew }: { note: Confession; isNew: boolean }) {
  const color = (note.color as NoteColor) ?? "yellow";

  return (
    <motion.div
      layout
      initial={isNew ? { scale: 0.6, opacity: 0, y: -20 } : { scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        background:  BG[color],
        boxShadow:   `3px 3px 0px ${PIN[color]}, 6px 6px 16px rgba(0,0,0,0.35)`,
        color:       TEXT_COLOR[color],
        rotate:      `${note.rotation_deg}deg`,
      }}
      className="relative rounded-lg p-3 break-inside-avoid"
    >
      {/* Pin */}
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full
                   border border-white/30 flex items-center justify-center shadow-sm"
        style={{ background: PIN[color] }}
      >
        <Pin size={6} className="opacity-60 -rotate-45" />
      </div>

      <p className="font-body text-xs leading-relaxed pt-1 break-words whitespace-pre-wrap">
        {note.content}
      </p>

      <p className="font-mono text-[8px] opacity-40 mt-2">anonymous</p>
    </motion.div>
  );
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

function PostModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (note: Confession) => void;
}) {
  const [color,    setColor]    = useState<NoteColor>("yellow");
  const [status,   setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [charCount, setCharCount] = useState(0);
  const passcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => passcodeRef.current?.focus(), 80); }, []);

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
        rotation_deg: (Math.random() - 0.5) * 5,
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-void/90 backdrop-blur-sm p-4"
      onClick={status === "loading" ? undefined : onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="card-glass w-full max-w-sm p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg text-ink">Tempel Note</h3>
          <button onClick={onClose} disabled={status === "loading"}
            className="text-muted hover:text-ink transition-colors p-1 rounded-lg
                       disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📌</p>
            <p className="font-display text-base text-blue">Note berhasil ditempel!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Passcode */}
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">PASSCODE *</label>
              <input ref={passcodeRef} name="passcode" type="password"
                placeholder="Passcode kelas" required autoComplete="current-password"
                className="input-dark" />
            </div>

            {/* Color */}
            <div>
              <label className="block font-mono text-[11px] text-muted mb-2">WARNA NOTE</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setColor(opt.value)}
                    title={opt.label}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-mono transition-all
                                ${color === opt.value
                                  ? "ring-2 ring-ink scale-105 font-bold"
                                  : "opacity-70 hover:opacity-100"}`}
                    style={{ background: opt.bg, color: opt.text }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                TULIS *{" "}
                <span className={charCount > 270 ? "text-coral" : "text-muted"}>
                  ({charCount}/50)
                </span>
              </label>
              <textarea name="content" required maxLength={50} rows={3}
                placeholder="Curhat, roast, atau hal yang pengen lo sampaikan..."
                onChange={(e) => setCharCount(e.target.value.length)}
                className="input-dark resize-none" />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 text-coral text-sm bg-coral/10 rounded-lg px-3 py-2">
                <span>⚠</span><span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" disabled={status === "loading"}
              className="btn-blue justify-center disabled:opacity-60">
              {status === "loading"
                ? <Loader2 size={14} className="animate-spin" />
                : <Pin size={14} />}
              {status === "loading" ? "Posting..." : "Tempel Note"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export default function ConfessionBoard({
  initialConfessions,
}: {
  initialConfessions: Confession[];
}) {
  const [notes,     setNotes]     = useState<Confession[]>(initialConfessions);
  const [showModal, setShowModal] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState<boolean | null>(null);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel  = supabase
      .channel("public:confessions")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "confessions" },
        (payload) => {
          const incoming = payload.new as Confession;
          setNotes((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
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
  }, []);

  return (
    <>
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[11px] text-muted">
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </p>
          {/* Realtime indicator */}
          {realtimeOk === true  && <span className="font-mono text-[10px] text-blue/60 flex items-center gap-1"><Wifi size={10} /> Live</span>}
          {realtimeOk === false && <span className="font-mono text-[10px] text-coral/60 flex items-center gap-1"><WifiOff size={10} /> Offline</span>}
          {realtimeOk === null  && <span className="font-mono text-[10px] text-muted/50 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Connecting</span>}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="btn-blue"
        >
          <Plus size={15} /> Tempel Note
        </motion.button>
      </div>

      {/* ── Notes grid — CSS columns masonry, no drag ── */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 text-center">
          <p className="text-4xl">📌</p>
          <p className="font-display text-xl text-muted">Board masih kosong.</p>
          <p className="font-body text-sm text-muted/50">Jadi yang pertama tempel note!</p>
        </div>
      ) : (
        <div
          className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3"
          style={{ columnFill: "balance" }}
        >
          <AnimatePresence>
            {notes.map((note, i) => (
              <div key={note.id} className="mb-3 break-inside-avoid">
                <NoteCard note={note} isNew={i === 0} />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Post modal ── */}
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
