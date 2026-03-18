// app/page.tsx
import HeroSection from "@/components/hero/HeroSection";
import NavBar from "@/components/layout/NavBar";
import StudentRoster from "@/components/roster/StudentRoster";
import MediaGallery from "@/components/gallery/MediaGallery";
import ConfessionBoard from "@/components/board/ConfessionBoard";
import Footer from "@/components/layout/Footer";
import { createAdminClient } from "@/lib/supabase/server";
import type { Student, GalleryMedia, Confession } from "@/lib/supabase/database.types";

export const revalidate = 60;

async function getStudents(): Promise<Student[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .order("class_number", { ascending: true });
  return data ?? [];
}

async function getGalleryMedia(): Promise<GalleryMedia[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gallery_media")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);
  return data ?? [];
}

async function getConfessions(): Promise<Confession[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("confessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function HomePage() {
  const [students, galleryMedia, confessions] = await Promise.all([
    getStudents(),
    getGalleryMedia(),
    getConfessions(),
  ]);

  return (
    <main className="relative overflow-x-hidden">
      <NavBar />

      {/* Hero */}
      <HeroSection />

      {/* Roster */}
      <section id="roster" className="relative py-24 bg-surface">
        <div className="absolute inset-0 bg-grid-lines bg-grid opacity-100 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Angkatan 2026</p>
            <h2 className="section-title">
              Warga <span className="text-gold">Kelas</span>
            </h2>
            <p className="mt-4 text-muted max-w-md mx-auto font-body text-sm">
              Semua wajah yang pernah berjuang bareng—dari MTK sampai wisuda.
            </p>
          </div>
          <StudentRoster students={students} />
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="relative py-24 bg-void">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Memories</p>
            <h2 className="section-title">
              The <span className="text-gold">Archive</span>
            </h2>
            <p className="mt-4 text-muted max-w-md mx-auto font-body text-sm">
              Foto dan video dari semua momen—yang bikin ketawa, nangis, dan
              malu sekaligus.
            </p>
          </div>
          <MediaGallery initialMedia={galleryMedia} />
        </div>
      </section>

      {/* Confession Board */}
      <section id="board" className="relative py-24 bg-surface">
        <div className="absolute inset-0 bg-grid-lines bg-grid opacity-100 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Anonymous</p>
            <h2 className="section-title">
              Confession <span className="text-gold">Board</span>
            </h2>
            <p className="mt-4 text-muted max-w-md mx-auto font-body text-sm">
              Curhat, roast, atau bilang sesuatu yang belum pernah lo bilang
              langsung.
            </p>
          </div>
          <ConfessionBoard initialConfessions={confessions} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
