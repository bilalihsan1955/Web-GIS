# Rencana Implementasi: Hierarchical RBAC & Isolasi Data antar-Grup Admin

Dokumen ini berisi rencana teknis untuk menambahkan relasi hirarkis antara `user` dan `admin`, menerapkan kebijakan isolasi data (Row Level Security) antar-grup admin, serta menyiapkan seeding data pengujian untuk grup Admin UB (Universitas Brawijaya) dan Admin UM (Universitas Negeri Malang).

---

## 1. Konsep Isolasi Data Hirarkis

Untuk mengelompokkan pengguna, kita akan menambahkan relasi `parent_admin_id` pada tabel `user_roles`. 

* Setiap **User** akan terhubung ke salah satu **Admin** melalui `parent_admin_id`.
* Setiap data (`locations` atau `spatial_nodes`) memiliki pemilik (`created_by`).
* Kita akan menggunakan fungsi SQL `get_admin_group_id(user_id)` untuk mendeteksi ID Admin utama dari pengguna tersebut.
* **Aturan Otorisasi (RLS):**
  - **Super Admin** dapat membaca dan mengelola **seluruh** data tanpa batasan.
  - **Admin & User** hanya dapat membaca atau menulis data jika `get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)`.
  - Ini memastikan Admin UB dan seluruh User di bawahnya berada dalam satu grup data dan tidak bisa melihat data milik grup Admin UM.

---

## 2. Langkah 1: Skema Database & Migrasi Lokal (Supabase CLI)

1. **Jalankan perintah untuk membuat migrasi baru**:
   ```bash
   npx supabase migration new add_hierarchical_rbac
   ```

2. **Isi berkas migrasi baru tersebut dengan kode SQL berikut**:

```sql
-- ==========================================================
-- 1. Tambah Kolom parent_admin_id pada Tabel user_roles
-- ==========================================================
ALTER TABLE user_roles 
  ADD COLUMN IF NOT EXISTS parent_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==========================================================
-- 2. Buat Fungsi Pembantu get_admin_group_id
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
    RETURN u_id; -- Admin adalah ketua grupnya sendiri
  ELSIF r = 'user' THEN
    RETURN p_id; -- User merujuk ke admin induknya
  ELSE
    RETURN NULL; -- Superadmin tidak memiliki admin grup (bypass)
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 3. Bersihkan Kebijajan RLS Lama
-- ==========================================================
DROP POLICY IF EXISTS "Public can read locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
DROP POLICY IF EXISTS "Manage locations update/delete" ON locations;
DROP POLICY IF EXISTS "Read spatial_nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Admins/Superadmins can insert spatial_nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Manage spatial_nodes update/delete" ON spatial_nodes;

-- ==========================================================
-- 4. Terapkan RLS Berbasis Grup Spasial
-- ==========================================================

--- A. Tabel `locations` ---
-- Membaca Lokasi:
-- - Superadmin bisa melihat semua lokasi.
-- - Admin & User hanya bisa melihat lokasi milik grup mereka.
CREATE POLICY "Select locations within group" 
  ON locations FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

-- Menambah Lokasi:
-- Semua pengguna terautentikasi bisa menambah lokasi baru untuk grup mereka.
CREATE POLICY "Insert locations within group" 
  ON locations FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('user', 'admin', 'superadmin'))
  );

-- Mengelola Lokasi (Update/Delete):
-- - Superadmin bisa mengelola semua.
-- - Admin bisa mengelola lokasi yang berada di grupnya sendiri.
-- - User biasa tidak bisa mengedit/menghapus lokasi.
CREATE POLICY "Manage locations within group" 
  ON locations FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );

--- B. Tabel `spatial_nodes` ---
-- Membaca Node:
-- Hanya diperbolehkan jika berasal dari grup yang sama.
CREATE POLICY "Select spatial_nodes within group" 
  ON spatial_nodes FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    get_admin_group_id(auth.uid()) = get_admin_group_id(created_by)
  );

-- Menambah Node:
-- Hanya Admin & Superadmin dari grup bersangkutan yang bisa mengunggah panorama.
CREATE POLICY "Insert spatial_nodes within group" 
  ON spatial_nodes FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin'))
  );

-- Mengedit/Menghapus Node:
-- Superadmin (Semua) atau Admin (Hanya milik grup sendiri).
CREATE POLICY "Manage spatial_nodes within group" 
  ON spatial_nodes FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') 
     AND get_admin_group_id(auth.uid()) = get_admin_group_id(created_by))
  );
```

---

## 3. Langkah 2: Pembuatan Seeding Script untuk UB dan UM

Kita akan membuat route API baru di `/api/seed-hierarchy` yang secara dinamis:
1. Membuat akun **Admin UB** (`admin.ub@gis.local`) dan mengaitkan 5 akun **User UB** (`user1.ub@gis.local` s.d `user5.ub@gis.local`) dengan `parent_admin_id` merujuk ke Admin UB.
2. Membuat akun **Admin UM** (`admin.um@gis.local`) dan mengaitkan 3 akun **User UM** (`user1.um@gis.local` s.d `user3.um@gis.local`) dengan `parent_admin_id` merujuk ke Admin UM.
3. Password default untuk UB adalah `UserUB123$` / `AdminUB123$` dan untuk UM adalah `UserUM123$` / `AdminUM123$`.

Skrip ini akan dibuat pada berkas **`app/api/seed-hierarchy/route.ts`**.
