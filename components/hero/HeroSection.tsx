"use client";
// components/hero/HeroSection.tsx
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";

const SPOTIFY_PLAYLIST_ID =
  process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID ?? "37i9dQZF1DXcBWIGoYBM5M";

const GRADUATION_YEAR = 2026;

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref });

  // Parallax transforms
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-void"
    >
      {/* ── Parallax Background Orbs ── */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Gold orb top-left */}
        <div className="absolute top-[10%] left-[8%] w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px]" />
        {/* Coral orb bottom-right */}
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full bg-coral/5 blur-[100px]" />
        {/* Lavender center */}
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-lavender/4 blur-[80px]" />
      </motion.div>

      {/* ── Diagonal lines decoration ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px w-full bg-gold"
            style={{ top: `${(i + 1) * 8}%`, transform: "rotate(-6deg) scaleX(1.2)" }}
          />
        ))}
      </div>

      {/* ── Main Content ── */}
      <motion.div
        style={{ y: titleY, opacity }}
        className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-6"
        >
          {/* Label */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <span className="h-px w-12 bg-gold/60" />
            <span className="section-label">Kelas XII — {GRADUATION_YEAR}</span>
            <span className="h-px w-12 bg-gold/60" />
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-ink hero-text-shadow leading-[0.9]"
          >
            MTK
            <br />
            <span className="text-gold">Wajib</span>
            <br />
            Archive
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={itemVariants}
            className="font-body text-muted text-base md:text-lg max-w-lg"
          >
            Tiga tahun. Ribuan kenangan. Satu tempat yang bakal ada selamanya.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-3 justify-center mt-2"
          >
            <a href="#roster" className="btn-gold">
              Lihat Warga Kelas
            </a>
            <a href="#gallery" className="btn-outline">
              The Archive
            </a>
          </motion.div>

          {/* Spotify Player */}
          <motion.div
            variants={itemVariants}
            className="mt-6 w-full max-w-sm"
          >
            <div className="card-glass p-3">
              <p className="section-label text-[10px] mb-2 text-center">
                🎵 Class Anthem
              </p>
              <iframe
                src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-lg"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted z-10"
      >
        <span className="font-mono text-[10px] tracking-widest">SCROLL</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={18} className="text-gold" />
        </motion.div>
      </motion.div>

      {/* ── Year stamp ── */}
      <div className="absolute top-8 right-8 font-mono text-[10px] text-muted tracking-widest opacity-50 hidden md:block">
        CLASS OF {GRADUATION_YEAR}
      </div>
    </section>
  );
}
