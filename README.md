# view360 — Multi-Tenant Web-GIS & 360° Spatial Intelligence Platform

**view360** adalah platform manajemen spasial dan visualisasi intelijen berbasis web performa tinggi. Platform ini mengintegrasikan tampilan peta bola dunia 3D (*3D Globe Mapbox*), peta mini 2D (*Leaflet*), serta penampil foto panorama 360° (*Photo Sphere Viewer WebGL*) yang diselaraskan dengan arsitektur *Multi-Tenant Role-Based Access Control* (RBAC).

---

## 🌟 Fitur Utama (Key Features)

### 🌐 1. Visualisasi Spasial 3D & 2D (Interactive Mapping)
- **3D Globe Visualisation (Mapbox GL JS)**: Pemetaan titik spasial interaktif pada globe 3D dengan *dynamic clustering*, pemfilteran berdasarkan seksi (*sections*), serta pencarian lokasi *real-time*.
- **360° Photo Sphere Viewer**: Penampil panorama equirectangular 360° berbasis WebGL dengan kontrol navigasi modern, validasi otomatis aspek rasio gambar (2:1), serta antarmuka *glassmorphism*.
- **Peta Mini 2D (Leaflet)**: Peta panduan lokasi presisi 2D di sudut layar untuk mempermudah navigasi geografis.

### 🏢 2. Manajemen Perusahaan & Klien Multi-Tenant (Client Management)
- **Direktori Perusahaan (Company Directory)**: Halaman *Overview* Super Admin menampilkan direktori kartu seluruh perusahaan/klien yang terdaftar.
- **Tambah Perusahaan Baru**: Super Admin dapat mendaftarkan perusahaan baru langsung dari halaman Overview (otomatis membuat akun Admin Utama, unggah logo perusahaan ke cloud storage, serta pembuatan *company slug* otomatis).
- **Mode Kelola (Impersonation Mode)**: Super Admin dapat memilih dan beralih ke mode kelola perusahaan tertentu secara eksklusif.
- **Hapus Perusahaan (Cascade Delete)**: Penghapusan perusahaan secara permanen dengan konfirmasi email wajib. Menghapus seluruh berkas gambar di cloud storage (`panoramas` & `logos`), titik node spasial, data lokasi, serta seluruh akun anggota pengguna di bawah perusahaan tersebut.

### 📊 3. Manajemen Node Spasial & Seleksi Batch (Spatial Data Management)
- **Tabel Data Node Interaktif**: Tabel data node lengkap dengan pencarian, pemfilteran seksi/status, pagination, serta aksi cepat.
- **Seleksi Batch & Bulk Delete**: Header checkbox "Select All", checkbox pada setiap baris node, *floating action bar* penunjuk jumlah data terpilih, serta modal penghapusan massal dilengkapi *progress bar*.
- **Statistik Overview Spasial**: Kartu statistik utama yang menampilkan **Lokasi Dipublikasi (*Published Locations*)**, **Total Node Spasial**, serta **Admin Aktif**.

### 🛡️ 4. Hak Akses Berbasis Peran (RBAC - Role-Based Access Control)
- **Super Admin**: Memiliki akses global untuk mengelola seluruh perusahaan, menambah/menghapus klien, impersonasi perusahaan, serta manajemen sistem penuh.
- **Admin (Company Owner & Co-Admin)**: Mengelola node spasial, seksi, lokasi, logo perusahaan, serta akun pengguna di bawah kelompok perusahaannya sendiri.
- **User**: Pengguna tingkat akhir yang dapat melihat dan berkontribusi mengunggah data peta pada kelompok perusahaan yang ditugaskan.

### ☁️ 5. Penyimpanan Cloud (Supabase Cloud Storage)
- **Bucket `panoramas`**: Menyimpan seluruh foto panorama 360° titik node spasial.
- **Bucket `logos`**: Menyimpan berkas gambar logo resmi tiap perusahaan.
- Mendukung pembaruan *public URL* dan penghapusan otomatis saat node atau perusahaan dihapus.

### 🎨 6. Desain Adaptif & Tema Terang/Gelap (Adaptive UI/UX)
- **Light & Dark Mode**: Estetika modern bertema *dark/light mode* dengan latar belakang 6 pancaran sinar *aurora spotlight* dinamis.
- **Masking Logo Merek**: Logo `view360` tampil sebagai siluet hitam pekat (`brightness-0`) di tema terang, dan kembali ke warna asli gambar di tema gelap.
- **Dukungan Multi-Bahasa**: Pilihan bahasa antarmuka instan dalam **Bahasa Indonesia** dan **English**.

---

## 🛠️ Teknologi & Stack (Tech Stack)

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) dengan Turbopack & React 19
- **Bahasa**: TypeScript
- **Styling**: Vanilla CSS & [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/) (Postgres DB, Row Level Security, Auth, Cloud Storage)
- **Pemetaan**: Mapbox GL JS & Leaflet
- **Visualisasi 360°**: Photo Sphere Viewer (WebGL)
- **Ikonografi & Font**: Lucide React & Bricolage Grotesque (Google Fonts)

---

## 🚀 Memulai (Getting Started)

### 1. Prasyarat & Instalasi
Pastikan Node.js (v18+) dan `npm` telah terpasang di sistem Anda.

```bash
# Clone repositori atau buka direktori proyek
cd web-gis

# Install dependensi proyek
npm install
```

### 2. Konfigurasi Environment (`.env.local`)
Buat berkas `.env.local` di akar direktori proyek dan isikan variabel berikut:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox Access Token
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token
```

### 3. Menjalankan Server Pengembang
Jalankan server pengembang lokal:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di peramban web Anda untuk melihat aplikasi **view360**.

---

## 📦 Verifikasi Build Produksi

Untuk memverifikasi kompilasi produksi dan pengecekan tipe TypeScript:

```bash
npm run build
```

---

## 📄 Lisensi & Hak Cipta

© {new Date().getFullYear()} **view360** — Platform Intelijen Spasial. All rights reserved.
