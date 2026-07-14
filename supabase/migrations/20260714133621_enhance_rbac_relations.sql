-- ==========================================================
-- 1. Tambah Kolom email pada user_roles & Sinkronisasi Data
-- ==========================================================
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill data email yang sudah ada dari auth.users
UPDATE user_roles ur 
SET email = au.email 
FROM auth.users au 
WHERE ur.user_id = au.id;

-- ==========================================================
-- 2. Hubungkan FK ke user_roles untuk Mempermudah Join Query
-- ==========================================================
ALTER TABLE spatial_nodes DROP CONSTRAINT IF EXISTS fk_spatial_nodes_created_by_user_roles;
ALTER TABLE spatial_nodes 
  ADD CONSTRAINT fk_spatial_nodes_created_by_user_roles 
  FOREIGN KEY (created_by) REFERENCES user_roles(user_id) ON DELETE SET NULL;

ALTER TABLE locations DROP CONSTRAINT IF EXISTS fk_locations_created_by_user_roles;
ALTER TABLE locations 
  ADD CONSTRAINT fk_locations_created_by_user_roles 
  FOREIGN KEY (created_by) REFERENCES user_roles(user_id) ON DELETE SET NULL;

-- ==========================================================
-- 3. Izinkan User Biasa Mengunggah Foto 360 (Insert spatial_nodes)
-- ==========================================================
DROP POLICY IF EXISTS "Admins/Superadmins can insert spatial_nodes" ON spatial_nodes;

CREATE POLICY "Authenticated users can insert spatial_nodes" 
  ON spatial_nodes FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('user', 'admin', 'superadmin')
    )
  );
