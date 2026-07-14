-- ==========================================================
-- Add company profile columns to user_roles
-- ==========================================================
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS company_logo TEXT;
