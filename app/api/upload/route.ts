import { NextResponse } from 'next/server';
import { uploadFile, deleteFile } from '@/lib/storage';
import { validateFileMagicBytes } from '@/lib/validations/security';
import { enforceRateLimit } from '@/lib/security/rateLimit';
import { checkIdempotency, saveIdempotentResponse } from '@/lib/security/idempotency';
import { getAuthSession } from '@/lib/auth/jwt';

// ============================================================================
// app/api/upload/route.ts: Enterprise Panorama 360° Storage Endpoint
// Decoupled Storage, Magic-Bytes Validation, Rate Limiter & Idempotency Guard
// ============================================================================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB for high-res 360 panoramas

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting: max 30 uploads / min per IP (anti-DoS / disk exhaustion)
    const rateLimitError = enforceRateLimit(req, 'upload', 30, 60000);
    if (rateLimitError) return rateLimitError;

    // 2. Idempotency Guard: prevent double-upload or network duplicate retry
    const { idempotencyKey, cachedResponse } = checkIdempotency(req);
    if (cachedResponse) return cachedResponse;

    // 3. Authentication: Standalone JWT session
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak ditemukan.' }, { status: 401 });
    }

    // 4. Form Data extraction
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada berkas yang diunggah.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe berkas tidak didukung. Hanya gambar JPG, PNG, dan WebP yang diizinkan.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran berkas melebihi batas maksimum 50MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 5. Binary Signature Magic-Bytes Verification (OWASP A04/A08)
    const magicCheck = validateFileMagicBytes(buffer);
    if (!magicCheck.isValid) {
      return NextResponse.json(
        { error: magicCheck.error || 'Signature berkas gambar tidak valid.' },
        { status: 400 }
      );
    }

    // 6. Decoupled Storage Execution (Local Disk / S3 Compatible)
    const storageResult = await uploadFile(buffer, file.name, file.type, 'panoramas');

    const responseBody = {
      url: storageResult.url,
      size: storageResult.size,
      mimeType: storageResult.mimeType,
    };

    saveIdempotentResponse(idempotencyKey, responseBody, 200);
    return NextResponse.json(responseBody);
  } catch (error: any) {
    console.error('[Upload Error]:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses unggahan berkas.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak valid.' }, { status: 401 });
    }

    const body = await req.json();
    const targetPath = body.filePath || body.fileName;
    if (!targetPath) {
      return NextResponse.json({ error: 'Parameter filePath tidak ditemukan.' }, { status: 400 });
    }

    const success = await deleteFile(targetPath);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('[Delete Storage Error]:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus berkas.' }, { status: 500 });
  }
}
