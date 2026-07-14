-- ==========================================
-- 1. Tambah Peran 'superadmin' ke Enum
-- ==========================================
ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'superadmin';
