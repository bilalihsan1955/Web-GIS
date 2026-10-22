import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage';
import { validateFileMagicBytes } from '@/lib/validations/security';
import { enforceRateLimit } from '@/lib/security/rateLimit';
import { getAuthSession } from '@/lib/auth/jwt';

// ============================================================================
// app/api/upload-logo/route.ts: Enterprise Logo Storage Endpoint
// Decoupled Storage, Magic-Bytes Validation & Rate Limiter
// ============================================================================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for logos

export async function POST(req: Request) {
  try {
    const rateLimitError = enforceRateLimit(req, 'upload-logo', 20, 60000);
    if (rateLimitError) return rateLimitError;

    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak ditemukan.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada berkas logo yang diunggah.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe berkas tidak valid. Hanya JPG, PNG, dan WebP yang diizinkan.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran logo melebihi batas maksimum 5MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate true binary signature
    const magicCheck = validateFileMagicBytes(buffer);
    if (!magicCheck.isValid) {
      return NextResponse.json(
        { error: magicCheck.error || 'Signature berkas gambar tidak valid.' },
        { status: 400 }
      );
    }

    // Save to decoupled storage
    const storageResult = await uploadFile(buffer, file.name, file.type, 'logos');

    return NextResponse.json({ url: storageResult.url });
  } catch (error: any) {
    console.error('[Upload Logo Error]:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengunggah logo.' }, { status: 500 });
  }
}
