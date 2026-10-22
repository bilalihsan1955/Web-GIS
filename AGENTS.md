<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Protokol Inisiasi Sesi Percakapan Baru (Mandatory Session Onboarding)

> **Aturan ini bersifat WAJIB dan berlaku untuk setiap sesi percakapan baru tanpa pengecualian.**

## 1. Langkah Wajib Pertama
Sebelum memberikan respons atau menulis kode apa pun di percakapan baru, AI **WAJIB** membaca berkas [`INIT.md`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/INIT.md) di direktori utama proyek.

## 2. Tujuan
Berkas `INIT.md` merangkum seluruh konteks inti proyek:
- Arsitektur Next.js 16 + React 19 + Mapbox GL JS 3D + Photo Sphere Viewer.
- Standalone PostgreSQL Pool (`lib/db.ts`), Standalone JWT Auth (`lib/auth/jwt.ts`), dan Storage Service (`lib/storage`).
- Hierarki 3 peran (Super Admin, Admin Perusahaan, Staf).
- Aturan isolasi multi-tenant & kepemilikan ganda (*Double Ownership*).
- Settled decisions & keputusan arsitektur final.
- Pipeline validasi wajib (`npm run build`).

---

# Aturan Kualitas Kode & Arsitektur (Strict Architectural Guardrails)

> Aturan ini mengikat seluruh pengembang dan agen AI tanpa pengecualian untuk menjaga kode tetap bersih, modular, dan mudah di-debug.

1. **Strict < 250 Lines Rule:**
   - Komponen UI (`.tsx`) dilarang keras melebihi **250 baris kode**. Komponen UI hanya bertugas merender tampilan (*presentational*).
   - Seluruh logika bisnis, kalkulasi spasial, dan pemanggilan API wajib diekstrak ke dalam Custom Hook di `hooks/use*.ts` (contoh: `usePanoramaUploader.ts`, `useMapboxBoundaries.ts`, `useDuplicateScanner.ts`).
2. **Reuse Global UI Components:**
   - Pengembang/AI **WAJIB** memanfaatkan komponen yang telah terstandarisasi di [`components/ui/GlobalComponents.tsx`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/components/ui/GlobalComponents.tsx) (`Button`, `Input`, `Select`, `Badge`, `Card`, `EmptyState`, `ConfirmDialog`) sebelum membuat markup elemen UI baru.
3. **Server-Only & Zero-Trust Security:**
   - Seluruh file di layer database (`lib/db.ts`), otentikasi (`lib/auth/*.ts`), dan penyimpanan (`lib/storage/*.ts`) **WAJIB** menyertakan `import 'server-only'` di baris paling atas untuk mencegah kebocoran logika server ke bundel klien.
   - Setiap endpoint API Route Handler wajib memanggil `requireAuth()` dan `verifyTenantOwnership()` (`lib/auth/rbac.ts`) untuk mencegah serangan **BOLA / IDOR (OWASP API1 / A01)**.
   - Gunakan skema **Zod `.strict()`** untuk seluruh parsing payload request guna mencegah **Mass Assignment / BOPLA (OWASP API3)**.
   - Gunakan *Parameterized Queries* murni (`query(sql, [params])`) untuk mencegah **SQL Injection (OWASP A03)**.
   - Sanitasi setiap properti teks dari berkas EXIF kamera dan poligon GeoJSON menggunakan `sanitizeHtmlString()` sebelum dirender ke DOM untuk mencegah **Stored DOM XSS**.
4. **Web Resiliency & Anti-Flood:**
   - Setiap endpoint mutasi atau pengunggahan berkas baru **WAJIB** menyertakan `enforceRateLimit()` (`lib/security/rateLimit.ts`) untuk memitigasi serangan brute-force dan DoS.
   - Terapkan perlindungan **Idempotency Guard** (`lib/security/idempotency.ts`) via header `X-Idempotency-Key` pada endpoint upload/mutasi agar double-click atau network retry tidak menciptakan rekaman duplikat.
5. **Client-Side Component Isolation:**
   - Komponen yang mengakses browser API (`window`, WebGL, Mapbox GL, Photo Sphere Viewer) wajib menggunakan directive `'use client'` dan di-import dengan `next/dynamic({ ssr: false })` jika diperlukan.
   - Setiap listener peta atau canvas WebGL wajib dibersihkan secara eksplisit pada fungsi pembersihan (*cleanup function*) `useEffect` (`map.remove()`, `URL.revokeObjectURL()`).

---

# Protokol Perencanaan Wajib (Mandatory Planning Protocol)

> **Aturan ini berlaku TANPA PENGECUALIAN untuk setiap penambahan fitur baru atau perombakan sistem.**

