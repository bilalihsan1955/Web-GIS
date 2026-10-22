-- ============================================================================
-- database/seed.sql: Idempotent Database Seeder for view360 Web-GIS
-- Safe for repeated execution (ON CONFLICT DO NOTHING)
-- Default Dev/Test Credentials:
-- Superadmin: superadmin@view360.com / SuperAdmin123! (bcrypt cost 12 hash: $2b$12$Hc4p4bsR45oJQDPXIDWLwuDg9DIUqfn1cR76.jiXL8Hg7ycdlR0bm)
-- ============================================================================

-- 1. Insert Initial Superadmin User
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'superadmin@view360.com',
  '$2b$12$Hc4p4bsR45oJQDPXIDWLwuDg9DIUqfn1cR76.jiXL8Hg7ycdlR0bm',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Insert Superadmin User Role
INSERT INTO user_roles (user_id, email, role, parent_admin_id, company_name, company_description, company_slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'superadmin@view360.com',
  'superadmin',
  NULL,
  'Web-GIS Platform Admin',
  'Master Platform Administrator',
  'platform-admin',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Insert Demo Company Admin (PT Nusantara GIS)
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@nusantara-gis.com',
  '$2b$12$Hc4p4bsR45oJQDPXIDWLwuDg9DIUqfn1cR76.jiXL8Hg7ycdlR0bm',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO user_roles (user_id, email, role, parent_admin_id, company_name, company_description, company_slug, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@nusantara-gis.com',
  'admin',
  NULL,
  'PT Nusantara GIS',
  'Solusi Pemetaan Spasial 360 Indonesia',
  'nusantara-gis',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Insert Demo Field Staff for PT Nusantara GIS
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'staf@nusantara-gis.com',
  '$2b$12$Hc4p4bsR45oJQDPXIDWLwuDg9DIUqfn1cR76.jiXL8Hg7ycdlR0bm',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO user_roles (user_id, email, role, parent_admin_id, company_name, company_description, company_slug, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'staf@nusantara-gis.com',
  'user',
  '11111111-1111-1111-1111-111111111111',
  'PT Nusantara GIS',
  'Staff Lapangan Surveyor',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Insert Demo Company Sections
INSERT INTO company_sections (id, created_by, name, created_at, updated_at)
VALUES 
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Sektor Tambang Utama', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Area Reklamasi Hutan', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Demo Locations
INSERT INTO locations (id, name, slug, description, section_id, created_by, created_at, updated_at)
VALUES 
  ('44444444-4444-4444-4444-444444444441', 'Pos Pemantauan Titik A1', 'pos-pemantauan-titik-a1-11111111', 'Titik pantau elevasi barat daya', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444442', 'Jalur Logistik Utama KM 12', 'jalur-logistik-utama-km-12-11111111', 'Gerbang akses kendaraan angkut', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Demo Spatial Nodes (360 Nodes)
INSERT INTO spatial_nodes (id, location_id, longitude, latitude, image_url, is_published, capture_date, created_by, created_at, updated_at)
VALUES 
  ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 117.1536, -0.5021, '/uploads/1785598121161_IMG_20260714_075842_00_594.jpg', true, '2026-10-01', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444442', 117.1582, -0.4998, '/uploads/1785598121171_IMG_20260716_075738_00_640.jpg', true, '2026-10-02', '11111111-1111-1111-1111-111111111111', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url;

-- 8. Insert Demo Company Boundary (Sample Polygon)
INSERT INTO company_boundaries (id, created_by, name, geojson, color, opacity, total_area_ha, feature_count, is_visible, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666661',
  '11111111-1111-1111-1111-111111111111',
  'IUP Tambang Blok Timur',
  '{
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "Blok Timur", "zone": "A" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [117.145, -0.510],
              [117.165, -0.510],
              [117.165, -0.490],
              [117.145, -0.490],
              [117.145, -0.510]
            ]
          ]
        }
      }
    ]
  }'::jsonb,
  '#06b6d4',
  0.35,
  441.2,
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
