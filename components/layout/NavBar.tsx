"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#roster", label: "Warga Kelas" },
  { href: "#gallery", label: "Archive" },
  { href: "#board", label: "Board" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-void/90 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <span className="font-display text-lg text-gold leading-none">
            MTK<span className="text-ink">W</span>
          </span>
          <span className="hidden sm:block font-mono text-[10px] text-muted tracking-widest border-l border-border pl-2">
            ARCHIVE 2026
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 font-body text-sm text-muted hover:text-gold transition-colors duration-200 rounded-lg hover:bg-faint"
            >
              {link.label}
            </a>
          ))}
          <a href="#board" className="btn-gold ml-2 py-2 px-4 text-xs">
            + Post Note
          </a>
        </nav>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 text-muted hover:text-gold transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-surface border-b border-border"
          >
            <nav className="flex flex-col p-4 gap-1">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 font-body text-sm text-muted hover:text-gold transition-colors rounded-lg hover:bg-faint"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
