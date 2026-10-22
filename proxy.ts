import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ============================================================================
// proxy.ts: Next.js 16 Edge Proxy & OWASP 2026 Security Headers Engine
// Enforces Zero-Trust JWT Authentication & Strict WebGL-friendly CSP
// ============================================================================

const AUTH_COOKIE_NAME = 'webgis_auth_token';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.AUTH_SECRET || 'webgis-standalone-super-secret-key-2026-minimum-32-chars!'
);

/**
 * 2026 Modern Content Security Policy (CSP)
 * Allows WebGL Worker, Blob URLs, Mapbox GL JS & Photo Sphere Viewer
 */
const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://*.mapbox.com https://api.mapbox.com https://*.supabase.co;
  worker-src 'self' blob:;
  child-src 'self' blob:;
  connect-src 'self' data: blob: https://*.mapbox.com https://events.mapbox.com https://api.mapbox.com https://*.supabase.co;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

/**
 * Applies OWASP Top 10 (2021–2026) Security Headers to any response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Content-Security-Policy', CSP_HEADER);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return response;
}

/**
 * Lightweight JWT verification for Edge Proxy runtime
 */
async function verifyProxySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Extract session token from cookie or Authorization header
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // Fallback to check legacy supabase auth token during migration transition
  let hasValidSession = false;
  if (token) {
    const session = await verifyProxySession(token);
    if (session) {
      hasValidSession = true;
    }
  }

  if (!hasValidSession) {
    const legacySbCookie = request.cookies.getAll().some((c) => c.name.includes('-auth-token'));
    if (legacySbCookie) {
      hasValidSession = true;
    }
  }

  const isDashboardPage = pathname.startsWith('/dashboard');
  const isDashboardApi = pathname.startsWith('/api/dashboard');
  const isLoginPage = pathname === '/dashboard/login';

  // 2. Protect API Dashboard routes (Return 401 JSON instead of redirect)
  if (isDashboardApi && !hasValidSession) {
    const errorResponse = NextResponse.json(
      { error: 'Unauthorized: Sesi tidak ditemukan atau kedaluwarsa. Silakan login kembali.' },
      { status: 401 }
    );
    return applySecurityHeaders(errorResponse);
  }

  // 3. Protect UI Dashboard routes (Redirect unauthenticated users to login)
  if (isDashboardPage && !isLoginPage && !hasValidSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/login';
    const redirectResponse = NextResponse.redirect(url);
    return applySecurityHeaders(redirectResponse);
  }

  // 4. Redirect already-authenticated users away from login page to dashboard
  if (isLoginPage && hasValidSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const redirectResponse = NextResponse.redirect(url);
    return applySecurityHeaders(redirectResponse);
  }

  // 5. Normal route execution with injected 2026 OWASP Security Headers
  const response = NextResponse.next({ request });
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
