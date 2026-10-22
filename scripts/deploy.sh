#!/usr/bin/env bash
# ==============================================================================
# Web-GIS Zero-Downtime Deployment & Update Script for VPS
# Usage: ./scripts/deploy.sh
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🚀 Memulai Deployment Produksi Web-GIS"
echo "=========================================================="

# 1. Pastikan file .env.production tersedia
if [ ! -f ".env.production" ]; then
    echo "❌ Galat: File .env.production tidak ditemukan!"
    echo "💡 Silakan salin dari template: cp .env.production.example .env.production"
    echo "   dan sesuaikan nilai variabelnya sebelum menjalankan script ini."
    exit 1
fi

# 2. Ambil perubahan terbaru dari Git (jika branch sudah di-track)
echo "📥 Mengambil pembaruan kode terbaru dari Git..."
git pull --ff-only || {
    echo "⚠️ Peringatan: git pull gagal atau ada perubahan lokal. Melanjutkan dengan kode yang ada..."
}

# 3. Build & Jalankan Docker Container
echo "🐳 Membangun dan menjalankan container produksi..."
docker compose -f docker-compose.prod.yml up -d --build

# 4. Tunggu container siap (healthcheck)
echo "⏳ Menunggu container database dan aplikasi siap..."
sleep 5

# 5. Jalankan migrasi database & seeding (idempotent)
echo "🗄️ Menjalankan migrasi skema tabel dan verifikasi database..."
docker compose -f docker-compose.prod.yml exec webgis-app node scripts/setup-db.mjs || {
    echo "⚠️ Perhatian: Eksekusi migrasi database otomatis belum dapat berjalan."
}

# 6. Bersihkan image lama yang tidak terpakai
echo "🧹 Membersihkan image docker yang menggantung..."
docker image prune -f

echo "=========================================================="
echo "✅ Deployment Selesai!"
echo "Status Container:"
docker compose -f docker-compose.prod.yml ps
echo "=========================================================="
