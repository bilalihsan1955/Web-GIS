# INSTRUKSI INISIASI PERCAKAPAN BARU
# view360 — Web-GIS 3D Spatial Visualization & Multi-Tenant Panorama Monitoring Platform

> **Tujuan:** Berkas ini wajib dibaca oleh AI di awal setiap percakapan baru agar konteks arsitektur, hierarki multi-tenant perusahaan, sistem spasial 3D/360°, dan batasan teknis proyek dapat dipahami secara instan tanpa perlu melakukan audit ulang dari nol.

---

## 1. Identitas Proyek

| Atribut | Nilai |
| :--- | :--- |
| **Nama Proyek** | view360 Web-GIS |
| **Jenis Sistem** | Enterprise Web-GIS 3D Globe + 360° Equirectangular Panorama Monitoring |
| **Versi Terkini** | `1.2.0` (lihat `version.txt`) |
| **Status Sistem** | Production Ready — Decoupled Standalone Architecture & OWASP 2026 Hardened (Next.js 16.2.9 Turbopack Build Passed) |
| **Tolok Ukur** | Mapbox GL JS 3D Globe + Photo Sphere Viewer WebGL + Standalone PostgreSQL/pg Pool + Zero-Trust RBAC |

---

## 2. Diagram & Arsitektur Teknis Sistem (Decoupled Standalone)

```mermaid
graph TD
  Browser[Pengguna / Browser] -->|HTTPS Requests| NextApp[Next.js 16 App Router / Turbopack]
  NextApp -->|Peta Bola Dunia 3D| Mapbox[Mapbox GL JS 3.25.0 Satelit 3D]
  NextApp -->|Visualisasi 360°| PSV[Photo Sphere Viewer 5 WebGL]
  NextApp -->|State Management| Zustand[Zustand: useMapStore & useDashboardStore]
  NextApp -->|Edge Security Middleware| Proxy[proxy.ts: CSP 2026 + HSTS + CORS]
  
  subgraph Backend Service Layer
    NextApp -->|Auth Engine| AuthCore[lib/auth/jwt.ts: Standalone JWT + Bcrypt 12]
    NextApp -->|RBAC Guard| RBACCore[lib/auth/rbac.ts: Zero-Trust Tenant Isolation]
    NextApp -->|Storage Engine| StorageCore[lib/storage/index.ts: Local Disk / S3 R2 MinIO]
    NextApp -->|AppSec Guards| SecurityCore[lib/security: RateLimit & Idempotency]
    NextApp -->|Database Pool| DBCore[lib/db.ts: Standalone PostgreSQL pg.Pool]
  end

  DBCore -->|Kueri Terparameterisasi| Database[(PostgreSQL 15+ / PostGIS)]
  StorageCore -->|Simpan Fisik File Terisolasi| StorageDisk[public/uploads/ & Cloud S3]
```

---

## 3. Stack Teknologi Aktual

| Layer | Teknologi & Versi | Deskripsi & Peran |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.2.9 | App Router dengan Turbopack Engine, Server Components & Route Handlers |
| **Frontend Core** | React 19.2.4 + TypeScript 5.x | Pure Client/Server component separation, Strict Typing |
| **Styling & Theme** | Tailwind CSS v4 | Flat Light Theme + Glassmorphism Dark Mode, Sentence Case murni |
| **3D Globe Engine** | Mapbox GL JS 3.25.0 | Peta satelit 3D, Dynamic Clustering, Layer Stacking poligon di bawah titik node |
| **360° Viewer** | Photo Sphere Viewer 5.14.3 | WebGL Canvas Equirectangular 2:1, Adjacent Preloading, Memory cleanup |
| **Database Core** | Standalone PostgreSQL (`pg`) | `lib/db.ts` dengan `pg.Pool`, SSL Pooling, Keep-Alive, Parameterized Queries |
| **Auth & Security** | Standalone JWT (`jose`) | `lib/auth/jwt.ts`, Bcrypt Cost 12, Zero-Trust RBAC (`lib/auth/rbac.ts`) |
| **Storage Engine** | Standalone Multi-Driver | `lib/storage/index.ts` (Local Disk `public/uploads` + AWS S3/Cloudflare R2/MinIO) |
| **Resiliency & Guard**| OWASP Top 10 (2021–2026) | Sliding-Window Rate Limiter, `X-Idempotency-Key` Guard, Magic-Bytes Validation |
| **Geospatial Tools**| Turf.js, toGeoJSON, Shpjs | Kalkulasi luas poligon hektar (`@turf/area`), konversi SHP, KML, GeoJSON |
| **State Management**| Zustand 5.0.14 | `useMapStore` & `useDashboardStore` terpisah |

---

## 4. Panduan Database Docker, Migrasi & Idempotent Seeder

Sistem menggunakan database PostgreSQL mandiri berbasis Docker yang dapat dijalankan secara instan:

1. **Menjalankan PostgreSQL via Docker Compose:**
   ```bash
   docker compose up -d
   ```
   Perintah ini akan menjalankan container `webgis-postgres` (PostgreSQL 16 Alpine) pada port `5432:5432` dengan volume persisten `pgdata`.

