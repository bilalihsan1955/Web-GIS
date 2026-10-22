-- ============================================================================
-- 001_initial_standalone.sql: Full Standalone PostgreSQL Schema for view360 Web-GIS
-- Standalone architecture (Decoupled from Supabase auth.users & RLS)
-- Includes Foreign Keys, Constraints, and B-Tree Composite Indexes for Multi-Tenant Isolation
-- ============================================================================

-- 1. Enable UUID Extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Standalone Users Table (Replacing auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. User Roles & Hierarchical Tenant Metadata Table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'user')),
  parent_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_name TEXT,
  company_description TEXT,
  company_logo TEXT,
  company_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Company Sections Table
CREATE TABLE IF NOT EXISTS company_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  section_id UUID REFERENCES company_sections(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Spatial Nodes Table (360 Photo Hotspots)
CREATE TABLE IF NOT EXISTS spatial_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  longitude FLOAT8 NOT NULL,
  latitude FLOAT8 NOT NULL,
  image_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  capture_date DATE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Company Boundaries Table (Polygon Shapefile / GeoJSON Layers)
CREATE TABLE IF NOT EXISTS company_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geojson JSONB NOT NULL,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  opacity FLOAT NOT NULL DEFAULT 0.35,
  total_area_ha FLOAT NOT NULL DEFAULT 0,
  feature_count INT NOT NULL DEFAULT 1,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- B-TREE COMPOSITE & TARGETED INDEXES FOR HIGH-CONCURRENCY MULTI-TENANT QUERYING
-- ============================================================================

-- Spatial Nodes Multi-Tenant & Published Status
CREATE INDEX IF NOT EXISTS idx_spatial_nodes_created_by_loc ON spatial_nodes(created_by, location_id);
CREATE INDEX IF NOT EXISTS idx_spatial_nodes_is_published ON spatial_nodes(is_published);
CREATE INDEX IF NOT EXISTS idx_spatial_nodes_location_id ON spatial_nodes(location_id);

-- Locations Multi-Tenant & Section Matching
CREATE INDEX IF NOT EXISTS idx_locations_created_by_sec ON locations(created_by, section_id);
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);
CREATE INDEX IF NOT EXISTS idx_locations_section_id ON locations(section_id);

-- Sections Multi-Tenant Filtering
CREATE INDEX IF NOT EXISTS idx_company_sections_created_by ON company_sections(created_by);

-- Boundaries Multi-Tenant & Visibility
CREATE INDEX IF NOT EXISTS idx_company_boundaries_created_by_vis ON company_boundaries(created_by, is_visible);

-- User Roles Hierarchical RBAC & Slug Routing
CREATE INDEX IF NOT EXISTS idx_user_roles_parent_admin_role ON user_roles(parent_admin_id, role);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_slug ON user_roles(company_slug);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
