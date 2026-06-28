import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { filePath } = await req.json();
    if (!filePath) return NextResponse.json({ error: 'No filepath provided' }, { status: 400 });

    const safeName = filePath.split('/').pop()?.replace(/[^a-zA-Z0-9.-_]/g, '');
    if (!safeName) return NextResponse.json({ error: 'Invalid filepath' }, { status: 400 });
    
    const absolutePath = path.join(process.cwd(), 'public', 'uploads', safeName);

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
