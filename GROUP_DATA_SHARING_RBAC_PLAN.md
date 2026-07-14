# Rencana Implementasi: Sinkronisasi Identitas, Otorisasi Grup Dinamis, & Delegasi Pembuatan User

Dokumen ini berisi rencana teknis untuk menambahkan sinkronisasi email ke tabel `user_roles`, memodifikasi kebijakan RLS agar User biasa dapat mengunggah foto 360°, mengizinkan Admin membuat akun User baru untuk kelompoknya sendiri, serta menampilkan identitas pembuat data di dashboard.

---

## 1. Perubahan Struktur Database & RLS

### A. Sinkronisasi Email & Foreign Keys
Untuk menampilkan email pembuat data dan induk admin di dashboard klien tanpa melanggar kebijakan privasi Supabase Auth, kita akan menyimpan email di tabel `user_roles` dan menambahkan relasi kunci asing (Foreign Key).

1. **Jalankan perintah untuk membuat migrasi baru**:
   ```bash
   npx supabase migration new enhance_rbac_relations
   ```

2. **Isi berkas migrasi baru tersebut dengan skrip SQL berikut**:

```sql
-- ==========================================================
-- 1. Tambah Kolom email pada user_roles & Sinkronisasi Data
-- ==========================================================
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill data email yang sudah ada dari auth.users
UPDATE user_roles ur 
SET email = au.email 
FROM auth.users au 
WHERE ur.user_id = au.id;

-- ==========================================================
-- 2. Hubungkan FK ke user_roles untuk Mempermudah Join Query
-- ==========================================================
ALTER TABLE spatial_nodes DROP CONSTRAINT IF EXISTS fk_spatial_nodes_created_by_user_roles;
ALTER TABLE spatial_nodes 
  ADD CONSTRAINT fk_spatial_nodes_created_by_user_roles 
  FOREIGN KEY (created_by) REFERENCES user_roles(user_id) ON DELETE SET NULL;

ALTER TABLE locations DROP CONSTRAINT IF EXISTS fk_locations_created_by_user_roles;
ALTER TABLE locations 
  ADD CONSTRAINT fk_locations_created_by_user_roles 
  FOREIGN KEY (created_by) REFERENCES user_roles(user_id) ON DELETE SET NULL;

-- ==========================================================
-- 3. Izinkan User Biasa Mengunggah Foto 360 (Insert spatial_nodes)
-- ==========================================================
DROP POLICY IF EXISTS "Admins/Superadmins can insert spatial_nodes" ON spatial_nodes;

CREATE POLICY "Authenticated users can insert spatial_nodes" 
  ON spatial_nodes FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('user', 'admin', 'superadmin')
    )
  );
```

---

## 2. Pembaruan Endpoint Pembuatan Pengguna `/api/dashboard/create-user/route.ts`

Kita akan mengubah hak pembuatan akun agar:
1. **Super Admin**: Bisa membuat akun dengan peran apapun (`superadmin`, `admin`, `user`) dan menentukan `parent_admin_id` secara bebas.
2. **Admin**: Bisa membuat akun pengguna baru. Perannya **dipaksa** menjadi `'user'`, dan `parent_admin_id` otomatis diisi dengan ID Admin tersebut.
3. Simpan email pengguna baru di kolom `email` pada tabel `user_roles`.

---

## 3. Penyesuaian UI Dashboard Utama & Visualisasi Peta

### A. Dashboard Utama (`app/dashboard/page.tsx`)
1. **Peta & Pipeline Upload**: Tampilkan **Upload Pipeline** (SmartUploader) untuk semua pengguna terautentikasi (termasuk `user`).
2. **Direktori Stasiun**:
   - Tambahkan kolom baru **Uploaded By** pada tabel.
   - Kolom ini menampilkan email pembuat data. Jika pembuat data adalah User biasa, tampilkan informasi Admin induknya (Contoh: `user1.ub@gis.local (Admin: admin.ub@gis.local)`).
   - Super Admin dapat melihat seluruh stasiun dari semua admin beserta nama pembuatnya.

### B. Halaman Manajemen User (`app/dashboard/users/page.tsx`)
1. **Admin**: Izinkan Admin untuk melihat halaman ini, namun batasi daftar pengguna yang tampil hanya yang berada di bawah naungan dirinya (`parent_admin_id = currentAdminId`).
2. Tambahkan kolom **Parent Admin** pada tabel untuk menampilkan email Admin yang bertanggung jawab atas akun User tersebut.
3. Nonaktifkan atau sembunyikan tombol tambah/edit/hapus pengguna jika perannya bukan Admin atau Super Admin.
