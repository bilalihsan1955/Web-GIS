-- ==========================================================
-- 1. Bersihkan Kebijakan SELECT Lama
-- ==========================================================
DROP POLICY IF EXISTS "Select locations within group" ON locations;
DROP POLICY IF EXISTS "Select spatial_nodes within group" ON spatial_nodes;

-- ==========================================================
-- 2. Buat Kebijakan Baru yang Mendukung Data Warisan (created_by IS NULL)
-- ==========================================================
CREATE POLICY "Select locations within group" 
  ON locations FOR SELECT TO authenticated 
  USING (
    is_superadmin(auth.uid())
    OR 
    created_by IS NULL
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

CREATE POLICY "Select spatial_nodes within group" 
  ON spatial_nodes FOR SELECT TO authenticated 
  USING (
    is_superadmin(auth.uid())
    OR 
    created_by IS NULL
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );
