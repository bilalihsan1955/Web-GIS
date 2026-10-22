import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  try {
    // Perform a lightweight healthcheck query on Docker PostgreSQL Pool
    await query('SELECT 1');

    const latencyMs = Date.now() - startTime;
    return NextResponse.json({
      status: 'ok',
      message: 'Standalone PostgreSQL connection pool is healthy and responsive.',
      timestamp: new Date().toISOString(),
      latencyMs,
    });
  } catch (error: any) {
    console.error('[Healthcheck Error]:', error.message);
    return NextResponse.json(
      {
        status: 'error',
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