## Klasifikasi Pekerjaan

| Tier | Deskripsi Pekerjaan | Prosedur Perencanaan |
| :--- | :--- | :--- |
| **Tier 1** | Fitur baru, modul baru, perombakan arsitektur, migrasi skema tabel, refactor lintas modul | **WAJIB PENUH:** Susun Artifact `.md` dengan `RequestFeedback: true` lengkap dengan matriks RBAC & diagram Mermaid. Tunggu approval user sebelum coding. |
| **Tier 2** | Peningkatan fitur existing, tambah kolom database, endpoint API baru, integrasi modul | **WAJIB:** Susun Artifact perencanaan terstruktur dengan subset diagram yang relevan. Tunggu approval user. |
| **Tier 3** | Bug fix, perbaikan CSS/styling, typo, optimasi query tunggal | **TIDAK PERLU ARTIFACT PLAN**, namun **WAJIB** analisa akar masalah di chat + solusi terencana mengacu skill terkait + **tunggu persetujuan user** sebelum menulis kode. |

---

# Aturan Mutlak Integritas Klaim & Anti-Bypass ("Bukti Dulu, Baru Klaim")

> Aturan ini berlaku untuk setiap respons, laporan, commit message, dan dokumen. Melanggarnya sama dengan menyerahkan pekerjaan yang belum selesai.

## A. Bukti Dulu, Baru Klaim
1. Kata "sudah", "berhasil", "lulus", "aman", "terisolasi", "selesai" hanya boleh dipakai jika ada bukti dari sesi yang sama:
   - Output perintah terminal (`npm run build`), atau
   - File dan nomor baris yang dibaca **setelah** perubahan terakhir dilakukan.
2. Tanpa bukti faktual, tulis **"belum diverifikasi"**. Dilarang keras menebak.
3. Dilarang membuat klaim dari ingatan atau ringkasan percakapan sebelumnya. Setelah context truncation, baca ulang berkas terkait sebelum mengklaim isinya.

## B. Format Laporan Akhir (Wajib 3 Bagian)
Setiap penyelesaian pekerjaan wajib memuat 3 bagian terstruktur:
1. **Terverifikasi:** Setiap poin perubahan disertai buktinya (perintah + hasil atau file:baris).
2. **Belum Diverifikasi:** Hal yang diubah tetapi belum diuji secara langsung (tulis "tidak ada" jika nihil).
3. **Risiko & Keterbatasan:** Efek samping, kasus tepi, atau pertimbangan performa WebGL/server.

## C. Akui Kesalahan Secara Eksplisit
Jika ada analisa atau klaim sebelumnya yang ternyata keliru, sebutkan secara terbuka di respons berikutnya: apa yang keliru, apa faktanya, dan bagaimana perbaikannya. Dilarang memperbaiki secara diam-diam.

## D. Dilarang Mem-Bypass Aturan
1. Dilarang menurunkan tier pekerjaan (Tier 1/2 menjadi Tier 3) agar dapat melompati perencanaan.
2. Dilarang menyembunyikan galat dengan `@ts-ignore` sembarangan, `catch` kosong, atau fallback diam-diam.
3. Dokumentasi pasca-implementasi (`MEMORY.md`, `PRD.md`, `INIT.md`, `version.txt`) wajib diperbarui secara konsisten.

## E. Dilarang Bahasa Pemasaran
Dilarang menggunakan kata klise seperti "standar militer", "100% aman", "dijamin tanpa bug", "solusi terbaik". Gunakan terminologi teknis yang dapat diuji (contoh: "terkunci via `.in('created_by', groupUserIds)`").

---

# Aturan Mutlak Desain & Tipografi (Tailwind v4)

1. **Dilarang Keras ALL CAPS:** Gunakan **Sentence case** untuk tombol, aksi, dan notifikasi.
2. **Dilarang Utilitas `uppercase`:** Dilarang menggunakan class Tailwind `uppercase` atau CSS `text-transform: uppercase`.
3. **Dark Mode Modifiers:** Gunakan `dark:` STRICTLY untuk utilitas warna (`dark:bg-*`, `dark:text-*`, `dark:border-*`). Jangan pernah menggunakan `dark:` untuk mengubah padding, margin, flexbox, atau layout.
4. **Light Theme Aesthetics:** Desain terang harus bersih, flat, dengan `shadow-none` pada komponen struktural (Sidebar, Navbar, Card, Tabel) dan subtle border `border-slate-200`. Batasi shadow pada modal/dropdown dengan `shadow-sm`.
5. **Modal Background:** Kotak konten modal (*modal box base*) wajib `bg-white` murni pada light mode.
