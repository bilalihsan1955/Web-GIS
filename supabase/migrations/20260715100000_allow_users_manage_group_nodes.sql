-- ==========================================================
-- Pembaruan RLS: Izinkan pengguna (user) untuk mengedit/menghapus 
-- node dan lokasi di dalam grup perusahaannya sendiri
-- ==========================================================

DROP POLICY IF EXISTS "Manage locations within group" ON locations;
CREATE POLICY "Manage locations within group" 
  ON locations FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'user')) 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );

DROP POLICY IF EXISTS "Manage spatial_nodes within group" ON spatial_nodes;
CREATE POLICY "Manage spatial_nodes within group" 
  ON spatial_nodes FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'user')) 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );
