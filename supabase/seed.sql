-- ============================================================
-- SEED DATA — Contoh data siswa
-- Jalankan di SQL Editor SETELAH schema.sql berhasil
-- Ganti foto URL dengan link foto asli dari bucket student-photos
-- ============================================================

INSERT INTO students (name, custom_title, quote, destination, photo_class_url, photo_grad_url, class_number, is_featured)
VALUES
  (
    'Rafi Ardana',
    'Suhu Integral',
    'MTK susah, tapi hidup lebih susah. Alhamdulillah lulus.',
    'Unila — Teknik Sipil',
    'https://osgvskrmmubuityxagbn.supabase.co/storage/v1/object/public/student-photos/rafi-class.jpg',
    'https://osgvskrmmubuityxagbn.supabase.co/storage/v1/object/public/student-photos/rafi-grad.jpg',
    1,
    TRUE
  ),
  (
    'Siti Nurhaliza',
    'Ratu Presentasi',
    'Semua pasti bisa, asal mau usaha dan jangan lupa tidur.',
    'Itera — Arsitektur',
    'https://osgvskrmmubuityxagbn.supabase.co/storage/v1/object/public/student-photos/siti-class.jpg',
    'https://osgvskrmmubuityxagbn.supabase.co/storage/v1/object/public/student-photos/siti-grad.jpg',
    2,
    FALSE
  ),
  (
    'Budi Santoso',
    'Tidur Terkuat',
    'Zzz... eh udah wisuda.',
    'Merantau ke Jakarta',
    'https://osgvskrmmubuityxagbn.supabase.co/storage/v1/object/public/student-photos/budi-class.jpg',
    'https://osgvskrmmubuityxagbn.supabase.co/storage/v1/object/public/student-photos/budi-grad.jpg',
    3,
    FALSE
  );

-- ============================================================
-- Cara tambah siswa baru:
-- Copy salah satu blok di atas, ganti semua nilainya
-- Upload foto ke Storage bucket "student-photos" dulu
-- lalu pakai URL publiknya di photo_class_url / photo_grad_url
-- ============================================================
