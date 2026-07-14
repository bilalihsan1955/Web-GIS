-- ==========================================================
-- 1. Tambah Kebijakan SELECT untuk Publik (Guest)
-- ==========================================================
CREATE POLICY "Public can read locations" 
  ON locations FOR SELECT TO public 
  USING (true);

CREATE POLICY "Public can read published nodes" 
  ON spatial_nodes FOR SELECT TO public 
  USING (is_published = true);
