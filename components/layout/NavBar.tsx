"use client";
// components/layout/NavBar.tsx
// Features:
//  - Accepts logoUrl prop from server — shows image logo or text fallback
//  - Logo upload modal (passcode-protected, admin only)
//  - iOS safe-area padding for notch
//  - Mobile menu with overlay
//  - Touch target ≥ 44px everywhere

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Menu, X, Upload, Loader2, Camera } from "lucide-react";
import { uploadLogoAction } from "@/app/actions/admin";

const LINKS = [
  { href: "#roster",  label: "Warga Kelas" },
  { href: "#gallery", label: "Archive" },
  { href: "#board",   label: "Board" },
];

// ─── Logo Upload Modal ────────────────────────────────────────────────────────

function LogoUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (url: string) => void }) {
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const passcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => passcodeRef.current?.focus(), 80); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading"); setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const result = await uploadLogoAction(formData).catch(() => ({ ok: false as const, error: "Koneksi bermasalah." }));
    if (!result.ok) { setErrorMsg((result as {ok:false;error:string}).error); setStatus("error"); return; }
    setStatus("success");
    const logoUrl = (result as {ok:true;data:{url:string}}).data!.url;
    setTimeout(() => { onSuccess(logoUrl); onClose(); }, 800);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-void/90 backdrop-blur-sm p-4"
      onClick={status === "loading" ? undefined : onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="card-glass w-full max-w-sm p-6 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg text-ink">Ganti Logo</h3>
          <button onClick={onClose} disabled={status === "loading"} className="text-muted hover:text-ink p-1 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-6">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-display text-lg text-blue">Logo berhasil diupdate!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">PASSCODE ADMIN *</label>
              <input ref={passcodeRef} name="passcode" type="password" placeholder="Masukkan passcode" required className="input-dark" />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-muted mb-1.5">FILE LOGO * (PNG, JPG, SVG — max 5 MB)</label>
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required
                className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue file:text-void hover:file:bg-blue-dim cursor-pointer" />
            </div>
            {errorMsg && <p className="text-coral text-sm bg-coral/10 rounded-lg px-3 py-2">{errorMsg}</p>}
            <button type="submit" disabled={status === "loading"} className="btn-blue justify-center disabled:opacity-60">
              {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {status === "loading" ? "Uploading..." : "Upload Logo"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

export default function NavBar({ logoUrl }: { logoUrl: string | null }) {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logoUrl);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on link click
  const handleNavClick = () => setMobileOpen(false);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 safe-top ${
          scrolled
            ? "bg-void/95 backdrop-blur-xl border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 md:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">

          {/* ── Logo / Brand ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Logo image or text */}
            {currentLogo ? (
              <a href="#" className="flex items-center gap-2 group">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-blue transition-all">
                  <Image src={currentLogo} alt="Logo" fill className="object-contain" />
                </div>
                <span className="hidden sm:block font-mono text-[10px] text-muted tracking-widest border-l border-border pl-2 leading-none">
                  ARCHIVE 2026
                </span>
              </a>
            ) : (
              <a href="#" className="flex items-center gap-2 group">
                {/* Text logo — prominent MTK W */}
                <div className="flex items-baseline gap-0.5">
                  <span className="font-display text-2xl text-blue leading-none font-black tracking-tight">MTK</span>
                  <span className="font-display text-2xl text-ink leading-none font-light">W</span>
                </div>
                <span className="hidden sm:block font-mono text-[10px] text-muted tracking-widest border-l border-border pl-2">
                  ARCHIVE 2026
                </span>
              </a>
            )}

            {/* Logo upload trigger — small camera icon, subtle */}
            <button
              onClick={() => setShowLogoModal(true)}
              title="Ganti logo"
              className="p-1.5 text-muted/40 hover:text-blue transition-colors rounded-md hover:bg-faint min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <Camera size={12} />
            </button>
          </div>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 font-body text-sm text-muted hover:text-blue transition-colors duration-200 rounded-lg hover:bg-faint min-h-[44px] flex items-center"
              >
                {link.label}
              </a>
            ))}
            <a href="#board" className="btn-blue ml-2 py-2 px-4 text-xs">
              + Post Note
            </a>
          </nav>

          {/* ── Mobile menu toggle ── */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 text-muted hover:text-blue transition-colors rounded-lg hover:bg-faint min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden bg-card/95 backdrop-blur-xl border-b border-border"
            >
              <nav className="flex flex-col p-4 gap-1 pb-[calc(1rem+var(--safe-bottom))]">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={handleNavClick}
                    className="px-4 py-3 font-body text-sm text-muted hover:text-blue transition-colors rounded-xl hover:bg-faint min-h-[44px] flex items-center"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="#board"
                  onClick={handleNavClick}
                  className="btn-blue mt-2 justify-center"
                >
                  + Post Note
                </a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Logo upload modal ── */}
      <AnimatePresence>
        {showLogoModal && (
          <LogoUploadModal
            onClose={() => setShowLogoModal(false)}
            onSuccess={(url) => setCurrentLogo(url)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
