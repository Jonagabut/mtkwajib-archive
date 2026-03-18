"use client";
// components/roster/StudentRoster.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { MapPin, Quote } from "lucide-react";
import type { Student } from "@/lib/supabase/database.types";

const PLACEHOLDER_CLASS =
  "https://images.unsplash.com/photo-1529111290557-82f6d5c6cf85?w=400&q=80";
const PLACEHOLDER_GRAD =
  "https://images.unsplash.com/photo-1546961342-ea5f62d5a23b?w=400&q=80";

function StudentCard({ student, index }: { student: Student; index: number }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: (index % 8) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="flip-card h-[380px] cursor-pointer"
      onClick={() => setFlipped((v) => !v)}
    >
      <div className={`flip-card-inner ${flipped ? "flipped" : ""}`}>
        {/* ── FRONT: Class 10 Photo ── */}
        <div className="flip-card-front rounded-2xl overflow-hidden border border-border group">
          <div className="relative w-full h-[260px] bg-faint overflow-hidden">
            <Image
              src={student.photo_class_url || PLACEHOLDER_CLASS}
              alt={student.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {/* Class number badge */}
            {student.class_number && (
              <div className="absolute top-3 left-3 font-mono text-[10px] text-void bg-gold rounded-md px-2 py-0.5">
                #{student.class_number.toString().padStart(2, "0")}
              </div>
            )}

            {/* Flip hint */}
            <div className="absolute top-3 right-3 font-mono text-[10px] text-muted bg-void/70 rounded-md px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              tap to flip →
            </div>
          </div>

          <div className="bg-card p-4">
            <h3 className="font-display text-lg text-ink leading-tight truncate">
              {student.name}
            </h3>
            <p className="font-mono text-[11px] text-gold mt-1 truncate">
              {student.custom_title}
            </p>
          </div>
        </div>

        {/* ── BACK: Grad Photo + Info ── */}
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

// ── Empty State ──────────────────────────────────────────────
function EmptyRoster() {
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

// ── Main Component ───────────────────────────────────────────
export default function StudentRoster({ students }: { students: Student[] }) {
  if (students.length === 0) return <EmptyRoster />;

  // Show featured students first
  const sorted = [...students].sort((a, b) =>
    a.is_featured === b.is_featured ? 0 : a.is_featured ? -1 : 1
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
      {sorted.map((student, i) => (
        <StudentCard key={student.id} student={student} index={i} />
      ))}
    </div>
  );
}
