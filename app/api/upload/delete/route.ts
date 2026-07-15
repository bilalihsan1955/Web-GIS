import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/utils/supabase/server';

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
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const absolutePath = path.join(uploadDir, safeName);

    // Guard against directory traversal outside public/uploads
    if (!path.resolve(absolutePath).startsWith(path.resolve(uploadDir))) {
      return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    try {
      await fs.access(absolutePath);
      await fs.unlink(absolutePath);
    } catch {
      // File already gone or inaccessible, ignore
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
