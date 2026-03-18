"use client";
// components/hero/HeroSection.tsx
// Deep navy + electric blue hero. Parallax orbs, animated grid, Spotify embed.
// Mobile: proper padding for iOS notch, 100dvh for correct viewport height.

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

const SPOTIFY_ID      = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID ?? "37i9dQZF1DXcBWIGoYBM5M";
const GRADUATION_YEAR = 2026;

export default function HeroSection({ logoUrl }: { logoUrl: string | null }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref });

  const bgY    = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } } };
  const item = {
    hidden:   { opacity: 0, y: 36 },
    visible:  { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section
      ref={ref}
      // 100dvh fixes the "100vh includes URL bar" iOS bug
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-void"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      {/* ── Background orbs ── */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        {/* Large blue orb — top left */}
        <div className="absolute -top-[10%] -left-[5%] w-[600px] h-[600px] rounded-full bg-blue/6 blur-[130px]" />
        {/* Medium sky orb — bottom right */}
        <div className="absolute bottom-[0%] right-[0%] w-[500px] h-[500px] rounded-full bg-sky/4 blur-[110px]" />
        {/* Small accent — center */}
        <div className="absolute top-[45%] left-[45%] w-[250px] h-[250px] rounded-full bg-lavender/3 blur-[80px]" />
      </motion.div>

      {/* ── Animated grid ── */}
      <div className="absolute inset-0 bg-grid-lines bg-grid opacity-100 pointer-events-none" />

      {/* ── Diagonal rule lines ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.025]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px w-full bg-blue"
            style={{ top: `${(i + 1) * 12}%`, transform: "rotate(-4deg) scaleX(1.3)" }}
          />
        ))}
      </div>

      {/* ── Main content ── */}
      <motion.div
        style={{ y: titleY, opacity }}
        className="relative z-10 flex flex-col items-center text-center px-5 max-w-4xl mx-auto w-full"
      >
        <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col items-center gap-5 md:gap-7">

          {/* Eyebrow */}
          <motion.div variants={item} className="flex items-center gap-3">
            <span className="h-px w-10 bg-blue/50" />
            <span className="section-label text-[10px] md:text-xs">Kelas XII — {GRADUATION_YEAR}</span>
            <span className="h-px w-10 bg-blue/50" />
          </motion.div>

          {/* Logo or Title */}
          {logoUrl ? (
            <motion.div variants={item} className="relative w-24 h-24 md:w-32 md:h-32">
              <Image src={logoUrl} alt="Logo kelas" fill className="object-contain drop-shadow-[0_0_30px_rgba(77,148,255,0.4)]" />
            </motion.div>
          ) : null}

          {/* Hero title */}
          <motion.h1
            variants={item}
            className="font-display font-black leading-[0.88] hero-text-shadow
                       text-[clamp(4rem,15vw,9rem)]"
          >
            <span className="text-blue">MTK</span>
            <br />
            <span className="text-ink">Wajib</span>
            <br />
            <span className="text-blue/70">Archive</span>
          </motion.h1>

          {/* Sub */}
          <motion.p variants={item} className="font-body text-muted text-sm md:text-base max-w-sm md:max-w-lg">
            Tiga tahun. Ribuan kenangan. Satu tempat yang bakal ada selamanya.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-3 justify-center">
            <a href="#roster" className="btn-blue text-sm px-6 py-3">Lihat Warga Kelas</a>
            <a href="#gallery" className="btn-outline text-sm px-6 py-3">The Archive</a>
          </motion.div>

          {/* Spotify */}
          <motion.div variants={item} className="w-full max-w-[340px]">
            <div className="card-glass p-3">
              <p className="section-label text-[9px] mb-2 text-center">🎵 Class Anthem</p>
              <iframe
                src={`https://open.spotify.com/embed/playlist/${SPOTIFY_ID}?utm_source=generator&theme=0`}
                width="100%" height="80" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy" className="rounded-lg"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-[calc(2rem+var(--safe-bottom))] left-1/2 -translate-x-1/2
                   flex flex-col items-center gap-2 text-muted z-10"
      >
        <span className="font-mono text-[9px] tracking-widest">SCROLL</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown size={16} className="text-blue" />
        </motion.div>
      </motion.div>

      {/* ── Year stamp ── */}
      <div className="absolute top-[calc(1.5rem+var(--safe-top))] right-6 font-mono text-[9px] text-muted/40 tracking-widest hidden md:block">
        CLASS OF {GRADUATION_YEAR}
      </div>
    </section>
  );
}
