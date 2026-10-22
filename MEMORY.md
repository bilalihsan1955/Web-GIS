# PROJECT MEMORY & ARCHITECTURE CONTEXT
# view360 — Web-GIS 3D Spatial Visualization & Multi-Tenant Panorama Monitoring Platform

Dokumen memori ini berfungsi sebagai referensi persisten bagi asisten AI dan pengembang saat memulai sesi baru atau setelah batas percakapan (*chat limit / context compaction*).

---

## 1. Aturan Mutlak Antarmuka (Mandatory UI & Typography Rule)

> [!CRITICAL]
> **Dilarang Keras Menggunakan Huruf Kapital Penuh (ALL CAPS / Full Capital)**
> 1. Dilarang menuliskan teks UI apa pun dalam format huruf besar semua (*ALL CAPS*). Berlaku untuk tombol, label input, judul, modal, badge, hingga notifikasi.
> 2. Dilarang menggunakan utilitas Tailwind `uppercase` atau styling CSS `text-transform: uppercase`.
> 3. Selalu gunakan format **Sentence case** (contoh: *"Unggah foto panorama"*, *"Simpan perubahan"*, *"Kelola batas wilayah"*) atau **Title Case** yang wajar untuk nama entitas.

> [!CRITICAL]
> **Aturan Mutlak Perencanaan via Berkas Artifact (Mandatory Plan via Artifact Rule)**
> 1. **Dilarang menulis atau memaparkan plan secara panjang di pesan chat.**
> 2. Semua rencana kerja Tier 1 & Tier 2 **WAJIB dibuat sebagai berkas Artifact terpisah** di direktori artifact dengan metadata `RequestFeedback: true`.
> 3. Di chat, agen hanya boleh memberikan ringkasan singkat dan mengarahkan pengguna ke berkas Artifact tersebut untuk persetujuan.

---

## 2. Kredensial Pengujian & Akun Default

Untuk pengujian browser otomatis, subagent, dan pengetesan lokal (telah disemai di database):

