-- ==========================================
-- 2. Tambah Kolom Kepemilikan Data (created_by)
-- ==========================================
-- Menggunakan default `auth.uid()` agar terisi otomatis dari session token Supabase
ALTER TABLE locations 
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE spatial_nodes 
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==========================================
-- 3. Bersihkan Kebijakan RLS Lama
-- ==========================================
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Public can read locations" ON locations;
DROP POLICY IF EXISTS "Public can read published nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Admins can manage locations" ON locations;
DROP POLICY IF EXISTS "Admins can manage spatial_nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Users can insert locations" ON locations;
DROP POLICY IF EXISTS "Users can insert spatial_nodes" ON spatial_nodes;

-- ==========================================
-- 4. Terapkan Kebijakan RLS Baru
-- ==========================================

--- A. Tabel `user_roles` ---
-- Pengguna biasa hanya bisa membaca rolenya sendiri. Superadmin bisa melihat dan mengelola semua peran.
CREATE POLICY "Users can read own role" 
  ON user_roles FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
  ));

CREATE POLICY "Superadmins can manage user_roles" 
  ON user_roles FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
  ));

--- B. Tabel `locations` ---
-- Publik bisa membaca semua lokasi
CREATE POLICY "Public can read locations" 
  ON locations FOR SELECT TO public USING (true);

-- Semua pengguna terautentikasi (user, admin, superadmin) bisa menambah lokasi baru
CREATE POLICY "Authenticated users can insert locations" 
  ON locations FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('user', 'admin', 'superadmin')
  ));

-- Superadmin bisa mengedit/menghapus lokasi apa saja. Admin hanya bisa mengedit/menghapus lokasi buatan mereka sendiri.
CREATE POLICY "Manage locations update/delete" 
  ON locations FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') AND created_by = auth.uid())
  );

--- C. Tabel `spatial_nodes` ---
-- Publik membaca node terbit, Superadmin/Admin membaca seluruh node
CREATE POLICY "Read spatial_nodes" 
  ON spatial_nodes FOR SELECT TO public 
  USING (
    is_published = true 
    OR 
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    ))
  );

-- Hanya Admin dan Superadmin yang bisa mengunggah dan menambahkan data peta 360°
CREATE POLICY "Admins/Superadmins can insert spatial_nodes" 
  ON spatial_nodes FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
  ));

-- Superadmin mengelola semua node. Admin mengelola node miliknya sendiri saja.
CREATE POLICY "Manage spatial_nodes update/delete" 
  ON spatial_nodes FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') AND created_by = auth.uid())
  );
