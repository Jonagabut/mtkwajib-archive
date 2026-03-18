"use client";
// components/hero/HeroSection.tsx
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

const SPOTIFY_ID      = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID ?? "37i9dQZF1DXcBWIGoYBM5M";
const GRADUATION_YEAR = 2026;

export default function HeroSection({ logoUrl }: { logoUrl: string | null }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Only fade, no Y translate — parallax Y on mobile causes layout glitches
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const bgY     = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const container = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const item = {
    hidden:   { opacity: 0, y: 24 },
    visible:  { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center overflow-hidden bg-void"
      // pt-16 = navbar height. min-h accounts for both navbar and content.
      style={{
        minHeight: "100dvh",
        paddingTop:    "calc(4rem + var(--safe-top))",
        paddingBottom: "calc(2rem + var(--safe-bottom))",
      }}
    >
      {/* ── Background orbs (parallax) ── */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[5%] -left-[10%] w-[400px] h-[400px] rounded-full bg-blue/6 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-sky/4 blur-[90px]" />
      </motion.div>

      {/* ── Grid ── */}
      <div className="absolute inset-0 bg-grid-lines bg-grid pointer-events-none opacity-60" />

      {/* ── Diagonal lines ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.025]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="absolute h-px w-[120%] bg-blue -left-[10%]"
            style={{ top: `${(i + 1) * 15}%`, transform: "rotate(-3deg)" }} />
        ))}
      </div>

      {/* ── Main content ── */}
      <motion.div
        style={{ opacity }}
        className="relative z-10 w-full max-w-lg mx-auto px-5 flex flex-col items-center text-center gap-0"
      >
        <motion.div variants={container} initial="hidden" animate="visible"
          className="flex flex-col items-center w-full gap-4">

          {/* Eyebrow */}
          <motion.div variants={item} className="flex items-center gap-3">
            <span className="h-px w-8 bg-blue/50" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-blue uppercase">
              Kelas XII — {GRADUATION_YEAR}
            </span>
            <span className="h-px w-8 bg-blue/50" />
          </motion.div>

          {/* Logo (if uploaded) */}
          {logoUrl && (
            <motion.div variants={item} className="relative w-16 h-16 sm:w-20 sm:h-20">
              <Image src={logoUrl} alt="Logo kelas" fill
                className="object-contain drop-shadow-[0_0_20px_rgba(77,148,255,0.5)]" />
            </motion.div>
          )}

          {/* Title — clamp keeps it readable on 320px up to desktop */}
          <motion.h1 variants={item}
            className="font-display font-black leading-none hero-text-shadow w-full"
            style={{ fontSize: "clamp(3rem,12vw,7rem)" }}>
            <span className="text-blue">MTK</span>{" "}
            <span className="text-ink">Wajib</span>
            <br />
            <span className="text-blue/60 text-[0.75em]">Archive</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p variants={item}
            className="font-body text-muted text-sm max-w-xs leading-relaxed">
            Tiga tahun. Ribuan kenangan. Satu tempat yang bakal ada selamanya.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap gap-3 justify-center">
            <a href="#roster" className="btn-blue px-5 py-2.5 text-sm">Warga Kelas</a>
            <a href="#gallery" className="btn-outline px-5 py-2.5 text-sm">Archive</a>
          </motion.div>

          {/* Spotify */}
          <motion.div variants={item} className="w-full">
            <div className="card-glass p-3 rounded-2xl">
              <p className="font-mono text-[9px] text-blue/60 tracking-widest uppercase mb-2 text-center">
                🎵 Class Anthem
              </p>
              <iframe
                src={`https://open.spotify.com/embed/playlist/${SPOTIFY_ID}?utm_source=generator&theme=0`}
                width="100%" height="80" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy" className="rounded-lg block"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted z-10"
        style={{ bottom: "calc(1.5rem + var(--safe-bottom))" }}
      >
        <span className="font-mono text-[9px] tracking-widest">SCROLL</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
          <ChevronDown size={14} className="text-blue" />
        </motion.div>
      </motion.div>

      {/* ── Year stamp desktop ── */}
      <div className="absolute right-6 font-mono text-[9px] text-muted/30 tracking-widest hidden md:block"
        style={{ top: "calc(1.5rem + var(--safe-top))" }}>
        CLASS OF {GRADUATION_YEAR}
      </div>
    </section>
  );
}
