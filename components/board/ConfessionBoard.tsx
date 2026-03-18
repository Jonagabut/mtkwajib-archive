"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Pin } from "lucide-react";
import type { Confession, NoteColor } from "@/lib/supabase/database.types";
import {
  postConfessionAction,
  updateConfessionPositionAction,
} from "@/app/actions/confessions";

const COLOR_OPTIONS: { value: NoteColor; label: string; preview: string }[] = [
  { value: "yellow", label: "Yellow", preview: "#f5e27a" },
  { value: "pink", label: "Pink", preview: "#f7b8a0" },
  { value: "lavender", label: "Lavender", preview: "#c4b8f0" },
];

const SHADOW_MAP: Record<NoteColor, string> = {
  yellow: "4px 4px 0px #c9a232, 8px 8px 20px rgba(0,0,0,0.4)",
  pink: "4px 4px 0px #c4674e, 8px 8px 20px rgba(0,0,0,0.4)",
  lavender: "4px 4px 0px #7a6faa, 8px 8px 20px rgba(0,0,0,0.4)",
};

const BG_MAP: Record<NoteColor, string> = {
  yellow: "linear-gradient(135deg, #f5e27a 0%, #f0d84a 50%, #e8cc30 100%)",
  pink: "linear-gradient(135deg, #f7b8a0 0%, #f0956e 50%, #e87850 100%)",
  lavender: "linear-gradient(135deg, #c4b8f0 0%, #a898e0 50%, #9080d0 100%)",
};

function DraggableNote({
  confession,
  boardRef,
}: {
  confession: Confession;
  boardRef: React.RefObject<HTMLDivElement>;
}) {
  const [position, setPosition] = useState({
    x: confession.x_pos,
    y: confession.y_pos,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragEnd = useCallback(
    async (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { offset: { x: number; y: number } }
    ) => {
      setIsDragging(false);
      if (!boardRef.current) return;

      const containerRect = boardRef.current.getBoundingClientRect();
      const newX = Math.max(
        0,
        Math.min(position.x + info.offset.x, containerRect.width - 200)
      );
      const newY = Math.max(
        0,
        Math.min(position.y + info.offset.y, containerRect.height - 180)
      );

      setPosition({ x: newX, y: newY });
      setIsSaving(true);
      try {
        await updateConfessionPositionAction(confession.id, newX, newY);
      } catch (err) {
        console.error("Failed to persist note position:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [confession.id, position, boardRef]
  );

  const noteColor = (confession.color as NoteColor) || "yellow";

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={boardRef}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0, opacity: 0, rotate: confession.rotation_deg }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: confession.rotation_deg,
        zIndex: isDragging ? 100 : 1,
      }}
      whileDrag={{
        scale: 1.05,
        rotate: confession.rotation_deg + 2,
        zIndex: 100,
      }}
      whileHover={{ scale: 1.02, zIndex: 50 }}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: 180,
        background: BG_MAP[noteColor],
        boxShadow: SHADOW_MAP[noteColor],
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
      className="rounded-lg p-4 flex flex-col gap-2 min-h-[120px]"
    >
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-void/20 flex items-center justify-center"
        style={{
          background:
            noteColor === "yellow"
              ? "#c9a232"
              : noteColor === "pink"
              ? "#c4674e"
              : "#7a6faa",
        }}
      >
        <Pin size={8} className="text-void/60 -rotate-45" />
      </div>

      <p className="font-body text-sm leading-relaxed text-void/90 break-words">
        {confession.content}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-[9px] font-mono text-void/50">anonymous</span>
        {isSaving && <Loader2 size={10} className="text-void/40 animate-spin" />}
      </div>
    </motion.div>
  );
}

function PostNoteModal({ onClose }: { onClose: () => void }) {
  const [color, setColor] = useState<NoteColor>("yellow");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [charCount, setCharCount] = useState(0);

  async function handleSubmit(formData: FormData) {
    setStatus("loading");
    setErrorMsg("");
    try {
      const result = await postConfessionAction(formData);
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
      setErrorMsg("Gagal posting. Coba lagi.");
      setStatus("error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-void/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="card-glass w-full max-w-sm p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg text-ink">Tempel Note</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📌</p>
            <p className="font-display text-lg text-gold">Note ditempel!</p>
          </div>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="color" value={color} />

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                PASSCODE *
              </label>
              <input
                name="passcode"
                type="password"
                placeholder="Masukkan passcode kelas"
                required
                className="input-dark"
              />
            </div>

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
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === opt.value
                        ? "border-ink scale-110"
                        : "border-transparent scale-100"
                    }`}
                    style={{ background: opt.preview }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">
                TULIS SESUATU *{" "}
                <span
                  className={charCount > 270 ? "text-coral" : "text-muted"}
                >
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

            {errorMsg && (
              <p className="text-coral text-sm bg-coral/10 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

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

export default function ConfessionBoard({
  initialConfessions,
}: {
  initialConfessions: Confession[];
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative">
        <div className="flex justify-center mb-6">
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

        <motion.div
          ref={boardRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="board-bg relative w-full rounded-2xl border border-border overflow-hidden"
          style={{ height: "700px", minHeight: "600px" }}
        >
          <div
            className="absolute inset-0 opacity-[0.02] bg-repeat pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #f5c842 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {initialConfessions.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center pointer-events-none">
              <p className="text-4xl">📌</p>
              <p className="font-display text-xl text-muted">
                Board masih kosong.
              </p>
              <p className="font-body text-sm text-muted/60">
                Jadi yang pertama tempel note!
              </p>
            </div>
          )}

          <AnimatePresence>
            {initialConfessions.map((c) => (
              <DraggableNote key={c.id} confession={c} boardRef={boardRef as React.RefObject<HTMLDivElement>} />
            ))}
          </AnimatePresence>
        </motion.div>

        <p className="mt-3 font-mono text-[11px] text-muted text-right">
          {initialConfessions.length} notes terpasang
          {initialConfessions.length > 0 && " — drag untuk memindahkan"}
        </p>
      </div>

      <AnimatePresence>
        {showModal && <PostNoteModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
