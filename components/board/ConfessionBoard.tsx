"use client";
// components/board/ConfessionBoard.tsx
// Features:
//  - Supabase Realtime → new notes appear live for ALL visitors
//  - Proper submit flow: show error if fails, only close on success
//  - Optimistic insert only after server confirms (no ghost notes)
//  - Framer Motion drag with position persisted to DB on drag-end
//  - Rate-limited server-side (5 posts / 10 min / IP)

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Plus, X, Loader2, Pin, Wifi, WifiOff } from "lucide-react";
import type { Confession, NoteColor } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  postConfessionAction,
  updateConfessionPositionAction,
} from "@/app/actions/confessions";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "yellow"   as NoteColor, label: "Yellow",   preview: "#f5e27a" },
  { value: "pink"     as NoteColor, label: "Pink",     preview: "#f7b8a0" },
  { value: "lavender" as NoteColor, label: "Lavender", preview: "#c4b8f0" },
] as const;

const BG_MAP: Record<NoteColor, string> = {
  yellow:   "linear-gradient(135deg, #f5e27a 0%, #f0d84a 50%, #e8cc30 100%)",
  pink:     "linear-gradient(135deg, #f7b8a0 0%, #f0956e 50%, #e87850 100%)",
  lavender: "linear-gradient(135deg, #c4b8f0 0%, #a898e0 50%, #9080d0 100%)",
};

const SHADOW_MAP: Record<NoteColor, string> = {
  yellow:   "4px 4px 0px #c9a232, 8px 8px 20px rgba(0,0,0,0.4)",
  pink:     "4px 4px 0px #c4674e, 8px 8px 20px rgba(0,0,0,0.4)",
  lavender: "4px 4px 0px #7a6faa, 8px 8px 20px rgba(0,0,0,0.4)",
};

const PIN_COLOR: Record<NoteColor, string> = {
  yellow: "#c9a232", pink: "#c4674e", lavender: "#7a6faa",
};

// ─── DraggableNote ────────────────────────────────────────────────────────────

function DraggableNote({
  confession,
  boardRef,
  isNew,
}: {
  confession: Confession;
  boardRef: React.RefObject<HTMLDivElement | null>;
  isNew: boolean;
}) {
  const [pos, setPos]         = useState({ x: confession.x_pos, y: confession.y_pos });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving]   = useState(false);
  const color                 = (confession.color as NoteColor) ?? "yellow";

  const handleDragEnd = useCallback(
    async (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setDragging(false);
      if (!boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(pos.x + info.offset.x, rect.width  - 200));
      const newY = Math.max(0, Math.min(pos.y + info.offset.y, rect.height - 180));
      setPos({ x: newX, y: newY });

      setSaving(true);
      await updateConfessionPositionAction(confession.id, newX, newY).catch(
        (err) => console.error("[board] persist position failed:", err)
      );
      setSaving(false);
    },
    [confession.id, pos, boardRef]
  );

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={boardRef}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      initial={isNew
        ? { scale: 0, opacity: 0, rotate: confession.rotation_deg, y: -20 }
        : { scale: 0, opacity: 0, rotate: confession.rotation_deg }}
      animate={{
        scale: 1, opacity: 1,
        rotate: confession.rotation_deg,
        zIndex: dragging ? 100 : 1,
      }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
      whileDrag={{ scale: 1.06, rotate: confession.rotation_deg + 2, zIndex: 100 }}
      whileHover={{ scale: 1.02, zIndex: 50 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{
        position: "absolute",
        left: pos.x,
        top:  pos.y,
        width: 180,
        background: BG_MAP[color],
        boxShadow: SHADOW_MAP[color],
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        outline: saving ? "2px solid rgba(245,200,66,0.6)" : "none",
      }}
      className="rounded-lg p-4 flex flex-col gap-2 min-h-[120px]"
    >
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full
                   border-2 border-void/20 flex items-center justify-center"
        style={{ background: PIN_COLOR[color] }}
      >
        <Pin size={8} className="text-void/60 -rotate-45" />
      </div>

      <p className="font-body text-sm leading-relaxed text-void/90 break-words">
        {confession.content}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-[9px] font-mono text-void/50">anonymous</span>
        {saving && <Loader2 size={10} className="text-void/40 animate-spin" />}
      </div>
    </motion.div>
  );
}

// ─── PostNoteModal ────────────────────────────────────────────────────────────

function PostNoteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (note: Confession) => void;
}) {
  const [color, setColor]         = useState<NoteColor>("yellow");
  const [status, setStatus]       = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]   = useState("");
  const [charCount, setCharCount] = useState(0);
  const passcodeRef               = useRef<HTMLInputElement>(null);

  // Focus passcode on open
  useEffect(() => {
    const t = setTimeout(() => passcodeRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    // Inject color (controlled state, not a form field)
    formData.set("color", color);

    try {
      const result = await postConfessionAction(formData);

      if (result?.error) {
        // Show error IN the modal — user can fix passcode and retry
        setErrorMsg(result.error);
        setStatus("error");
        return;
      }

      // Success — build the confirmed note object and pass it up
      const content      = (formData.get("content") as string).trim();
      const confirmedNote: Confession = {
        id:           result.data!.id,
        content,
        color,
        x_pos:        Math.random() * 560 + 40,
        y_pos:        Math.random() * 380 + 40,
        rotation_deg: (Math.random() - 0.5) * 10,
        created_at:   new Date().toISOString(),
      };

      setStatus("success");
      // Brief success flash, then close and add confirmed note to board
      setTimeout(() => {
        onSuccess(confirmedNote);
        onClose();
      }, 900);

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
                 bg-void/90 backdrop-blur-sm p-4"
      onClick={status === "loading" ? undefined : onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="card-glass w-full max-w-sm p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg text-ink">Tempel Note</h3>
          <button
            onClick={onClose}
            disabled={status === "loading"}
            className="text-muted hover:text-ink transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {status === "success" ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📌</p>
            <p className="font-display text-lg text-gold">Note berhasil ditempel!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Passcode */}
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                PASSCODE *
              </label>
              <input
                ref={passcodeRef}
                name="passcode"
                type="password"
                placeholder="Masukkan passcode kelas"
                required
                autoComplete="current-password"
                className="input-dark"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                WARNA NOTE
              </label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    aria-label={opt.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === opt.value
                        ? "border-ink scale-110 ring-2 ring-ink/20"
                        : "border-transparent scale-100"
                    }`}
                    style={{ background: opt.preview }}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                TULIS SESUATU *{" "}
                <span className={charCount > 270 ? "text-coral" : "text-muted"}>
                  ({charCount}/300)
                </span>
              </label>
              <textarea
                name="content"
                required
                maxLength={300}
                rows={4}
                placeholder="Rahasia, roast, atau hal yang pengen lo sampaikan..."
                onChange={(e) => setCharCount(e.target.value.length)}
                className="input-dark resize-none"
              />
            </div>

            {/* Error message — stays visible so user can fix & retry */}
            {errorMsg && (
              <div className="flex items-start gap-2 text-coral text-sm
                              bg-coral/10 rounded-lg px-3 py-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-gold justify-center disabled:opacity-60"
            >
              {status === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Pin size={14} />
              )}
              {status === "loading" ? "Posting..." : "Tempel Note"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── ConfessionBoard (main) ───────────────────────────────────────────────────

export default function ConfessionBoard({
  initialConfessions,
}: {
  initialConfessions: Confession[];
}) {
  const boardRef                 = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes]         = useState<Confession[]>(initialConfessions);
  const [realtimeOk, setRealtimeOk] = useState<boolean | null>(null);

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("public:confessions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "confessions" },
        (payload) => {
          const incoming = payload.new as Confession;
          setNotes((prev) => {
            // Dedup by id
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      )
      .subscribe((status) => {
        setRealtimeOk(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Called from modal on confirmed success — adds the real note (with real id)
  const handleNoteSuccess = useCallback((note: Confession) => {
    setNotes((prev) => {
      if (prev.some((n) => n.id === note.id)) return prev;
      return [note, ...prev];
    });
  }, []);

  return (
    <>
      <div className="relative">
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {realtimeOk === null && (
              <span className="font-mono text-[10px] text-muted/60 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Connecting…
              </span>
            )}
            {realtimeOk === true && (
              <span className="font-mono text-[10px] text-gold/60 flex items-center gap-1">
                <Wifi size={10} /> Live
              </span>
            )}
            {realtimeOk === false && (
              <span className="font-mono text-[10px] text-coral/60 flex items-center gap-1">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="btn-gold"
          >
            <Plus size={16} />
            Tempel Note
          </motion.button>
        </div>

        {/* ── Board canvas ── */}
        <motion.div
          ref={boardRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="board-bg relative w-full rounded-2xl border border-border overflow-hidden"
          style={{ height: "700px", minHeight: "600px" }}
        >
          <div
            className="absolute inset-0 opacity-[0.025] bg-repeat pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #f5c842 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {notes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center
                            gap-4 text-center pointer-events-none">
              <p className="text-4xl">📌</p>
              <p className="font-display text-xl text-muted">Board masih kosong.</p>
              <p className="font-body text-sm text-muted/60">
                Jadi yang pertama tempel note!
              </p>
            </div>
          )}

          <AnimatePresence>
            {notes.map((c, idx) => (
              <DraggableNote
                key={c.id}
                confession={c}
                boardRef={boardRef}
                isNew={idx === 0}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        <p className="mt-3 font-mono text-[11px] text-muted text-right">
          {notes.length} notes terpasang
          {notes.length > 0 && " — drag untuk memindahkan"}
        </p>
      </div>

      <AnimatePresence>
        {showModal && (
          <PostNoteModal
            onClose={() => setShowModal(false)}
            onSuccess={handleNoteSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}