2. **Menjalankan Migrasi Skema & Idempotent Seeder Otomatis:**
   ```bash
   npm run db:setup
   ```
   Skrip [`scripts/setup-db.mjs`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/scripts/setup-db.mjs) mengeksekusi:
   - [`database/migrations/001_initial_standalone.sql`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/database/migrations/001_initial_standalone.sql) (tabel mandiri, constraint, & B-Tree index).
   - [`database/seed.sql`](file:///c:/Users/BILALIHSAN/Documents/project/web-gis/database/seed.sql) (idempotent seeder dengan akun contoh).

3. **Kredensial Default Pengujian:**
   - **Superadmin:** `superadmin@view360.com` / `SuperAdmin123!` (slug: `platform-admin`)
   - **Admin Perusahaan:** `admin@nusantara-gis.com` / `SuperAdmin123!` (slug: `nusantara-gis`)
   - **Staf Lapangan:** `staf@nusantara-gis.com` / `SuperAdmin123!`

4. **Menjalankan Pengujian E2E Otomatis:**
   ```bash
   npm run test:e2e
   ```

5. **Daftar Variabel Lingkungan (`.env`):**
   ```ini
   # Database Mandiri (Docker PostgreSQL)
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webgis?sslmode=disable"
   POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/webgis?sslmode=disable"
   DATABASE_SSL="false"
   
   # JWT Secret Mandiri
   JWT_SECRET="c2VjdXJlLXN1cGVyLXNlY3JldC1qd3QtdG9rZW4tdmlldzM2MC1lbnRlcnByaXNl"
   
   # Standalone Storage Configuration (local atau s3)
   STORAGE_DRIVER="local"
   # S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
   # S3_BUCKET="view360-panoramas"
   # S3_ACCESS_KEY_ID="xxx"
   # S3_SECRET_ACCESS_KEY="xxx"
   # S3_PUBLIC_URL="https://cdn.perusahaan.com"
   
   # Mapbox Token
   NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1I..."
   ```

---

## 5. Struktur Folder Baru Hasil Dekomposisi (< 250 Baris per Berkas)

```text
├── app/
│   ├── [adminId]/page.tsx            # Public Guest Company Map + Dynamic SEO Metadata
│   ├── api/
│   │   ├── auth/[login|logout|me]    # Standalone JWT Authentication API
│   │   ├── upload/route.ts           # Standalone Storage Upload + Rate Limit + Idempotency
│   │   ├── dashboard/                # API Handlers (Users, Boundaries, Sections, Profile)
│   ├── dashboard/(overview)/page.tsx # Overview Dashboard Orchestrator (170 baris)
├── components/
│   ├── admin/
│   │   ├── company/                  # CompanyCard.tsx, CompanyModals.tsx
│   │   ├── uploader/                 # UploaderDropzone.tsx, UploaderDetailsForm.tsx
│   │   ├── CompanyGrid.tsx           # Company Directory Orchestrator (145 baris)
│   │   ├── SmartUploader.tsx         # Uploader Thin Orchestrator (110 baris)
│   │   ├── DuplicateNodesModal.tsx   # Pure UI Duplicate Scanner (185 baris)
│   │   ├── DashboardModals.tsx       # Grouped Overview Modals (80 baris)
│   ├── ui/
│   │   ├── GlobalComponents.tsx      # Reusable UI System: Button, Input, Select, Badge, Card, ConfirmDialog
│   │   ├── MapSidebar.tsx            # Sidebar Map Coordinator (220 baris)
│   │   ├── sidebar/                  # SidebarBoundariesAccordion.tsx, SidebarNodeList.tsx
├── hooks/
│   ├── useMapbox.ts                  # Mapbox 3D Globe + WebGL Memory Cleanup (235 baris)
│   ├── useMapboxBoundaries.ts        # Sub-hook Boundary Stacking under Nodes & Collision Guard
│   ├── usePanoramaUploader.ts        # Uploader Hook + Concurrency Queue (Max 2 uploads)
│   ├── useDuplicateScanner.ts        # Spatial Proximity & Image Collision Detection Hook
│   ├── useDashboardData.ts           # Dashboard Data Fetching & Caching Hook
│   ├── useNodeMutations.ts           # Node Mutations & Safe Deletion Hook
├── lib/
│   ├── db.ts                         # Standalone PostgreSQL Connection Pool
│   ├── storage/index.ts              # Standalone Multi-Driver Storage (Path Traversal Safe)
│   ├── security/                     # rateLimit.ts & idempotency.ts
│   ├── auth/                         # jwt.ts & rbac.ts (Zero-Trust RBAC Guard)
│   ├── validations/security.ts       # Magic-Bytes, Anti-SSRF, Stored DOM XSS Sanitizer
├── database/                         # migrations/ & seed.sql
```

---

## 6. Pipeline Validasi Wajib

Setiap perubahan kode wajib divalidasi dengan menjalankan:
```bash
npm run build
```
Pastikan kompilasi Turbopack Next.js 16 berhasil dengan **Exit Code 0** (0 error TypeScript, 0 error build) sebelum melaporkan hasil pekerjaan kepada pengguna.
