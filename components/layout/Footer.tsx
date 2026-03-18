"use client";
// components/layout/Footer.tsx
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-void border-t border-border py-12 overflow-hidden">
      {/* Blue gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue/40 to-transparent" />

      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl text-blue font-black">MTK</span>
              <span className="font-display text-2xl text-ink font-light">Wajib Archive</span>
            </div>
            <span className="font-mono text-[10px] text-muted tracking-widest">
              CLASS OF 2026 — FOREVER ARCHIVED
            </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-wrap items-center justify-center gap-5">
            {["#roster", "#gallery", "#board"].map((href) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[11px] text-muted hover:text-blue transition-colors tracking-wide capitalize min-h-[44px] flex items-center"
              >
                {href.replace("#", "")}
              </a>
            ))}
          </nav>

          {/* Credits */}
          <motion.div
            className="flex items-center gap-1.5 font-mono text-[10px] text-muted"
            whileHover={{ scale: 1.02 }}
          >
            <span>Made with</span>
            <Heart size={10} className="text-coral fill-coral" />
            <span>for Angkatan 2026</span>
          </motion.div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-muted/40">
            © {year} MTK Wajib Archive. All memories reserved.
          </p>
          <p className="font-mono text-[10px] text-muted/30">
            Built with Next.js · Supabase · Framer Motion
          </p>
        </div>
      </div>
    </footer>
  );
}
