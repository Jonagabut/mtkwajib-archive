"use client";
// components/hero/HeroSection.tsx
import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ChevronDown, Music2 } from "lucide-react";

const SPOTIFY_ID      = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID ?? "37i9dQZF1DXcBWIGoYBM5M";
const GRADUATION_YEAR = 2026;

export default function HeroSection({ logoUrl }: { logoUrl: string | null }) {
  const ref = useRef<HTMLElement>(null);
  const [spotifyLoaded, setSpotifyLoaded] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const bgY     = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const container = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const item = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center overflow-hidden bg-void"
      style={{
        minHeight: "100dvh",
        paddingTop:    "calc(4rem + var(--safe-top))",
        paddingBottom: "calc(3rem + var(--safe-bottom))",
      }}
    >
      {/* Background orbs */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[5%] -left-[10%] w-[500px] h-[500px] rounded-full bg-blue/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-sky/4 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-blue/3 blur-[80px]" />
      </motion.div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-lines bg-grid pointer-events-none opacity-50" />

      {/* Diagonal accent lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="absolute h-px w-[130%] bg-blue -left-[15%]"
            style={{ top: `${(i + 1) * 18}%`, transform: "rotate(-4deg)" }} />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        style={{ opacity }}
        className="relative z-10 w-full max-w-xl mx-auto px-5 flex flex-col items-center text-center"
      >
        <motion.div variants={container} initial="hidden" animate="visible"
          className="flex flex-col items-center w-full gap-5">

          {/* Eyebrow */}
          <motion.div variants={item} className="flex items-center gap-3">
            <span className="h-px w-10 bg-blue/40" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-blue uppercase">
              Kelas XII — {GRADUATION_YEAR}
            </span>
            <span className="h-px w-10 bg-blue/40" />
          </motion.div>

          {/* Logo */}
          {logoUrl && (
            <motion.div variants={item} className="relative w-16 h-16 sm:w-20 sm:h-20">
              <Image src={logoUrl} alt="Logo kelas" fill
                className="object-contain drop-shadow-[0_0_24px_rgba(77,148,255,0.6)]" />
            </motion.div>
          )}

          {/* Title */}
          <motion.h1 variants={item}
            className="font-display font-black leading-none hero-text-shadow w-full"
            style={{ fontSize: "clamp(3.2rem,13vw,7.5rem)" }}>
            <span className="text-blue">MTK</span>{" "}
            <span className="text-ink">Wajib</span>
            <br />
            <span className="text-blue/55 text-[0.72em]">Archive</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p variants={item}
            className="font-body text-muted text-sm max-w-xs leading-relaxed -mt-1">
            Tiga tahun. Ribuan kenangan. Satu tempat yang bakal ada selamanya.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap gap-3 justify-center">
            <a href="#roster" className="btn-blue px-6 py-3 text-sm">Warga Kelas</a>
            <a href="#gallery" className="btn-outline px-6 py-3 text-sm">Archive</a>
            <a href="#board" className="btn-outline px-6 py-3 text-sm">Confession</a>
          </motion.div>

          {/* Spotify embed */}
          <motion.div variants={item} className="w-full">
            <div className="card-glass p-4 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Music2 size={12} className="text-blue/70" />
                <p className="font-mono text-[9px] text-blue/60 tracking-widest uppercase">
                  Class Anthem
                </p>
              </div>

              {/* Skeleton while loading */}
              {!spotifyLoaded && (
                <div className="w-full h-[80px] rounded-xl bg-faint animate-pulse" />
              )}

              <iframe
                key={SPOTIFY_ID}
                src={`https://open.spotify.com/embed/playlist/${SPOTIFY_ID}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                style={{ border: 0, display: spotifyLoaded ? "block" : "none" }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Class Playlist"
                className="rounded-xl"
                onLoad={() => setSpotifyLoaded(true)}
              />
            </div>
          </motion.div>

        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted z-10"
        style={{ bottom: "calc(2rem + var(--safe-bottom))" }}
      >
        <span className="font-mono text-[9px] tracking-widest opacity-50">SCROLL</span>
        <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown size={14} className="text-blue/60" />
        </motion.div>
      </motion.div>

      {/* Year stamp desktop */}
      <div className="absolute right-5 font-mono text-[9px] text-muted/25 tracking-widest hidden md:block"
        style={{ top: "calc(1.5rem + var(--safe-top))" }}>
        CLASS OF {GRADUATION_YEAR}
      </div>
    </section>
  );
}
