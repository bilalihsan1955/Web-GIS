-- ==========================================================
-- 1. Create company_sections table
-- ==========================================================
CREATE TABLE company_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES user_roles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- 2. Add section_id to locations
-- ==========================================================
ALTER TABLE locations ADD COLUMN section_id UUID REFERENCES company_sections(id) ON DELETE SET NULL;

-- ==========================================================
-- 3. Row Level Security for company_sections
-- ==========================================================
ALTER TABLE company_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read group sections" 
  ON company_sections FOR SELECT TO authenticated 
  USING (
    is_superadmin(auth.uid()) OR
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

CREATE POLICY "Public can read sections"
  ON company_sections FOR SELECT TO public
  USING (true);

CREATE POLICY "Manage sections within group" 
  ON company_sections FOR ALL TO authenticated 
  USING (
    is_superadmin(auth.uid()) OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')) 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );

-- ==========================================================
-- 4. Update get_nodes_for_admin_group to use company_sections.name as location_description
-- ==========================================================
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
  existing_slug TEXT;
BEGIN
  -- Coba parsing langsung sebagai UUID
  BEGIN
    resolved_admin_id := admin_identifier::UUID;
  EXCEPTION WHEN OTHERS THEN
    resolved_admin_id := NULL;
  END;

  IF resolved_admin_id IS NOT NULL THEN
    -- Diakses menggunakan UUID
    SELECT company_slug INTO existing_slug FROM user_roles WHERE user_id = resolved_admin_id LIMIT 1;
    IF existing_slug IS NOT NULL THEN
      -- JIKA PUNYA SLUG, TETAPI DIAKSES PAKAI UUID -> TOLAK (Return Empty)
      RETURN;
    END IF;
  ELSE
    -- Jika bukan UUID, cari berdasarkan company_slug di user_roles
    SELECT user_id INTO resolved_admin_id 
    FROM user_roles 
    WHERE company_slug = admin_identifier 
    LIMIT 1;
  END IF;

  -- Jika tidak ditemukan sama sekali, return empty
  IF resolved_admin_id IS NULL THEN
    RETURN;
  END IF;

  -- Kembalikan data
  RETURN QUERY
  SELECT 
    sn.id,
    sn.image_url,
    sn.longitude,
    sn.latitude,
    sn.capture_date,
    l.name AS location_name,
    COALESCE(cs.name, l.description) AS location_description,
    l.slug AS location_slug
  FROM spatial_nodes sn
  JOIN locations l ON sn.location_id = l.id
  LEFT JOIN company_sections cs ON l.section_id = cs.id
  JOIN user_roles ur ON sn.created_by = ur.user_id
  WHERE sn.is_published = true
    AND (ur.user_id = resolved_admin_id OR ur.parent_admin_id = resolved_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
