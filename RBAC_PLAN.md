# Rencana Implementasi: Role-Based Access Control (RBAC) 3-Role & Isolasi Data

Dokumen ini berisi rencana teknis untuk meningkatkan sistem hak akses (RBAC) dari 2 peran (`admin`, `user`) menjadi 3 peran (`superadmin`, `admin`, `user`) dengan pemisahan kepemilikan data stasiun antara Admin.

---

## 1. Spesifikasi Matriks Peran & Izin

| Hak Akses / Fitur | Super Admin | Admin | User | Guest / Publik |
| :--- | :---: | :---: | :---: | :---: |
| **Melihat Peta 3D (Published Nodes)** | Ya | Ya | Ya | Ya |
| **Melihat Peta 3D (Draft/Unpublished)**| Ya | Ya (Semua) | Tidak | Tidak |
| **Melihat Sidebar & Detail Node** | Ya | Ya | Ya | Ya |
| **Membuka Detail Visual 360°** | Ya | Ya | Ya | Ya |
| **Menambah Data Lokasi Baru** | Ya | Ya | Ya (Konstruksi) | Tidak |
| **Mengunggah & Menambah 360 Map** | Ya | Ya | Tidak | Tidak |
| **Mengedit/Menghapus Lokasi & Node** | Ya (Semua) | Ya (Milik Sendiri) | Tidak | Tidak |
| **Mengelola Pengguna & Mengubah Peran**| Ya (Semua) | Tidak | Tidak | Tidak |

---

## 2. Langkah 1: Membuat File Migrasi di Lokal (Supabase CLI)

Sebelum mengeksekusi langsung ke production/remote Supabase, sangat direkomendasikan untuk membuat berkas migrasi baru secara lokal terlebih dahulu agar sinkron dengan version control (Git).

1. **Membuat berkas migrasi kosong baru**:
   Jalankan perintah berikut di direktori utama terminal Anda:
   ```bash
   npx supabase migration new add_rbac_roles
   ```
   Perintah ini akan membuat berkas SQL baru dengan format nama `supabase/migrations/<timestamp>_add_rbac_roles.sql`.

2. **Isi berkas migrasi baru tersebut**:
   Buka berkas `<timestamp>_add_rbac_roles.sql` yang baru dibuat dan tempelkan seluruh kode SQL di bawah ini:

```sql
-- ==========================================
-- 1. Tambah Peran 'superadmin' ke Enum
-- ==========================================
ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'superadmin';

-- ==========================================
-- 2. Tambah Kolom Kepemilikan Data (created_by)
-- ==========================================
-- Menggunakan default `auth.uid()` agar terisi otomatis dari session token Supabase
ALTER TABLE locations 
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE spatial_nodes 
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==========================================
-- 3. Bersihkan Kebijakan RLS Lama
-- ==========================================
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Public can read locations" ON locations;
DROP POLICY IF EXISTS "Public can read published nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Admins can manage locations" ON locations;
DROP POLICY IF EXISTS "Admins can manage spatial_nodes" ON spatial_nodes;
DROP POLICY IF EXISTS "Users can insert locations" ON locations;
DROP POLICY IF EXISTS "Users can insert spatial_nodes" ON spatial_nodes;

-- ==========================================
-- 4. Terapkan Kebijakan RLS Baru
-- ==========================================

--- A. Tabel `user_roles` ---
-- Pengguna biasa hanya bisa membaca rolenya sendiri. Superadmin bisa melihat dan mengelola semua peran.
CREATE POLICY "Users can read own role" 
  ON user_roles FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
  ));

CREATE POLICY "Superadmins can manage user_roles" 
  ON user_roles FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
  ));

--- B. Tabel `locations` ---
-- Publik bisa membaca semua lokasi
CREATE POLICY "Public can read locations" 
  ON locations FOR SELECT TO public USING (true);

-- Semua pengguna terautentikasi (user, admin, superadmin) bisa menambah lokasi baru
CREATE POLICY "Authenticated users can insert locations" 
  ON locations FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('user', 'admin', 'superadmin')
  ));

-- Superadmin bisa mengedit/menghapus lokasi apa saja. Admin hanya bisa mengedit/menghapus lokasi buatan mereka sendiri.
CREATE POLICY "Manage locations update/delete" 
  ON locations FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') AND created_by = auth.uid())
  );

--- C. Tabel `spatial_nodes` ---
-- Publik membaca node terbit, Superadmin/Admin membaca seluruh node
CREATE POLICY "Read spatial_nodes" 
  ON spatial_nodes FOR SELECT TO public 
  USING (
    is_published = true 
    OR 
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    ))
  );

-- Hanya Admin dan Superadmin yang bisa mengunggah dan menambahkan data peta 360°
CREATE POLICY "Admins/Superadmins can insert spatial_nodes" 
  ON spatial_nodes FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
  ));

-- Superadmin mengelola semua node. Admin mengelola node miliknya sendiri saja.
CREATE POLICY "Manage spatial_nodes update/delete" 
  ON spatial_nodes FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin')
    OR 
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin') AND created_by = auth.uid())
  );
```

