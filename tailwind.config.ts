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
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        void: "#08080e",
        surface: "#0f0f18",
        card: "#16161f",
        border: "#252535",
        gold: {
          DEFAULT: "#f5c842",
          dim: "#c9a232",
          glow: "#f5c84240",
        },
        coral: {
          DEFAULT: "#e8856a",
          dim: "#c4674e",
        },
        lavender: "#9b8fd4",
        ink: "#f0ece4",
        muted: "#6b6b85",
        faint: "#2a2a3a",
      },
      boxShadow: {
        "gold-glow": "0 0 40px #f5c84230, 0 0 80px #f5c84210",
        "card-hover": "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px #f5c84220",
        "sticky-yellow": "4px 4px 0px #c9a232, 8px 8px 20px rgba(0,0,0,0.4)",
        "sticky-pink": "4px 4px 0px #c4674e, 8px 8px 20px rgba(0,0,0,0.4)",
        "sticky-lavender":
          "4px 4px 0px #7a6faa, 8px 8px 20px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
        "grid-lines":
          "linear-gradient(rgba(245,200,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,200,66,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "60px 60px",
      },
      animation: {
        "grain": "grain 8s steps(10) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "countdown-tick": "countdown-tick 1s ease-in-out infinite",
      },
      keyframes: {
        grain: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-5%, -10%)" },
          "20%": { transform: "translate(-15%, 5%)" },
          "30%": { transform: "translate(7%, -25%)" },
          "40%": { transform: "translate(-5%, 25%)" },
          "50%": { transform: "translate(-15%, 10%)" },
          "60%": { transform: "translate(15%, 0%)" },
          "70%": { transform: "translate(0%, 15%)" },
          "80%": { transform: "translate(3%, 35%)" },
          "90%": { transform: "translate(-10%, 10%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "countdown-tick": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
