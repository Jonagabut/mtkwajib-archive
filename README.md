# MTK Wajib Archive — Class of 2026 🎓

> A digital yearbook & collaborative archive for the graduating class of MTK Wajib, 2026.
> Built with Next.js 14, Supabase, Tailwind CSS, and Framer Motion.

---

## ✨ Feature Overview

| Feature | Description |
|---|---|
| 🎭 **Hero Section** | Parallax scrolling, animated title reveals, Spotify playlist embed |
| 👥 **Warga Kelas Roster** | 3D flip card grid — Class 10 photo front, graduation photo + quote back |
| 🖼️ **Media Archive** | Masonry gallery for images + MP4 videos, category filter, Lightbox viewer, **Download button** |
| 📌 **Confession Board** | Draggable sticky notes (Framer Motion), position persisted in database |
| 🔐 **Time Capsule 2031** | Live countdown timer, write-protected messages, locked by DB RLS until 2031 |

---

## 🗂️ Project Structure

```
mtk-wajib-archive/
├── app/
│   ├── actions/
│   │   ├── gallery.ts          ← Server Action: upload media
│   │   ├── confessions.ts      ← Server Action: post note + update position
│   │   └── capsule.ts          ← Server Action: submit time capsule message
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                ← Root page (SSR data fetching)
│
├── components/
│   ├── hero/
│   │   └── HeroSection.tsx     ← Parallax hero + Spotify embed
│   ├── layout/
│   │   ├── NavBar.tsx
│   │   └── Footer.tsx
│   ├── roster/
│   │   └── StudentRoster.tsx   ← 3D flip cards
│   ├── gallery/
│   │   └── MediaGallery.tsx    ← Masonry + Lightbox + Download
│   ├── board/
│   │   └── ConfessionBoard.tsx ← Draggable notes with DB persistence
│   └── capsule/
│       └── TimeCapsule.tsx     ← Countdown timer + submission form
│
├── lib/
│   └── supabase/
│       ├── client.ts           ← Browser Supabase client
│       ├── server.ts           ← Admin client (service role) + passcode validator
│       └── database.types.ts   ← TypeScript types for all tables
│
├── supabase/
│   └── schema.sql              ← Full DB schema + RLS policies
│
├── .env.example                ← Copy to .env.local
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## 🚀 Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/mtk-wajib-archive.git
cd mtk-wajib-archive
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `mtk-wajib-archive`, choose a strong password
3. Region: **Southeast Asia (Singapore)**

### 3. Run Database Schema

In Supabase Dashboard → **SQL Editor** → New Query → paste contents of `supabase/schema.sql` → Run.

### 4. Create Storage Buckets

In Supabase Dashboard → **Storage** → New Bucket:

| Bucket Name | Public | File Size Limit | Allowed MIME Types |
|---|---|---|---|
| `gallery` | ✅ Yes | 200MB | `image/jpeg, image/png, image/webp, image/gif, video/mp4` |
| `student-photos` | ✅ Yes | 10MB | `image/jpeg, image/png, image/webp` |

**Storage RLS for `gallery` bucket:**
```sql
-- In Storage Policies tab for 'gallery' bucket:
-- SELECT: public (allow all)
-- INSERT: authenticated via service_role (enforced at API layer)
```

### 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# From Supabase: Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Shared secret for write operations (share only with classmates!)
CLASS_PASSCODE=MTKWajib2026

# Spotify: get from playlist share link → Embed
NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID=37i9dQZF1DXcBWIGoYBM5M

# Time capsule unlock date
NEXT_PUBLIC_CAPSULE_UNLOCK_DATE=2031-07-01T00:00:00.000Z

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Dev Server

```bash
npm run dev
# Visit http://localhost:3000
```

---

## 📦 Adding Students (Seed Data)

Insert student records directly in Supabase **Table Editor** or via SQL:

```sql
INSERT INTO students (name, custom_title, quote, destination, photo_class_url, photo_grad_url, class_number, is_featured)
VALUES
  ('Rafi Ardana', 'Suhu Integral', 'MTK susah, hidup lebih susah.', 'Unila - Teknik Sipil', 'https://...', 'https://...', 1, TRUE),
  ('Siti Nurhaliza', 'Ratu Presentasi', 'Semua pasti bisa kalau mau.', 'Itera - Arsitektur', 'https://...', 'https://...', 2, FALSE),
  ('Budi Santoso', 'Tidur Terkuat', 'Zzz...', 'Merantau ke Jakarta', 'https://...', 'https://...', 3, FALSE);
