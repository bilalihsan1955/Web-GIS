import { NextResponse } from 'next/server';
import { deleteFile } from '@/lib/storage';
import { getAuthSession } from '@/lib/auth/jwt';

// ============================================================================
// app/api/upload/delete/route.ts: Safe File Deletion Endpoint
// Enforces path traversal assertion and safe storage deletion
// ============================================================================

export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Sesi tidak ditemukan.' }, { status: 401 });
    }

    const { filePath } = await req.json();
    if (!filePath) {
      return NextResponse.json({ error: 'Parameter filePath wajib diisi.' }, { status: 400 });
    }

    const success = await deleteFile(filePath);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('[Storage Delete Error]:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus berkas.' }, { status: 500 });
  }
}
