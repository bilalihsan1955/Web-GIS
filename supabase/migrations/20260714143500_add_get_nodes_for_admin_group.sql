-- ==========================================================
-- 1. Buat Fungsi get_nodes_for_admin_group
-- ==========================================================
CREATE OR REPLACE FUNCTION get_nodes_for_admin_group(admin_uuid UUID)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  longitude FLOAT8,
  latitude FLOAT8,
  capture_date DATE,
  location_name TEXT,
  location_description TEXT,
  location_slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sn.id,
    sn.image_url,
    sn.longitude,
    sn.latitude,
    sn.capture_date,
    l.name AS location_name,
    l.description AS location_description,
    l.slug AS location_slug
  FROM spatial_nodes sn
  JOIN locations l ON sn.location_id = l.id
  JOIN user_roles ur ON sn.created_by = ur.user_id
  WHERE sn.is_published = true
    AND (ur.user_id = admin_uuid OR ur.parent_admin_id = admin_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
