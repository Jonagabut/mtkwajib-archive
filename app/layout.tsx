// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"], variable: "--font-playfair", display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"], variable: "--font-dm-sans", display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"], variable: "--font-jetbrains", display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MTK Wajib Archive — Class of 2026",
  description: "Yearbook digital dan arsip kolaboratif angkatan MTK Wajib 2026.",
  openGraph: {
    title: "MTK Wajib Archive — Class of 2026",
    description: "Kenangan kita, tersimpan selamanya.",
    type: "website",
  },
};

// Proper iOS viewport — viewport-fit=cover handles notch safe areas
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",         // ← key fix for iPhone notch
  themeColor: "#040c1e",        // ← fixes iOS status bar color (no more blue tint)
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="scroll-smooth">
      <body
        className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable} font-body bg-void text-ink antialiased`}
      >
        {/* Film grain overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-[60] opacity-[0.02]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
            mixBlendMode: "overlay",
          }}
        />
        {children}
      </body>
    </html>
  );
}