```

Upload student photos to the `student-photos` bucket, then use the generated public URLs.

**Quick photo upload:**
```bash
# In Supabase Storage, upload via Dashboard UI
# Public URL format: https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/student-photos/filename.jpg
```

---

## ☁️ Deploy to Vercel (Free Tier)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial MTK Wajib Archive"
git remote add origin https://github.com/yourusername/mtk-wajib-archive.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add all environment variables from `.env.local`

### 3. Deploy

Click **Deploy** — done! 🎉

Your archive will be live at `https://mtk-wajib-archive.vercel.app`

---

## 🔐 Security Model

```
Public (no passcode needed):
  ✅ View students roster
  ✅ Browse gallery
  ✅ Read confession board
  ✅ See countdown timer

Requires CLASS_PASSCODE:
  🔒 Upload photos/videos
  🔒 Post confession notes
  🔒 Submit time capsule message
```

The passcode **never touches the client** — it's validated inside Next.js Server Actions using `process.env.CLASS_PASSCODE`, which is only available server-side.

---

## 🗄️ Database Schema Summary

```
students
  id, name, custom_title, quote, destination,
  photo_class_url, photo_grad_url, class_number, is_featured

gallery_media
  id, storage_path, storage_url, media_type (image|video),
  mime_type, caption, category, uploaded_by,
  width, height, file_size_bytes

confessions
  id, content, color (yellow|pink|lavender),
  x_pos, y_pos, rotation_deg

time_capsule
  id, author_name, content, unlock_at,
  is_locked (computed), created_at
```

**Key RLS rule:**
```sql
-- Time capsule: content is INVISIBLE until 2031-07-01
CREATE POLICY "capsule_read_unlocked" ON time_capsule
  FOR SELECT USING (NOW() >= unlock_at);
```

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| `void` | `#08080e` | Page background |
| `surface` | `#0f0f18` | Section backgrounds |
| `card` | `#16161f` | Card backgrounds |
| `gold` | `#f5c842` | Primary accent, CTAs |
| `coral` | `#e8856a` | Secondary accent, destinations |
| `lavender` | `#9b8fd4` | Tertiary accent |
| `ink` | `#f0ece4` | Primary text |
| `muted` | `#6b6b85` | Secondary text |
| Font Display | Playfair Display | Headings, titles |
| Font Body | DM Sans | Body text, UI |
| Font Mono | JetBrains Mono | Labels, badges, code |

---

## 🔧 Customization Checklist

- [ ] Replace Spotify playlist ID in `.env.local`
- [ ] Set `CLASS_PASSCODE` to something only classmates know
- [ ] Upload student photos to `student-photos` bucket
- [ ] Insert all student records into `students` table
- [ ] Update capsule unlock date if 2031-07-01 isn't the reunion date
- [ ] Add `og:image` (1200×630) for social sharing
- [ ] Set custom domain in Vercel dashboard

---

## 📝 Notes

- **Free Tier Limits:** Vercel free tier supports 100GB bandwidth/month. Supabase free tier: 500MB DB, 1GB storage, 2GB bandwidth. More than enough for a class archive.
- **Video Support:** MP4 videos are served directly from Supabase Storage CDN. Keep videos under 50MB for best performance.
- **ISR:** The page revalidates every 60 seconds (`export const revalidate = 60`) so new uploads appear automatically without full rebuild.
- **Firebase Config:** If you need to migrate to Firebase, the Server Actions pattern stays the same — swap `createAdminClient()` for `admin.firestore()` and replace storage calls with Firebase Storage SDK.

---

*MTK Wajib Archive — Built with ❤️ for Angkatan 2026. Semoga sukses semua! 🚀*
