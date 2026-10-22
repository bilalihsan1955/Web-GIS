import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint pengujian dinonaktifkan di mode produksi.' }, { status: 403 });
  }

  const result = await query<{ count: string }>(`SELECT COUNT(*) as count FROM spatial_nodes`);

  return NextResponse.json({
    status: 'ok',
    total_spatial_nodes: parseInt(result.rows[0]?.count || '0', 10),
  });
}
