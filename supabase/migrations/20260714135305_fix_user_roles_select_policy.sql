-- ==========================================================
-- 1. Bersihkan Kebijakan SELECT Lama pada user_roles
-- ==========================================================
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;

-- ==========================================================
-- 2. Terapkan Kebijakan SELECT Baru yang Mendukung Grup Spasial
-- ==========================================================
CREATE POLICY "Users can read own role" 
  ON user_roles FOR SELECT TO authenticated 
  USING (
    auth.uid() = user_id 
    OR 
    is_superadmin(auth.uid())
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(user_id)
  );
