-- ==========================================================
-- 1. Buat Fungsi helper SECURITY DEFINER untuk mengecek role
-- ==========================================================
CREATE OR REPLACE FUNCTION is_superadmin(u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = u_id AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 2. Bersihkan Kebijakan RLS Lama pada user_roles
-- ==========================================================
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Superadmins can manage user_roles" ON user_roles;

-- ==========================================================
-- 3. Terapkan RLS Baru Menggunakan Fungsi Helper Non-Rekursif
-- ==========================================================
CREATE POLICY "Users can read own role" 
  ON user_roles FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can manage user_roles" 
  ON user_roles FOR ALL TO authenticated 
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));