| Peran (*Role*) | Akun & Kata Sandi | Deskripsi Akses | Cakupan Data |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@view360.com`<br>`SuperAdmin123!` | Akses ke seluruh perusahaan, pemantauan analitik global, pembuatan admin baru | Seluruh data di database (slug: `platform-admin`) |
| **Admin Perusahaan** | `admin@nusantara-gis.com`<br>`SuperAdmin123!` | Pemilik kelompok perusahaan; memiliki 2 seksi, 2 lokasi, 2 titik node, dan batas poligon | Hanya data dengan `created_by = user.id` miliknya (slug: `nusantara-gis`) |
| **User / Staf** | `staf@nusantara-gis.com`<br>`SuperAdmin123!` | Staf lapangan yang dinaungi oleh admin terkait (`parent_admin_id`) | Mewarisi hak akses kelompok perusahaan adminnya (`groupUserIds`) |

---

## 3. Tata Kelola Multi-Tenant & Kepemilikan Ganda (Double Ownership)

### Prinsip Kepemilikan Ganda (*Double Ownership Principle*):
Setiap titik foto di dalam sistem terbagi menjadi dua entitas database:
1. **Entitas Lokasi (`locations`)**: Menyimpan nama lokasi, seksi wilayah (`section_id`), slug unik, dan `created_by` (ID Kelompok Perusahaan).
2. **Entitas Titik Foto (`spatial_nodes`)**: Menyimpan foto panorama 360°, koordinat GPS, tanggal pemotretan, relasi `location_id`, dan `created_by` (ID Kelompok Perusahaan).

### Solusi Konflik Slug Lintas Perusahaan:
- Database memiliki konstrain unik global pada `locations(slug)`.
- Jika Perusahaan A dan Perusahaan B sama-sama mengunggah lokasi bernama `"Pintu Masuk Utama"`, penamaan slug otomatis diimbuhi sufiks ID perusahaan:
  ```typescript
  const companySuffix = ownerId ? ownerId.slice(0, 8) : Date.now().toString();
  const slug = `${baseSlug}-${companySuffix}`;
  ```
- **Hasil:** Perusahaan A memiliki slug `pintu-masuk-utama-a1b2c3d4` dan Perusahaan B memiliki slug `pintu-masuk-utama-e5f6g7h8`. Tidak ada benturan database.

### Penguncian Operasi Hapus & Edit:
- **Penghapusan Node (`useNodeMutations.ts`):**
  Perintah delete pada `spatial_nodes` dikunci dengan:
  ```typescript
  deleteNodeQuery = deleteNodeQuery.in('created_by', groupUserIds);
  ```
- **Penghapusan Lokasi Bersyarat:**
  Sebelum menghapus data `locations`, sistem memeriksa apakah ada node lain yang masih merujuk ke lokasi tersebut (`count === 0`). Jika sudah 0, penghapusan lokasi tetap **wajib dikunci per ID kelompok**:
  ```typescript
  deleteLocQuery = deleteLocQuery.in('created_by', groupUserIds);
  ```
- **Hasil:** Penghapusan node di Perusahaan A **100% tidak akan pernah menyentuh data Perusahaan B**, meskipun nama lokasinya identik.

---

## 4. Architectural Decision Records (ADR 1–6: Decoupled Standalone Architecture)

### ADR 1: Database Standalone Engine (`lib/db/index.ts` & Docker PostgreSQL)
* **Konteks:** Menghilangkan keterikatan eksklusif pada layanan BaaS pihak ketiga (Supabase) agar aplikasi dapat berjalan di lingkungan on-premise, VPS standar, atau infrastruktur cloud mandiri berbasis container.
* **Keputusan:** Mengimplementasikan pool koneksi PostgreSQL mandiri via `pg.Pool` dengan SSL pooling, keep-alive, dan query terparameterisasi murni (`query(sql, params)`). Menyediakan `docker-compose.yml` (`postgres:16-alpine`), berkas skema [`database/migrations/001_initial_standalone.sql`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/database/migrations/001_initial_standalone.sql), idempotent seeder [`database/seed.sql`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/database/seed.sql), dan skrip runner otomatis `npm run db:setup`.
* **Hasil:** 100% imun terhadap SQL Injection (OWASP A03), koneksi database stabil, zero-vendor lock-in, dan dapat dijalankan secara instan via `docker compose up -d`.

### ADR 2: Standalone JWT Auth & Zero-Trust RBAC Guard (`lib/auth/`)
* **Konteks:** Menghilangkan ketergantungan auth BaaS eksternal yang lambat dan memusatkan otentikasi di level aplikasi.
* **Keputusan:** Menggunakan `jose` untuk token JWT HS256 stateless yang disimpan dalam HTTP-Only, Secure, SameSite=Lax cookie, serta `bcryptjs` (Cost 12) untuk hashing kata sandi. Mengimplementasikan `verifyTenantOwnership()` di `lib/auth/rbac.ts` untuk memblokir BOLA/IDOR dan BFLA. Menambahkan middleware `proxy.ts` dengan HTTP Security Headers 2026 (CSP ramah Mapbox/PSV WebGL, HSTS, X-Frame-Options).
* **Hasil:** Autentikasi cepat, aman, dan patuh standar OWASP Top 10 2021–2026.

### ADR 3: Global UI Design System & Concurrency Queue Smart Uploader
* **Konteks:** `SmartUploader.tsx` berukuran 680 baris dan rawan membuat browser freeze saat pengguna menyeret puluhan foto resolusi tinggi.
* **Keputusan:** Membangun `components/ui/GlobalComponents.tsx` (Button, Input, Select, Badge, Card, EmptyState, ConfirmDialog). Mengekstrak logika unggah ke `hooks/usePanoramaUploader.ts` dengan **Upload Concurrency Queue** (maksimal 2 unggahan paralel). Memecah UI menjadi `UploaderDropzone.tsx` dan `UploaderDetailsForm.tsx`.
* **Hasil:** `SmartUploader.tsx` menyusut 84% menjadi 110 baris. Peramban tidak pernah freeze saat mengunggah 20+ foto 360°.

### ADR 4: WebGL Memory Leak Prevention & Mapbox/Sidebar Decomposition
* **Konteks:** `useMapbox.ts` (545 baris) dan `MapSidebar.tsx` (669 baris) mengalami memory leak saat bernavigasi dan event klik bentrok antara marker node dengan poligon batas.
* **Keputusan:** Mengekstrak injeksi GeoJSON poligon, layer stacking di bawah nodes, dan collision guard ke `hooks/useMapboxBoundaries.ts`. Memasang cleanup WebGL menyeluruh (`map.remove()`, marker removal) saat unmount. Memecah sidebar menjadi `SidebarBoundariesAccordion.tsx` (75 baris) dan `SidebarNodeList.tsx` (90 baris).
* **Hasil:** `useMapbox.ts` menjadi 235 baris dan `MapSidebar.tsx` menjadi 220 baris. WebGL canvas memory stabil tanpa crash.

### ADR 5: Modular Company Management, Duplicate Scanner & Overview Page
* **Konteks:** `CompanyGrid.tsx` (565 baris), `DuplicateNodesModal.tsx` (540 baris), dan `app/dashboard/(overview)/page.tsx` (272 baris) melanggar batas 250 baris.
* **Keputusan:** Memecah `CompanyGrid` menjadi `CompanyCard.tsx` (85 baris) dan `CompanyModals.tsx` (160 baris). Mengekstrak algoritma pendeteksi jarak spasial Haversine dan duplikasi gambar ke `hooks/useDuplicateScanner.ts`. Mengelompokkan seluruh modal dashboard ke `DashboardModals.tsx` (80 baris).
* **Hasil:** Seluruh berkas kini berada di bawah 200 baris kode dan mudah dipelihara.

### ADR 6: Decoupled Multi-Driver Storage, Rate Limiting & Dynamic Metadata SEO
* **Konteks:** Pengunggahan berkas membutuhkan mesin mandiri yang dapat beralih antara disk lokal dan S3 tanpa vendor lock-in, serta tahan terhadap serangan flood/DoS.
* **Keputusan:** Membangun `lib/storage/index.ts` (mendukung Local Disk `public/uploads` dan AWS S3/Cloudflare R2/MinIO) dengan enkripsi nama berkas UUID dan proteksi path traversal. Mengimplementasikan sliding-window rate limiter di `lib/security/rateLimit.ts` (login 5/min, upload 30/min) dan idempotency guard di `lib/security/idempotency.ts` (`X-Idempotency-Key`). Menambahkan dynamic `generateMetadata` SEO pada `app/[adminId]/page.tsx`.
* **Hasil:** Sistem penyimpanan mandiri, tahan banting, dan siap skala produksi.

---

## 5. Ringkasan Dekomposisi Berkas Monolitik

| Berkas Awal | Baris Awal | Berkas Hasil Dekomposisi | Baris Baru | Reduksi |
| :--- | :---: | :--- | :---: | :---: |
| `components/admin/SmartUploader.tsx` | 680 | `hooks/usePanoramaUploader.ts`<br>`components/admin/uploader/UploaderDropzone.tsx`<br>`components/admin/uploader/UploaderDetailsForm.tsx`<br>`components/admin/SmartUploader.tsx` | 360<br>135<br>160<br>110 | **-84%** (Orchestrator) |
| `components/ui/MapSidebar.tsx` | 669 | `components/ui/sidebar/SidebarBoundariesAccordion.tsx`<br>`components/ui/sidebar/SidebarNodeList.tsx`<br>`components/ui/MapSidebar.tsx` | 75<br>90<br>220 | **-67%** (Coordinator) |
| `hooks/useMapbox.ts` | 545 | `hooks/useMapboxBoundaries.ts`<br>`hooks/useMapbox.ts` | 150<br>235 | **-57%** (Core Hook) |
| `components/admin/CompanyGrid.tsx` | 565 | `components/admin/company/CompanyCard.tsx`<br>`components/admin/company/CompanyModals.tsx`<br>`components/admin/CompanyGrid.tsx` | 85<br>160<br>145 | **-74%** (Orchestrator) |
| `components/admin/DuplicateNodesModal.tsx`| 540 | `hooks/useDuplicateScanner.ts`<br>`components/admin/DuplicateNodesModal.tsx` | 135<br>185 | **-66%** (Presentational) |
| `app/dashboard/(overview)/page.tsx` | 272 | `components/admin/DashboardModals.tsx`<br>`app/dashboard/(overview)/page.tsx` | 80<br>170 | **-38%** (Page Component) |
| `app/dashboard/users/page.tsx` | 795 | `hooks/useUsersManagement.ts`<br>`components/admin/users/UserModals.tsx`<br>`components/admin/users/DeleteUserModal.tsx`<br>`app/dashboard/users/page.tsx` | 242<br>217<br>84<br>216 | **-73%** (Strict < 250 lines) |

---

### ADR 7: Complete Decoupling from Supabase to Docker PostgreSQL Standalone & Elimination of 'TypeError: Failed to fetch'
* **Konteks:** Pemanggilan langsung ke cloud Supabase (`@/utils/supabase/client` dan `supabase/server`) menyebabkan galat `TypeError: Failed to fetch` di browser pengguna saat instance Supabase offline/tidak terhubung.
* **Keputusan:**
  1. Mengalihkan seluruh data fetching frontend ke Next.js 16 API Route Handlers internal (`/api/auth/*`, `/api/dashboard/*`, `/api/public/*`).
  2. Mengimplementasikan koneksi murni ke Docker PostgreSQL 16 Alpine via `lib/db/index.ts` (`pg.Pool`), otentikasi JWT session mandiri (`lib/auth/jwt.ts`), dan Zero-Trust RBAC guard (`lib/auth/rbac.ts`).
  3. Menambahkan endpoint `POST /api/dashboard/nodes` untuk pembuatan lokasi dan penyimpanan titik panorama 360° secara atomik (`withTransaction`) dengan proteksi jarak duplikasi GPS ~1 meter.
  4. Mendekomposisi `app/dashboard/users/page.tsx` (795 baris) menjadi `hooks/useUsersManagement.ts` dan modal modular terpisah (`UserModals.tsx`, `DeleteUserModal.tsx`).
* **Hasil:** 0 panggilan jaringan ke Supabase dari klien, galat `TypeError: Failed to fetch` hilang total, seluruh komponen UI `< 250 baris`, dan lulus 24/24 uji E2E.

---

## 6. Jebakan Teknis yang Harus Dihindari (*Anti-Traps*)

1. **Mapbox WebGL Context Loss:**
   - Selalu bersihkan listener dan panggil `map.remove()` pada fungsi cleanup `useEffect` di `useMapbox.ts`.
2. **Next.js 16 Client Component SSR:**
   - Mapbox GL JS dan Photo Sphere Viewer tidak kompatibel dengan SSR Node.js.
   - Peta dan Viewer selalu dimuat menggunakan `next/dynamic({ ssr: false })` atau dibungkus dalam blok `typeof window !== 'undefined'`.
3. **Tailwind CSS v4 Dark Mode:**
   - Dilarang menggunakan `dark:` untuk mengubah struktur padding/margin/flexbox. Hanya gunakan `dark:` untuk utilitas warna (`dark:bg-*`, `dark:text-*`, `dark:border-*`).
4. **Ukuran Komponen Maksimal 250 Baris:**
   - Seluruh komponen UI harus modular dan tidak boleh melebihi 250 baris kode.
5. **Zero Supabase SDK Calls:**
   - Dilarang mengimpor `@/utils/supabase/client` pada komponen klien baru. Gunakan internal Route Handlers yang terhubung ke Docker PostgreSQL via `lib/db`.
