import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/utils/supabase/server';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for logos

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to upload logos.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, and WebP images are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size exceeds the maximum limit of 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '');
    const fileName = `logo_${Date.now()}_${safeName}`;
    
    // Ensure public/images/logo directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'logo');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Write file
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    // Return the public URL path for the frontend
    const publicUrl = `/images/logo/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
