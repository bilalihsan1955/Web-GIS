-- ==========================================================
-- Create company_boundaries table for polygon shapefile / geojson boundary layers
-- ==========================================================
CREATE TABLE IF NOT EXISTS company_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES user_roles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geojson JSONB NOT NULL,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  opacity FLOAT NOT NULL DEFAULT 0.35,
  total_area_ha FLOAT NOT NULL DEFAULT 0,
  feature_count INT NOT NULL DEFAULT 1,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE company_boundaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read group boundaries" ON company_boundaries;
CREATE POLICY "Users can read group boundaries" 
  ON company_boundaries FOR SELECT TO authenticated 
  USING (
    is_superadmin(auth.uid()) OR
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

DROP POLICY IF EXISTS "Public can read boundaries" ON company_boundaries;
CREATE POLICY "Public can read boundaries"
  ON company_boundaries FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Manage boundaries within group" ON company_boundaries;
CREATE POLICY "Manage boundaries within group" 
  ON company_boundaries FOR ALL TO authenticated 
  USING (
    is_superadmin(auth.uid()) OR
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );
