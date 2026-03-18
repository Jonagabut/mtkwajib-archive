import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        // ── Deep navy dark theme ──────────────────────────────
        void:    "#040c1e",   // deepest bg
        surface: "#071428",   // section bg
        card:    "#0b1c3a",   // card bg
        border:  "#172e54",   // borders
        faint:   "#0e1d36",   // subtle bg

        // ── Primary accent: electric blue ─────────────────────
        blue: {
          DEFAULT: "#4d94ff",  // primary
          dim:     "#2d73e8",  // hover / pressed
          bright:  "#7ab4ff",  // highlight text
          glow:    "#4d94ff30",
        },

        // ── Supporting accents ────────────────────────────────
        sky:     "#93c5fd",   // light blue text / tags
        coral: {
          DEFAULT: "#ff7b6b",
          dim:     "#e05a4a",
        },
        lavender: "#a78bfa",

        // ── Text ──────────────────────────────────────────────
        ink:   "#dce9ff",   // near-white with blue tint
        muted: "#4a6fa5",   // muted blue-gray

        // ── Legacy alias so old gold refs dont break ──────────
        // redirect gold → blue.DEFAULT so any leftover @apply text-gold still works
        gold: {
          DEFAULT: "#4d94ff",
          dim:     "#2d73e8",
          glow:    "#4d94ff30",
        },
      },
      boxShadow: {
        "blue-glow":  "0 0 40px #4d94ff25, 0 0 80px #4d94ff10",
        "card-hover": "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px #4d94ff20",
        "note-yellow":"4px 4px 0px #c9a232, 8px 8px 20px rgba(0,0,0,0.5)",
        "note-pink":  "4px 4px 0px #c4674e, 8px 8px 20px rgba(0,0,0,0.5)",
        "note-lav":   "4px 4px 0px #7a6faa, 8px 8px 20px rgba(0,0,0,0.5)",
        "gold-glow":  "0 0 40px #4d94ff25, 0 0 80px #4d94ff10",
      },
      backgroundImage: {
        "grid-lines": "linear-gradient(rgba(77,148,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(77,148,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: { grid: "60px 60px" },
      animation: {
        float:  "float 6s ease-in-out infinite",
        shimmer:"shimmer 2s linear infinite",
        pulse2: "pulse2 3s ease-in-out infinite",
      },
      keyframes: {
        float:  { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-12px)" } },
        shimmer:{ "0%": { backgroundPosition: "-1000px 0" }, "100%": { backgroundPosition: "1000px 0" } },
        pulse2: { "0%, 100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};
export default config;
