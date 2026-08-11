import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB to support high-res compressed/uncompressed 360 panoramas

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to upload files.' }, { status: 401 });
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
      return NextResponse.json({ error: 'File size exceeds the maximum limit of 50MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '');
    const fileName = `${Date.now()}_${safeName}`;

    const adminClient = createAdminClient();

    // Upload file directly to Supabase Storage bucket 'panoramas'
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('panoramas')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return NextResponse.json({ error: `Supabase Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Retrieve public URL from Supabase Storage
    const { data: urlData } = adminClient.storage
      .from('panoramas')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to delete files.' }, { status: 401 });
    }

    const { fileName } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'No filename provided' }, { status: 400 });

    const safeName = fileName.split('/').pop()?.replace(/[^a-zA-Z0-9.-_]/g, '');
    if (!safeName) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });

    const adminClient = createAdminClient();
    await adminClient.storage.from('panoramas').remove([safeName]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
