"use client";
// app/admin/dashboard/AdminDashboard.tsx
// Complete admin panel: Stats | Students | Gallery | Board | Config
// All mutations use server actions with optimistic UI updates.

import { useState, useCallback, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Users, Image as ImageIcon, MessageSquare, Settings,
  LogOut, Plus, Trash2, Edit3, X, Check, Loader2,
  ChevronRight, Star, Upload, LayoutDashboard, RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  addStudentAction, updateStudentAction, deleteStudentAction,
  deleteMediaAction, deleteConfessionAction, uploadLogoAction,
  updateConfigAction,
} from "@/app/actions/admin";
import { logoutAction } from "@/app/actions/auth";
import type { Student, GalleryMedia, Confession } from "@/lib/supabase/database.types";

// ─── Types & helpers ─────────────────────────────────────────────────────────

type Tab = "overview" | "students" | "gallery" | "board" | "config";

const NOTE_COLOR_MAP: Record<string, string> = {
  yellow:   "bg-yellow-300/20 text-yellow-200",
  pink:     "bg-orange-300/20 text-orange-200",
  lavender: "bg-purple-300/20 text-purple-200",
};

function StatusBadge({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
      ok ? "bg-green-500/10 text-green-400" : "bg-coral/10 text-coral"
    }`}>
      {ok ? <Check size={14} /> : <AlertTriangle size={14} />}
      {msg}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message, onConfirm, onCancel,
}: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/90 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="card-glass p-6 rounded-2xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-coral/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trash2 size={14} className="text-coral" />
          </div>
          <div>
            <p className="font-body text-sm text-ink leading-relaxed">{message}</p>
            <p className="font-mono text-[11px] text-muted mt-1">Aksi ini tidak bisa dibatalkan.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 font-body text-sm text-muted hover:text-ink border border-border rounded-xl transition-colors min-h-[40px]">
            Batal
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 font-body text-sm font-semibold bg-coral text-white rounded-xl hover:bg-coral-dim transition-colors min-h-[40px]">
            Hapus
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Student Form ─────────────────────────────────────────────────────────────

function StudentForm({
  initial, onSuccess, onCancel,
}: {
  initial?: Student;
  onSuccess: (s: Student) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = initial
        ? await updateStudentAction(initial.id, fd)
        : await addStudentAction(fd);

      if (!result.ok) { setError((result as {ok:false;error:string}).error); return; }
      onSuccess((result as {ok:true;data:Student}).data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[11px] text-muted mb-1.5">NAMA *</label>
          <input name="name" defaultValue={initial?.name} required
            placeholder="Nama lengkap" className="input-dark" />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-muted mb-1.5">TITLE *</label>
          <input name="custom_title" defaultValue={initial?.custom_title} required
            placeholder='cth: "Suhu Integral"' className="input-dark" />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-muted mb-1.5">TUJUAN</label>
          <input name="destination" defaultValue={initial?.destination ?? ""}
            placeholder="cth: Unila - Teknik Sipil" className="input-dark" />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-muted mb-1.5">NO. ABSEN</label>
          <input name="class_number" type="number" min="1" max="50"
            defaultValue={initial?.class_number ?? ""}
            placeholder="1" className="input-dark" />
        </div>
      </div>

      <div>
        <label className="block font-mono text-[11px] text-muted mb-1.5">QUOTE</label>
        <textarea name="quote" rows={2} defaultValue={initial?.quote ?? ""}
          placeholder="Quote kenangan..." className="input-dark resize-none" />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" name="is_featured" value="true" id="is_featured"
          defaultChecked={initial?.is_featured}
          className="w-4 h-4 accent-blue rounded" />
        <label htmlFor="is_featured" className="font-body text-sm text-muted cursor-pointer">
          Tampilkan sebagai Featured (muncul pertama)
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[11px] text-muted mb-1.5">
            FOTO KELAS {initial ? "(kosongkan = tidak ganti)" : "*"}
          </label>
          <input name="photo_class" type="file" accept="image/*,.heic,.heif"
            required={!initial}
            className="w-full text-sm text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue file:text-void hover:file:bg-blue-dim cursor-pointer" />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-muted mb-1.5">
            FOTO WISUDA (opsional)
          </label>
          <input name="photo_grad" type="file" accept="image/*,.heic,.heif"
            className="w-full text-sm text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-faint file:text-muted hover:file:bg-border cursor-pointer" />
        </div>
      </div>

      {error && <StatusBadge ok={false} msg={error} />}

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel}
          className="btn-outline px-4 py-2 text-sm">Batal</button>
        <button type="submit" disabled={isPending}
          className="btn-blue px-4 py-2 text-sm disabled:opacity-60">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isPending ? "Menyimpan..." : initial ? "Update" : "Tambah Siswa"}
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: { students: number; media: number; confessions: number } }) {
  const cards = [
    { label: "Warga Kelas",   value: stats.students,    icon: Users,          color: "text-blue bg-blue/10 border-blue/20" },
    { label: "Foto & Video",  value: stats.media,       icon: ImageIcon,      color: "text-sky bg-sky/10 border-sky/20" },
    { label: "Board Notes",   value: stats.confessions, icon: MessageSquare,  color: "text-lavender bg-lavender/10 border-lavender/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card-glass p-5 rounded-2xl">
            <div className={`inline-flex p-2 rounded-xl border mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <p className="font-display text-3xl text-ink font-bold">{value}</p>
            <p className="font-mono text-[11px] text-muted mt-1 tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      <div className="card-glass p-5 rounded-2xl">
        <h3 className="font-display text-lg text-ink mb-3">Quick Links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Website", href: "/", icon: "🌐" },
            { label: "Supabase", href: `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? ""}`, icon: "🗄️" },
          ].map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-faint hover:bg-border transition-colors text-sm text-muted hover:text-ink">
              <span>{link.icon}</span>
              <span className="font-body">{link.label}</span>
              <ChevronRight size={12} className="ml-auto" />
            </a>
          ))}
        </div>
      </div>

      <div className="card-glass p-5 rounded-2xl">
        <h3 className="font-display text-lg text-ink mb-2">Cara Akses Admin</h3>
        <p className="font-body text-sm text-muted leading-relaxed">
          Halaman ini hanya bisa diakses via URL langsung:{" "}
          <code className="font-mono text-blue text-xs bg-faint px-1.5 py-0.5 rounded">
            /admin
          </code>.
          Tidak ada link ke halaman ini dari website publik.
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Students ────────────────────────────────────────────────────────────

