import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAdminClient, createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to delete files.' }, { status: 401 });
    }

    const { filePath } = await req.json();
    if (!filePath) return NextResponse.json({ error: 'No filepath provided' }, { status: 400 });

    const safeName = filePath.split('/').pop()?.replace(/[^a-zA-Z0-9.-_]/g, '');
    if (!safeName) return NextResponse.json({ error: 'Invalid filepath' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Remove from Supabase Storage buckets ('panoramas' & 'logos')
    try {
      await adminClient.storage.from('panoramas').remove([safeName]);
      await adminClient.storage.from('logos').remove([safeName]);
    } catch (storageErr) {
      console.error('Error removing file from Supabase Storage:', storageErr);
    }

    // 2. Backwards-compatibility fallback for legacy local uploads if present
    if (filePath.startsWith('/uploads/') || filePath.startsWith('/images/logo/')) {
      const uploadDir = path.join(process.cwd(), 'public', filePath.startsWith('/images/logo/') ? 'images/logo' : 'uploads');
      const absolutePath = path.join(uploadDir, safeName);
      if (path.resolve(absolutePath).startsWith(path.resolve(uploadDir))) {
        try {
          await fs.access(absolutePath);
          await fs.unlink(absolutePath);
        } catch {
          // File already gone or inaccessible
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
