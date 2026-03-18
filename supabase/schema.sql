-- ============================================================
-- MTK WAJIB ARCHIVE — SUPABASE SQL SCHEMA (FIXED)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(120)  NOT NULL,
  custom_title    VARCHAR(80)   NOT NULL,
  quote           TEXT,
  destination     VARCHAR(120),
  photo_class_url TEXT          NOT NULL,
  photo_grad_url  TEXT,
  class_number    SMALLINT,
  is_featured     BOOLEAN       DEFAULT FALSE,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- TABLE: gallery_media
-- ============================================================
CREATE TABLE gallery_media (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path    TEXT          NOT NULL,
  storage_url     TEXT          NOT NULL,
  media_type      VARCHAR(10)   NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type       VARCHAR(60),
  caption         TEXT,
  category        VARCHAR(60)   NOT NULL DEFAULT 'Uncategorized',
  uploaded_by     VARCHAR(80),
  width           INTEGER,
  height          INTEGER,
  file_size_bytes BIGINT,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_gallery_category ON gallery_media(category);
CREATE INDEX idx_gallery_type     ON gallery_media(media_type);
CREATE INDEX idx_gallery_created  ON gallery_media(created_at DESC);

-- ============================================================
-- TABLE: confessions
-- ============================================================
CREATE TABLE confessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content         TEXT        NOT NULL CHECK (char_length(content) <= 300),
  color           VARCHAR(20) NOT NULL DEFAULT 'yellow',
  x_pos           FLOAT       NOT NULL DEFAULT 100,
  y_pos           FLOAT       NOT NULL DEFAULT 100,
  rotation_deg    FLOAT       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_confessions_created ON confessions(created_at DESC);

-- ============================================================
-- TABLE: time_capsule
-- FIXED: hapus GENERATED ALWAYS AS (pakai view sebagai gantinya)
-- ============================================================
CREATE TABLE time_capsule (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_name VARCHAR(80),
  content     TEXT        NOT NULL CHECK (char_length(content) <= 1000),
  unlock_at   TIMESTAMPTZ NOT NULL DEFAULT '2031-07-01 00:00:00+00',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capsule_unlock ON time_capsule(unlock_at);

-- View untuk cek status locked (ganti is_locked generated column)
CREATE VIEW capsule_meta AS
  SELECT
    id,
    author_name,
    unlock_at,
    created_at,
    (NOW() < unlock_at) AS is_locked
  FROM time_capsule;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_public_read" ON students
  FOR SELECT USING (true);

ALTER TABLE gallery_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_public_read" ON gallery_media
  FOR SELECT USING (true);
CREATE POLICY "gallery_service_insert" ON gallery_media
  FOR INSERT WITH CHECK (true);

ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confessions_public_read" ON confessions
  FOR SELECT USING (true);
CREATE POLICY "confessions_insert" ON confessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "confessions_update_position" ON confessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Time capsule: content hanya bisa dibaca setelah unlock_at
ALTER TABLE time_capsule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capsule_read_unlocked" ON time_capsule
  FOR SELECT USING (NOW() >= unlock_at);
CREATE POLICY "capsule_insert" ON time_capsule
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTION: get_capsule_stats (bypass RLS untuk hitung total)
-- ============================================================
CREATE OR REPLACE FUNCTION get_capsule_stats()
RETURNS JSON AS $$
DECLARE
  total_count   INTEGER;
  locked_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count  FROM time_capsule;
  SELECT COUNT(*) INTO locked_count FROM time_capsule WHERE NOW() < unlock_at;
  RETURN json_build_object(
    'total',    total_count,
    'locked',   locked_count,
    'unlocked', total_count - locked_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
