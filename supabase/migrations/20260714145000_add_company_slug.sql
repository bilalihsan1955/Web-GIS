-- ==========================================================
-- 1. Tambahkan Kolom company_slug pada user_roles
-- ==========================================================
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS company_slug TEXT UNIQUE;

-- Backfill company_slug dari email untuk data yang sudah ada
-- Contoh: admin.ub@gis.local -> admin-ub
UPDATE user_roles 
SET company_slug = REPLACE(SPLIT_PART(email, '@', 1), '.', '-')
WHERE company_slug IS NULL AND email IS NOT NULL;

-- ==========================================================
-- 2. Modifikasi Fungsi get_nodes_for_admin_group
-- ==========================================================
-- Hapus fungsi lama dengan tipe argument UUID
DROP FUNCTION IF EXISTS get_nodes_for_admin_group(UUID);

-- Buat fungsi baru dengan argument TEXT yang menerima UUID atau Slug
CREATE OR REPLACE FUNCTION get_nodes_for_admin_group(admin_identifier TEXT)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  longitude FLOAT8,
  latitude FLOAT8,
  capture_date DATE,
  location_name TEXT,
  location_description TEXT,
  location_slug TEXT
) AS $$
DECLARE
  resolved_admin_id UUID;
BEGIN
  -- 1. Coba parsing langsung sebagai UUID
  BEGIN
    resolved_admin_id := admin_identifier::UUID;
  EXCEPTION WHEN OTHERS THEN
    resolved_admin_id := NULL;
  END;

  -- 2. Jika bukan UUID, cari berdasarkan company_slug di user_roles
  IF resolved_admin_id IS NULL THEN
    SELECT user_id INTO resolved_admin_id 
    FROM user_roles 
    WHERE company_slug = admin_identifier 
    LIMIT 1;
  END IF;

  -- 3. Jika tidak ditemukan, return empty
  IF resolved_admin_id IS NULL THEN
    RETURN;
  END IF;

  -- 4. Kembalikan data menggunakan resolved_admin_id
  RETURN QUERY
  SELECT 
    sn.id,
    sn.image_url,
    sn.longitude,
    sn.latitude,
    sn.capture_date,
    l.name AS location_name,
    l.description AS location_description,
    l.slug AS location_slug
  FROM spatial_nodes sn
  JOIN locations l ON sn.location_id = l.id
  JOIN user_roles ur ON sn.created_by = ur.user_id
  WHERE sn.is_published = true
    AND (ur.user_id = resolved_admin_id OR ur.parent_admin_id = resolved_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
