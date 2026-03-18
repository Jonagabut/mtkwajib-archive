"use client";
// components/roster/StudentRoster.tsx
// Fix: click-to-flip only (no hover), better mobile UX, touch hint

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { MapPin, Quote, Search, X, Users, Star, BookOpen, RotateCcw } from "lucide-react";
import type { Student } from "@/lib/supabase/database.types";

const PLACEHOLDER_CLASS =
  "https://images.unsplash.com/photo-1529111290557-82f6d5c6cf85?w=400&q=80";
const PLACEHOLDER_GRAD =
  "https://images.unsplash.com/photo-1546961342-ea5f62d5a23b?w=400&q=80";

function highlightSegments(text: string, query: string): { text: string; match: boolean }[] {
  if (!query) return [{ text, match: false }];
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + query.length), match: true },
    { text: text.slice(idx + query.length), match: false },
  ].filter((s) => s.text.length > 0);
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-blue/30 text-blue rounded-sm px-0.5 not-italic">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

function StatsBar({ students }: { students: Student[] }) {
  const total    = students.length;
  const featured = students.filter((s) => s.is_featured).length;
  const withDest = students.filter((s) => s.destination).length;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8 px-1">
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <Users size={12} className="text-blue" />
        <span>{total} anggota kelas</span>
      </div>
      {featured > 0 && (
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <Star size={12} className="text-blue" />
          <span>{featured} featured</span>
        </div>
      )}
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <BookOpen size={12} className="text-blue" />
        <span>{withDest} punya tujuan tercatat</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted/50 hidden sm:flex">
        <RotateCcw size={10} className="text-blue/40" />
        <span>tap kartu untuk flip</span>
      </div>
    </div>
  );
}

function StudentCard({ student, index, query }: {
  student: Student;
  index: number;
  query: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{
        duration: 0.5,
        delay: (index % 10) * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flip-card h-[340px] sm:h-[380px] cursor-pointer select-none"
      onClick={() => setFlipped((v) => !v)}
      aria-label={`${student.name} — tap to flip`}
    >
      <div className={`flip-card-inner ${flipped ? "flipped" : ""}`}>

        {/* FRONT */}
        <div className="flip-card-front rounded-2xl overflow-hidden border border-border group">
          <div className="relative w-full h-[220px] sm:h-[260px] bg-faint overflow-hidden">
            <Image
              src={student.photo_class_url || PLACEHOLDER_CLASS}
              alt={student.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              unoptimized={!!(student.photo_class_url && student.photo_class_url.startsWith("/"))}
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {student.class_number && (
              <div className="absolute top-3 left-3 font-mono text-[10px] text-void bg-blue rounded-md px-2 py-0.5">
                #{student.class_number.toString().padStart(2, "0")}
              </div>
            )}
            {student.is_featured && (
              <div className="absolute top-3 right-3">
                <Star size={14} className="text-blue fill-blue drop-shadow" />
              </div>
            )}

            {/* Tap hint - always visible on mobile */}
            <div className="absolute bottom-3 right-3 font-mono text-[9px] text-muted/80
                            bg-void/70 rounded-md px-1.5 py-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              tap →
            </div>
          </div>
          <div className="bg-card p-4">
            <h3 className="font-display text-lg text-ink leading-tight truncate">
              <HighlightedText text={student.name} query={query} />
            </h3>
            <p className="font-mono text-[11px] text-blue mt-1 truncate">
              <HighlightedText text={student.custom_title} query={query} />
            </p>
          </div>
        </div>

        {/* BACK */}
        <div className="flip-card-back rounded-2xl overflow-hidden border border-blue/30 bg-card">
          <div className="relative w-full h-[180px] bg-faint overflow-hidden">
            <Image
              src={student.photo_grad_url || PLACEHOLDER_GRAD}
              alt={`${student.name} graduation`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              unoptimized={!!(student.photo_grad_url && student.photo_grad_url.startsWith("/"))}
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
            {/* Back hint */}
            <div className="absolute bottom-3 right-3 font-mono text-[9px] text-muted/70
                            bg-void/70 rounded-md px-1.5 py-0.5">
              ← tap balik
            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <div>
              <h3 className="font-display text-base text-ink leading-tight">{student.name}</h3>
              <span className="font-mono text-[10px] text-blue">{student.custom_title}</span>
            </div>

            {student.quote && (
              <div className="flex items-start gap-2">
                <Quote size={12} className="text-blue mt-0.5 shrink-0" />
                <p className="font-body text-xs text-muted leading-relaxed line-clamp-3">
                  {student.quote}
                </p>
              </div>
            )}

            {student.destination && (
              <div className="flex items-center gap-1.5 mt-auto">
                <MapPin size={11} className="text-coral shrink-0" />
                <span className="font-mono text-[10px] text-coral truncate">
                  {student.destination}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyRoster({ query }: { query: string }) {
  if (query) {
    return (
      <div className="col-span-full flex flex-col items-center py-20 gap-4 text-center">
        <p className="text-5xl">🔍</p>
        <p className="font-display text-xl text-muted">
          Tidak ada hasil untuk &ldquo;{query}&rdquo;.
        </p>
        <p className="font-body text-sm text-muted/60">Coba nama lain atau hapus pencarian.</p>
      </div>
    );
  }
  return (
    <div className="col-span-full flex flex-col items-center py-20 gap-4 text-center">
      <div className="text-5xl">🎓</div>
      <p className="font-display text-xl text-muted">Belum ada data warga kelas.</p>
      <p className="font-body text-sm text-muted/60">Tambahkan data siswa via Supabase dashboard.</p>
    </div>
  );
}

export default function StudentRoster({ students }: { students: Student[] }) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery]       = useState("");
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback((val: string) => {
    setRawQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(val.trim()), 150);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const sorted = useMemo(() => {
    const base = [...students].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      const na = a.class_number ?? 9999;
      const nb = b.class_number ?? 9999;
      if (na !== nb) return na - nb;
      return a.name.localeCompare(b.name, "id");
    });

    if (!query) return base;

    const q = query.toLowerCase();
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.custom_title.toLowerCase().includes(q) ||
        (s.destination ?? "").toLowerCase().includes(q)
    );
  }, [students, query]);

  return (
    <div>
      <StatsBar students={students} />

      {/* Search — full width on mobile */}
      <div className="relative mb-8 w-full sm:max-w-sm">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="text"
          value={rawQuery}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Cari nama, title, atau tujuan…"
          className="input-dark pl-9 pr-9"
        />
        {rawQuery && (
          <button
            onClick={() => handleInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {query && (
        <p className="font-mono text-[11px] text-muted mb-6">
          {sorted.length} hasil untuk &ldquo;{query}&rdquo;
        </p>
      )}

      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5"
      >
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <EmptyRoster query={query} />
          ) : (
            sorted.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                index={i}
                query={query}
              />
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
