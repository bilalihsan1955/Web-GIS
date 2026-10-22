import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/jwt';

// ============================================================================
// app/api/auth/logout/route.ts: Standalone Authentication Logout Endpoint
// Clears HTTP-Only auth session cookie
// ============================================================================

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Berhasil keluar dari sistem.',
  });

  clearAuthCookie(response);
  return response;
}
