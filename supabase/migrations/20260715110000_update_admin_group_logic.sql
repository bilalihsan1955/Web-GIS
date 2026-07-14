-- ==========================================================
-- Pembaruan RLS: Mengizinkan Co-Admin untuk berbagi Grup dengan Admin Utama
-- Memperbarui fungsi get_admin_group_id
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
    IF p_id IS NOT NULL THEN
      RETURN p_id; -- Co-Admin merujuk ke admin utamanya (Pemilik)
    ELSE
      RETURN u_id; -- Admin Utama adalah ketua grupnya sendiri
    END IF;
  ELSIF r = 'user' THEN
    RETURN p_id; -- User merujuk ke admin induknya
  ELSE
    RETURN NULL; -- Superadmin tidak memiliki admin grup (bypass)
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
