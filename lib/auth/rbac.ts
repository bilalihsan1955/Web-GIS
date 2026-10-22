import 'server-only';
import { getAuthSession, AuthSessionPayload } from './jwt';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ============================================================================
// lib/auth/rbac.ts: Zero-Trust Multi-Tenant Guard (OWASP API1:BOLA & API5:BFLA)
// Enforces server-side tenant isolation without relying on Supabase RLS
// ============================================================================

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Require valid session or throw AuthError (401 Unauthorized)
 */
export async function requireAuth(req?: Request): Promise<AuthSessionPayload> {
  const session = await getAuthSession(req);
  if (!session) {
    throw new AuthError('Unauthorized: Sesi tidak ditemukan atau telah kedaluwarsa.', 401);
  }
  return session;
}

/**
 * Assert caller has administrative privileges (Super Admin or Company Admin).
 * Prevents Broken Function Level Authorization (OWASP API5:BFLA).
 */
export function assertAdminOrSuperAdmin(session: AuthSessionPayload): void {
  if (session.role !== 'superadmin' && session.role !== 'admin') {
    throw new AuthError('Forbidden: Akses ditolak. Memerlukan hak akses administrator.', 403);
  }
}

/**
 * Assert caller is Super Admin.
 */
export function assertSuperAdmin(session: AuthSessionPayload): void {
  if (session.role !== 'superadmin') {
    throw new AuthError('Forbidden: Akses ditolak. Khusus Super Administrator.', 403);
  }
}

/**
 * Resolve all user IDs that belong to the caller's company tenant group.
 * Queries PostgreSQL user_roles table with B-Tree indexed search.
 */
export async function getGroupUserIds(session: AuthSessionPayload): Promise<string[]> {
  if (session.role === 'superadmin') {
    // Superadmin has global visibility; query returns empty array as wildcard indicator
    return [];
  }

  const ownerId = session.parentAdminId || session.userId;

  try {
    const res = await query<{ user_id: string }>(
      `SELECT user_id FROM user_roles WHERE user_id = $1 OR parent_admin_id = $1`,
      [ownerId]
    );

    const ids = res.rows.map((r) => r.user_id);
    if (!ids.includes(ownerId)) ids.push(ownerId);
    if (!ids.includes(session.userId)) ids.push(session.userId);
    return ids;
  } catch (err) {
    console.error('[RBAC] Error resolving group user IDs:', err);
    // Fallback to caller and owner IDs to prevent catastrophic lockout
    return Array.from(new Set([session.userId, ownerId]));
  }
}

/**
 * Verify that a resource owner ID belongs to the caller's tenant group.
 * Prevents Broken Object Level Authorization / IDOR (OWASP API1:BOLA).
 */
export async function verifyTenantOwnership(
  session: AuthSessionPayload,
  resourceOwnerId: string
): Promise<boolean> {
  // 1. Superadmin can access any company's resources
  if (session.role === 'superadmin') {
    return true;
  }

  // 2. Direct owner check
  if (session.userId === resourceOwnerId) {
    return true;
  }

  // 3. Group membership check
  const allowedUserIds = await getGroupUserIds(session);
  return allowedUserIds.includes(resourceOwnerId);
}

/**
 * Standard HTTP Error Response Helper for API Handlers
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error('[API Auth Unhandled Error]', error);
  const isProduction = process.env.NODE_ENV === 'production';
  return NextResponse.json(
    { error: isProduction ? 'Terjadi kesalahan internal server.' : (error as Error).message },
    { status: 500 }
  );
}
