-- ==========================================================
-- 1. Tambah Kolom parent_admin_id pada Tabel user_roles
-- ==========================================================
ALTER TABLE user_roles 
  ADD COLUMN IF NOT EXISTS parent_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==========================================================
-- 2. Buat Fungsi Pembantu get_admin_group_id
-- ==========================================================
CREATE OR REPLACE FUNCTION get_admin_group_id(u_id UUID)
RETURNS UUID AS $$
DECLARE
  r user_role_type;
  p_id UUID;
BEGIN
  -- Ambil peran dan admin induk dari user
  SELECT role, parent_admin_id INTO r, p_id FROM user_roles WHERE user_id = u_id;
  
  IF r = 'admin' THEN
    RETURN u_id; -- Admin adalah ketua grupnya sendiri
  ELSIF r = 'user' THEN
    RETURN p_id; -- User merujuk ke admin induknya
  ELSE
    RETURN NULL; -- Superadmin tidak memiliki admin grup (bypass)
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 3. Bersihkan Kebijakan RLS Lama
-- ==========================================================
DROP POLICY IF EXISTS "Public can read locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
DROP POLICY IF EXISTS "Manage locations update/delete" ON locations;
DROP POLICY IF EXISTS "Read spatial_nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Admins/Superadmins can insert spatial_nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Manage spatial_nodes update/delete" ON spatial_nodes;

-- ==========================================================
-- 4. Terapkan RLS Berbasis Grup Spasial
-- ==========================================================

--- A. Tabel `locations` ---
-- Membaca Lokasi:
-- - Superadmin bisa melihat semua lokasi.
-- - Admin & User hanya bisa melihat lokasi milik grup mereka.
CREATE POLICY "Select locations within group" 
  ON locations FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

-- Menambah Lokasi:
-- Semua pengguna terautentikasi bisa menambah lokasi baru untuk grup mereka.
CREATE POLICY "Insert locations within group" 
  ON locations FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('user', 'admin', 'superadmin'))
  );

-- Mengelola Lokasi (Update/Delete):
-- - Superadmin bisa mengelola semua.
-- - Admin bisa mengelola lokasi yang berada di grupnya sendiri.
-- - User biasa tidak bisa mengedit/menghapus lokasi.
CREATE POLICY "Manage locations within group" 
  ON locations FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );

--- B. Tabel `spatial_nodes` ---
-- Membaca Node:
-- Hanya diperbolehkan jika berasal dari grup yang sama.
CREATE POLICY "Select spatial_nodes within group" 
  ON spatial_nodes FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

-- Menambah Node:
-- Hanya Admin & Superadmin dari grup bersangkutan yang bisa mengunggah panorama.
CREATE POLICY "Insert spatial_nodes within group" 
  ON spatial_nodes FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin'))
  );

-- Mengedit/Menghapus Node:
-- Superadmin (Semua) atau Admin (Hanya milik grup sendiri).
CREATE POLICY "Manage spatial_nodes within group" 
  ON spatial_nodes FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );
