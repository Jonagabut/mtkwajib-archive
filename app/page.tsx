// app/page.tsx
import HeroSection    from "@/components/hero/HeroSection";
import NavBar         from "@/components/layout/NavBar";
import StudentRoster  from "@/components/roster/StudentRoster";
import MediaGallery   from "@/components/gallery/MediaGallery";
import ConfessionBoard from "@/components/board/ConfessionBoard";
import Footer         from "@/components/layout/Footer";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteConfig }     from "@/app/actions/admin";
import type { Student, GalleryMedia, Confession } from "@/lib/supabase/database.types";

export const revalidate = 60;

// ─── Fetchers — each is independent, never crashes the page ──────────────────

async function getStudents(): Promise<Student[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("students")
      .select("id, name, custom_title, quote, destination, photo_class_url, photo_grad_url, class_number, is_featured, created_at")
      .order("class_number", { ascending: true });
    if (error) throw error;
    return (data as Student[]) ?? [];
  } catch (err) { console.error("[page] getStudents:", err); return []; }
}

async function getGalleryMedia(): Promise<GalleryMedia[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("gallery_media")
      .select("id, storage_path, storage_url, media_type, mime_type, caption, category, uploaded_by, width, height, file_size_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    return (data as GalleryMedia[]) ?? [];
  } catch (err) { console.error("[page] getGalleryMedia:", err); return []; }
}

async function getConfessions(): Promise<Confession[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("confessions")
      .select("id, content, color, x_pos, y_pos, rotation_deg, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data as Confession[]) ?? [];
  } catch (err) { console.error("[page] getConfessions:", err); return []; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [students, galleryMedia, confessions, siteConfig] = await Promise.all([
    getStudents(),
    getGalleryMedia(),
    getConfessions(),
    getSiteConfig(),
  ]);

  const logoUrl = siteConfig["logo_url"] ?? null;

  return (
    <main className="relative overflow-x-hidden">
      <NavBar logoUrl={logoUrl} />
      <HeroSection logoUrl={logoUrl} />

      {/* ── Warga Kelas ── */}
      <section id="roster" className="relative py-20 md:py-28 bg-surface">
        <div className="absolute inset-0 bg-grid-lines bg-grid opacity-100 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-12 text-center">
            <p className="section-label mb-3">Angkatan 2026</p>
            <h2 className="section-title">Warga <span className="text-blue">Kelas</span></h2>
            <p className="mt-4 text-muted max-w-md mx-auto font-body text-sm">
              Semua wajah yang pernah berjuang bareng—dari MTK sampai wisuda.
            </p>
          </div>
          <StudentRoster students={students} />
        </div>
      </section>

      {/* ── The Archive ── */}
      <section id="gallery" className="relative py-20 md:py-28 bg-void">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-12 text-center">
            <p className="section-label mb-3">Memories</p>
            <h2 className="section-title">The <span className="text-blue">Archive</span></h2>
            <p className="mt-4 text-muted max-w-md mx-auto font-body text-sm">
              Foto dan video dari semua momen—yang bikin ketawa, nangis, dan malu sekaligus.
            </p>
          </div>
          <MediaGallery initialMedia={galleryMedia} />
        </div>
      </section>

      {/* ── Confession Board ── */}
      <section id="board" className="relative py-20 md:py-28 bg-surface">
        <div className="absolute inset-0 bg-grid-lines bg-grid opacity-100 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-12 text-center">
            <p className="section-label mb-3">Anonymous</p>
            <h2 className="section-title">Confession <span className="text-blue">Board</span></h2>
            <p className="mt-4 text-muted max-w-md mx-auto font-body text-sm">
              Curhat, roast, atau bilang sesuatu yang belum pernah lo bilang langsung.
            </p>
          </div>
          <ConfessionBoard initialConfessions={confessions} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
