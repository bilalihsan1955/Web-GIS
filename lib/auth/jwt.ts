import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ============================================================================
// lib/auth/jwt.ts: Standalone JWT & Password Security Engine (OWASP A02:2021)
// Protected by 'server-only' (Next.js 16 AppSec) to guarantee zero client bundle leakage
// ============================================================================

export interface AuthSessionPayload {
  userId: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  parentAdminId: string | null;
  companySlug?: string | null;
}

export const AUTH_COOKIE_NAME = 'webgis_auth_token';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_SALT_ROUNDS = 12; // OWASP A02: Work factor >= 12

// Encode secret key for Web Crypto API (jose)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.AUTH_SECRET || 'webgis-standalone-super-secret-key-2026-minimum-32-chars!'
);

/**
 * Sign JWT session token using jose (Web Crypto API)
 */
export async function signAuthToken(payload: AuthSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode JWT session token
 */
export async function verifyAuthToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload as unknown as AuthSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Hash password with bcrypt cost factor >= 12 (OWASP A02:2021)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare plain password against stored bcrypt hash (constant-time comparison)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Attach HttpOnly, Secure, SameSite=Lax cookie to NextResponse
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true, // Immune to JavaScript XSS theft
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF mitigation
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clear auth cookie from NextResponse on logout
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Extract authenticated session from Next.js server context (cookies or Authorization header)
 */
export async function getAuthSession(req?: Request): Promise<AuthSessionPayload | null> {
  // 1. Try reading from Authorization Bearer header if request object is present
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const session = await verifyAuthToken(token);
      if (session) return session;
    }
  }

  // 2. Try reading from HTTP-Only cookie via next/headers
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      return await verifyAuthToken(token);
    }
  } catch {
    // If called outside of request context or in middleware, gracefully fallback
  }

  return null;
}
