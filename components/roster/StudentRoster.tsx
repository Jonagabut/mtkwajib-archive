"use client";
// components/roster/StudentRoster.tsx
// Features:
//  - Live search with 150ms debounce (name, custom_title, destination)
//  - Class statistics header (total, featured, with destination)
//  - Result highlighting: matched substring in name turns gold
//  - Featured students always sorted first, then by class_number
//  - 3D card flip: front = class photo, back = grad photo + bio

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { MapPin, Quote, Search, X, Users, Star, BookOpen } from "lucide-react";
import type { Student } from "@/lib/supabase/database.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLACEHOLDER_CLASS =
  "https://images.unsplash.com/photo-1529111290557-82f6d5c6cf85?w=400&q=80";
const PLACEHOLDER_GRAD =
  "https://images.unsplash.com/photo-1546961342-ea5f62d5a23b?w=400&q=80";

// ─── Highlight helper ─────────────────────────────────────────────────────────
// Splits `text` around `query` and returns segments with a `match` flag.
function highlightSegments(
  text: string,
  query: string
): { text: string; match: boolean }[] {
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
          <mark key={i} className="bg-gold/30 text-gold rounded-sm px-0.5 not-italic">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ students }: { students: Student[] }) {
  const total       = students.length;
  const featured    = students.filter((s) => s.is_featured).length;
  const withDest    = students.filter((s) => s.destination).length;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8 px-1">
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <Users size={12} className="text-gold" />
        <span>{total} anggota kelas</span>
      </div>
      {featured > 0 && (
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <Star size={12} className="text-gold" />
          <span>{featured} featured</span>
        </div>
      )}
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <BookOpen size={12} className="text-gold" />
        <span>{withDest} punya tujuan tercatat</span>
      </div>
    </div>
  );
}

// ─── StudentCard ──────────────────────────────────────────────────────────────

function StudentCard({
  student,
  index,
  query,
}: {
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
      className="flip-card h-[380px] cursor-pointer"
      onClick={() => setFlipped((v) => !v)}
    >
      <div className={`flip-card-inner ${flipped ? "flipped" : ""}`}>
        {/* ── FRONT ── */}
        <div className="flip-card-front rounded-2xl overflow-hidden border border-border group">
          <div className="relative w-full h-[260px] bg-faint overflow-hidden">
            <Image
              src={student.photo_class_url || PLACEHOLDER_CLASS}
              alt={student.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover object-top transition-transform duration-700
                         group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {student.class_number && (
              <div className="absolute top-3 left-3 font-mono text-[10px] text-void
                              bg-gold rounded-md px-2 py-0.5">
                #{student.class_number.toString().padStart(2, "0")}
              </div>
            )}
            {student.is_featured && (
              <div className="absolute top-3 right-3">
                <Star size={14} className="text-gold fill-gold drop-shadow" />
              </div>
            )}
            <div className="absolute bottom-3 right-3 font-mono text-[9px] text-muted/70
                            bg-void/60 rounded-md px-1.5 py-0.5 opacity-0
                            group-hover:opacity-100 transition-opacity">
              tap to flip →
            </div>
          </div>
          <div className="bg-card p-4">
            <h3 className="font-display text-lg text-ink leading-tight truncate">
              <HighlightedText text={student.name} query={query} />
            </h3>
            <p className="font-mono text-[11px] text-gold mt-1 truncate">
              <HighlightedText text={student.custom_title} query={query} />
            </p>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="flip-card-back rounded-2xl overflow-hidden border border-gold/30 bg-card">
          <div className="relative w-full h-[180px] bg-faint overflow-hidden">
            <Image
              src={student.photo_grad_url || PLACEHOLDER_GRAD}
              alt={`${student.name} graduation`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          </div>

          <div className="p-4 flex flex-col gap-3">
            <div>
              <h3 className="font-display text-base text-ink leading-tight">
                {student.name}
              </h3>
              <span className="font-mono text-[10px] text-gold">
                {student.custom_title}
              </span>
            </div>

            {student.quote && (
              <div className="flex items-start gap-2">
                <Quote size={12} className="text-gold mt-0.5 shrink-0" />
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

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyRoster({ query }: { query: string }) {
  if (query) {
    return (
      <div className="col-span-full flex flex-col items-center py-20 gap-4 text-center">
        <p className="text-5xl">🔍</p>
        <p className="font-display text-xl text-muted">
          Tidak ada hasil untuk &ldquo;{query}&rdquo;.
        </p>
        <p className="font-body text-sm text-muted/60">
          Coba cari nama lain atau hapus pencarian.
        </p>
      </div>
    );
  }
  return (
    <div className="col-span-full flex flex-col items-center py-20 gap-4 text-center">
      <div className="text-5xl">🎓</div>
      <p className="font-display text-xl text-muted">Belum ada data warga kelas.</p>
      <p className="font-body text-sm text-muted/60">
        Tambahkan data siswa via Supabase dashboard.
      </p>
    </div>
  );
}

// ─── StudentRoster (main) ─────────────────────────────────────────────────────

export default function StudentRoster({ students }: { students: Student[] }) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery]       = useState(""); // debounced
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 150ms debounce so typing feels instant but filtering doesn't thrash
  const handleInput = useCallback((val: string) => {
    setRawQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(val.trim()), 150);
  }, []);

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Sort: featured first, then by class_number, then alphabetically
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
      {/* Stats */}
      <StatsBar students={students} />

      {/* Search */}
      <div className="relative mb-8 max-w-sm">
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted
                       hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search result count */}
      {query && (
        <p className="font-mono text-[11px] text-muted mb-6">
          {sorted.length} hasil untuk &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Grid */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5"
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
