-- 1. Create ENUM for roles
-- (Jika enum sudah ada, hapus baris ini atau jalankan query baru khusus untuk RLS)
CREATE TYPE user_role_type AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'user'
);

-- 3. Create locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create spatial_nodes table
CREATE TABLE spatial_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  longitude FLOAT8 NOT NULL,
  latitude FLOAT8 NOT NULL,
  image_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  capture_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spatial_nodes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies (READ ONLY / ORIGINAL)

-- Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Public can read locations
CREATE POLICY "Public can read locations"
  ON locations
  FOR SELECT
  TO public
  USING (true);

-- Public can read published spatial nodes
CREATE POLICY "Public can read published nodes"
  ON spatial_nodes
  FOR SELECT
  TO public
  USING (is_published = true);


-- ============================================================================
-- 7. PERBAIKAN RLS: TAMBAHAN AKSES UNTUK ADMIN (INSERT, UPDATE, DELETE)
-- ============================================================================

-- Admin dapat melakukan semua hal (Insert, Update, Delete, Select) pada lokasi
CREATE POLICY "Admins can manage locations"
  ON locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin dapat melakukan semua hal (Insert, Update, Delete, Select) pada node
-- Ini juga memungkinkan admin untuk melihat (Select) node yang is_published = false
CREATE POLICY "Admins can manage spatial_nodes"
  ON spatial_nodes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

  -- Memberikan akses HANYA UNTUK MENAMBAH DATA (Insert) kepada User biasa untuk tabel locations
CREATE POLICY "Users can insert locations"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'user'
    )
  );

-- Memberikan akses HANYA UNTUK MENAMBAH DATA (Insert) kepada User biasa untuk tabel spatial_nodes
CREATE POLICY "Users can insert spatial_nodes"
  ON spatial_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'user'
    )
  );