3. **Menerapkan Migrasi ke Database Supabase Remote**:
   Setelah yakin dengan perubahan lokal, Anda dapat menerapkan migrasi lokal ini ke database Supabase production Anda dengan menjalankan:
   ```bash
   npx supabase db push
   ```

---

## 3. Langkah 2: Pembaruan API Route Handlers (Next.js)

Kita perlu menyesuaikan pengecekan otorisasi di tingkat server API Next.js.

### A. Endpoint `/api/dashboard/users/route.ts` (Manajemen Pengguna)
Ubah pengecekan otorisasi agar hanya **`superadmin`** yang diizinkan untuk melihat, mengubah peran, atau menghapus pengguna.

```typescript
// Ganti baris pengecekan berikut:
const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
if (roleData?.role !== 'superadmin') {
  return NextResponse.json({ error: 'Forbidden: Requires Super Admin privileges' }, { status: 403 });
}
```

### B. Endpoint `/api/dashboard/create-user/route.ts` (Pembuatan Pengguna Baru)
Ubah pengecekan otorisasi agar hanya **`superadmin`** yang dapat membuat akun pengguna baru di dashboard admin.

---

## 4. Langkah 3: Pembaruan UI Dashboard & Menu Otorisasi

### A. Halaman Dashboard Pengguna (`app/dashboard/users/page.tsx`)
* Proteksi halaman secara penuh di sisi klien. Jika user yang login memiliki role `admin` (dan bukan `superadmin`), lakukan redirect otomatis ke halaman `/dashboard` utama.
* Tambahkan menu dropdown bertuliskan `superadmin` saat mengubah peran pengguna.

### B. Halaman Upload (`SmartUploader.tsx`)
* Tambahkan kondisi untuk hanya memperbolehkan render/akses fitur upload stasiun panorama 360° jika user memiliki role `admin` atau `superadmin`.

### C. Tabel CRUD Dashboard Utama (`app/dashboard/page.tsx`)
* Sembunyikan tombol **Edit** (ikon pensil) dan **Delete** (ikon tempat sampah) pada tabel stasiun jika user login berstatus `admin` dan bukan pembuat data tersebut (`created_by !== loggedInUserId`).
* Superadmin tetap dapat melihat dan menekan semua tombol aksi.

---

## 5. Rencana Pengujian (Testing Plan)
1. **Uji Coba Guest**: Pastikan pengguna tanpa login hanya dapat melihat stasiun bertanda `is_published = true` dan tidak bisa mengakses `/dashboard`.
2. **Uji Coba User Biasa**: Hubungkan akun berstatus `user`, coba tambahkan data lokasi, dan pastikan form upload panorama 360° diblokir.
3. **Uji Coba Admin A vs Admin B**:
   - Buat Admin A mengunggah stasiun baru.
   - Login sebagai Admin B, pastikan stasiun buatan Admin A terlihat di tabel tetapi tombol Edit/Delete-nya dinonaktifkan atau disembunyikan.
4. **Uji Coba Superadmin**: Pastikan dapat mengubah peran akun lain dari `user` menjadi `admin` atau `superadmin` dan dapat mengedit/menghapus seluruh stasiun.
