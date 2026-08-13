import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  try {
    const supabase = createAdminClient();

    // Perform a lightweight read query to register activity on Supabase PostgreSQL DB
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[Keep-Alive] Supabase Query Error:', error.message);
      return NextResponse.json(
        {
          status: 'error',
          message: `Supabase query failed: ${error.message}`,
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase keep-alive ping successful. Database activity registered.',
      timestamp: new Date().toISOString(),
      latencyMs,
      recordsFound: data ? data.length : 0,
    });
  } catch (err: any) {
    console.error('[Keep-Alive] Unexpected Error:', err.message);
    return NextResponse.json(
      {
        status: 'error',
        message: err.message || 'Unexpected server error during keep-alive ping',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