function StudentsTab({ initial }: { initial: Student[] }) {
  const [students, setStudents]   = useState<Student[]>(initial);
  const [showAdd, setShowAdd]     = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd    = (s: Student) => { setStudents((p) => [s, ...p]); setShowAdd(false); };
  const handleUpdate = (s: Student) => { setStudents((p) => p.map((x) => x.id === s.id ? s : x)); setEditTarget(null); };
  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      const r = await deleteStudentAction(id);
      if (r.ok) setStudents((p) => p.filter((s) => s.id !== id));
      setConfirmId(null);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted">{students.length} siswa terdaftar</p>
        <button onClick={() => setShowAdd(true)} className="btn-blue py-2 px-4 text-xs">
          <Plus size={14} /> Tambah Siswa
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="card-glass p-5 rounded-2xl">
            <h3 className="font-display text-base text-ink mb-4">Tambah Siswa Baru</h3>
            <StudentForm
              onSuccess={handleAdd}
              onCancel={() => setShowAdd(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students table */}
      <div className="card-glass rounded-2xl overflow-hidden">
        {students.length === 0 ? (
          <div className="p-10 text-center text-muted font-body text-sm">
            Belum ada siswa. Tambah dulu!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-mono text-[10px] text-muted/60 uppercase tracking-wider w-10">#</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] text-muted/60 uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] text-muted/60 uppercase tracking-wider hidden md:table-cell">Title</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] text-muted/60 uppercase tracking-wider hidden lg:table-cell">Tujuan</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-faint/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-muted">
                        {s.class_number ? String(s.class_number).padStart(2,"0") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.photo_class_url && (
                          <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-border flex-shrink-0">
                            <Image src={s.photo_class_url} alt={s.name} fill className="object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="font-body text-ink text-xs font-medium">{s.name}</p>
                          {s.is_featured && (
                            <span className="font-mono text-[9px] text-blue flex items-center gap-0.5">
                              <Star size={8} className="fill-blue" /> featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[11px] text-sky">{s.custom_title}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-body text-xs text-muted">{s.destination || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditTarget(s)}
                          className="p-1.5 text-muted hover:text-blue transition-colors rounded-lg hover:bg-faint min-w-[32px] min-h-[32px] flex items-center justify-center">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => setConfirmId(s.id)} disabled={isPending}
                          className="p-1.5 text-muted hover:text-coral transition-colors rounded-lg hover:bg-faint min-w-[32px] min-h-[32px] flex items-center justify-center">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setEditTarget(null)}
          >
            <motion.div
              initial={{ scale:0.95, y:10 }} animate={{ scale:1, y:0 }}
              className="card-glass w-full max-w-2xl p-6 rounded-2xl my-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-lg text-ink">Edit Siswa</h3>
                <button onClick={() => setEditTarget(null)} className="text-muted hover:text-ink p-1 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <StudentForm
                initial={editTarget}
                onSuccess={handleUpdate}
                onCancel={() => setEditTarget(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message={`Hapus siswa "${students.find((s) => s.id === confirmId)?.name}"? Foto di storage juga akan hilang.`}
            onConfirm={() => handleDelete(confirmId)}
            onCancel={() => setConfirmId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Gallery ─────────────────────────────────────────────────────────────

function GalleryTab({ initial }: { initial: GalleryMedia[] }) {
  const [items, setItems]        = useState<GalleryMedia[]>(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      const r = await deleteMediaAction(id);
      if (r.ok) setItems((p) => p.filter((m) => m.id !== id));
      setConfirmId(null);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted">{items.length} item (maks tampil 200)</p>
        <p className="font-mono text-[10px] text-muted/50">Upload via website publik</p>
      </div>

      {items.length === 0 ? (
        <div className="card-glass p-10 rounded-2xl text-center text-muted font-body text-sm">
          Belum ada media. Upload dari halaman Gallery di website.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((m) => (
            <div key={m.id} className="relative group rounded-xl overflow-hidden bg-faint border border-border aspect-square">
              {m.media_type === "image" && !["image/heic","image/heif"].includes(m.mime_type ?? "") ? (
                <Image src={m.storage_url} alt={m.caption ?? ""} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center">
                  <span className="text-2xl">{m.media_type === "video" ? "🎬" : "📸"}</span>
                  <span className="font-mono text-[9px] text-muted/60 truncate w-full text-center">
                    {m.mime_type?.split("/")[1]?.toUpperCase() ?? "FILE"}
                  </span>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-void/0 group-hover:bg-void/70 transition-colors flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <p className="font-mono text-[9px] text-muted/80 px-2 text-center line-clamp-2">{m.category}</p>
                {m.uploaded_by && <p className="font-mono text-[9px] text-blue/70">@{m.uploaded_by}</p>}
                <button onClick={() => setConfirmId(m.id)} disabled={isPending}
                  className="mt-1 p-1.5 bg-coral/20 hover:bg-coral/40 rounded-lg text-coral transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message="Hapus foto/video ini dari archive dan storage?"
            onConfirm={() => handleDelete(confirmId)}
            onCancel={() => setConfirmId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Board ───────────────────────────────────────────────────────────────

function BoardTab({ initial }: { initial: Confession[] }) {
  const [notes, setNotes]        = useState<Confession[]>(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      const r = await deleteConfessionAction(id);
      if (r.ok) setNotes((p) => p.filter((n) => n.id !== id));
      setConfirmId(null);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted">{notes.length} notes (maks tampil 200)</p>
      </div>

      {notes.length === 0 ? (
        <div className="card-glass p-10 rounded-2xl text-center text-muted font-body text-sm">
          Board kosong.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => (
            <div key={n.id}
              className={`card-glass p-4 rounded-xl border relative group ${NOTE_COLOR_MAP[n.color] ?? ""}`}>
              <p className="font-body text-sm leading-relaxed text-ink mb-3 pr-6">
                {n.content}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted/60">
                  {new Date(n.created_at).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"2-digit" })}
                </span>
                <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded capitalize ${NOTE_COLOR_MAP[n.color] ?? "bg-faint"}`}>
                  {n.color}
                </span>
              </div>
              <button
                onClick={() => setConfirmId(n.id)}
                disabled={isPending}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-coral/20 rounded-lg text-coral transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message="Hapus note ini dari board?"
            onConfirm={() => handleDelete(confirmId)}
            onCancel={() => setConfirmId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Config ──────────────────────────────────────────────────────────────

function ConfigTab({ config }: { config: Record<string, string | null> }) {
  const [logoStatus, setLogoStatus]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [spotifyStatus, setSpotifyStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition]    = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const spotifyRef   = useRef<HTMLInputElement>(null);

  function handleLogoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      const r  = await uploadLogoAction(fd);
      setLogoStatus(r.ok ? { ok: true, msg: "Logo berhasil diupdate!" } : { ok: false, msg: (r as { error: string }).error });
    });
  }

  function handleSpotifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const val = spotifyRef.current?.value?.trim() ?? "";
    if (!val) return;
    startTransition(async () => {
      const r = await updateConfigAction("spotify_playlist_id", val);
      setSpotifyStatus(r.ok
        ? { ok: true, msg: "Spotify playlist diupdate! Refresh website." }
        : { ok: false, msg: (r as { error: string }).error });
    });
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="card-glass p-5 rounded-2xl">
        <h3 className="font-display text-base text-ink mb-1">Logo Kelas</h3>
        <p className="font-body text-xs text-muted mb-4">Upload PNG, JPG, atau SVG (max 5 MB). Akan muncul di navbar dan hero.</p>
        <form onSubmit={handleLogoSubmit} className="flex flex-col gap-3">
          <input ref={logoInputRef} name="logo" type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml" required
            className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue file:text-void hover:file:bg-blue-dim cursor-pointer" />
          {logoStatus && <StatusBadge ok={logoStatus.ok} msg={logoStatus.msg} />}
          <button type="submit" disabled={isPending} className="btn-blue w-fit py-2 px-4 text-xs disabled:opacity-60">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload Logo
          </button>
        </form>
        {config["logo_url"] && (
          <div className="mt-4 flex items-center gap-3">
            <p className="font-mono text-[10px] text-muted">Logo saat ini:</p>
            <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-border">
              <Image src={config["logo_url"]} alt="Current logo" fill className="object-contain" />
            </div>
          </div>
        )}
      </div>

      {/* Spotify */}
      <div className="card-glass p-5 rounded-2xl">
        <h3 className="font-display text-base text-ink mb-1">Spotify Playlist</h3>
        <p className="font-body text-xs text-muted mb-4">
          Ambil ID dari link Spotify:<br />
          <code className="font-mono text-[10px] text-blue/80">
            https://open.spotify.com/playlist/<span className="text-blue font-bold">ID_NYA_DISINI</span>
          </code>
        </p>
        <form onSubmit={handleSpotifySubmit} className="flex flex-col gap-3">
          <input ref={spotifyRef} type="text" placeholder="37i9dQZF1DXcBWIGoYBM5M"
            defaultValue={config["spotify_playlist_id"] ?? ""}
            className="input-dark font-mono text-sm" />
          {spotifyStatus && <StatusBadge ok={spotifyStatus.ok} msg={spotifyStatus.msg} />}
          <button type="submit" disabled={isPending} className="btn-blue w-fit py-2 px-4 text-xs disabled:opacity-60">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Simpan
          </button>
        </form>
      </div>

      {/* Env info */}
      <div className="card-glass p-5 rounded-2xl border border-border/50">
        <h3 className="font-display text-base text-ink mb-3">Environment Variables</h3>
        <p className="font-body text-xs text-muted mb-3">
          Variabel berikut diset di Vercel → Settings → Environment Variables.
          Perlu redeploy setelah diubah.
        </p>
        <div className="space-y-2">
          {[
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "CLASS_PASSCODE",
            "ADMIN_USERNAME",
            "ADMIN_PASSWORD",
            "ADMIN_SESSION_SECRET",
          ].map((key) => (
            <div key={key} className="flex items-center justify-between px-3 py-2 bg-faint rounded-lg">
              <code className="font-mono text-[11px] text-blue/80">{key}</code>
              <span className="font-mono text-[10px] text-muted">••••••</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

interface Props {
  username: string;
  stats:    { students: number; media: number; confessions: number };
  initialStudents:    Student[];
  initialMedia:       GalleryMedia[];
  initialConfessions: Confession[];
  siteConfig:         Record<string, string | null>;
}

const TAB_DEFS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",  icon: LayoutDashboard },
  { id: "students",  label: "Siswa",     icon: Users },
  { id: "gallery",   label: "Gallery",   icon: ImageIcon },
  { id: "board",     label: "Board",     icon: MessageSquare },
  { id: "config",    label: "Config",    icon: Settings },
];

export default function AdminDashboard({
  username, stats, initialStudents, initialMedia, initialConfessions, siteConfig,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loggingOut, startLogout] = useTransition();

  function handleLogout() {
    startLogout(() => logoutAction());
  }

  return (
    <div className="min-h-[100dvh] bg-void text-ink"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-void/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue/15 flex items-center justify-center">
              <LayoutDashboard size={13} className="text-blue" />
            </div>
            <span className="font-display text-base text-ink">Admin Panel</span>
            <span className="hidden sm:block font-mono text-[10px] text-muted border-l border-border pl-2">
              {username}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="p-2 text-muted hover:text-blue rounded-lg hover:bg-faint transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Lihat website">
              <RefreshCw size={14} />
            </a>
            <button onClick={handleLogout} disabled={loggingOut}
              className="p-2 text-muted hover:text-coral rounded-lg hover:bg-faint transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Logout">
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            </button>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="container mx-auto px-4 md:px-6 flex gap-0.5 overflow-x-auto scrollbar-none pb-px">
          {TAB_DEFS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-mono text-[11px] tracking-wide
                          whitespace-nowrap transition-all duration-200 border-b-2 min-h-[44px] ${
                tab === id
                  ? "border-blue text-blue"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="container mx-auto px-4 md:px-6 py-6 max-w-6xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "overview"  && <OverviewTab stats={stats} />}
            {tab === "students"  && <StudentsTab initial={initialStudents} />}
            {tab === "gallery"   && <GalleryTab  initial={initialMedia} />}
            {tab === "board"     && <BoardTab    initial={initialConfessions} />}
            {tab === "config"    && <ConfigTab   config={siteConfig} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
