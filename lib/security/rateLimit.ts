import 'server-only';
import { NextResponse } from 'next/server';

// ============================================================================
// lib/security/rateLimit.ts: Sliding-Window Rate Limiter (OWASP API4 & A07)
// Mitigates Brute-Force, Resource Exhaustion & Denial of Service attacks
// ============================================================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes to avoid memory accumulation
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 300000);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export interface RateLimitResult {
  isAllowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks sliding-window rate limit for a specific identifier (IP or user ID)
 */
export function checkRateLimit(
  identifier: string,
  limit = 20,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const resetSeconds = Math.ceil(
    (record.timestamps.length > 0 ? record.timestamps[0] + windowMs - now : windowMs) / 1000
  );

  if (record.timestamps.length >= limit) {
    return {
      isAllowed: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);

  return {
    isAllowed: true,
    limit,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetSeconds,
  };
}

/**
 * Helper to extract client IP address from Next.js request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

/**
 * Applies Rate Limiter to an API Route Handler.
 * Returns HTTP 429 response if limit is exceeded, or null if allowed.
 */
export function enforceRateLimit(
  req: Request,
  actionKey: string,
  limit: number,
  windowMs = 60000
): NextResponse | null {
  const ip = getClientIp(req);
  const identifier = `${actionKey}:${ip}`;
  const result = checkRateLimit(identifier, limit, windowMs);

  if (!result.isAllowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Silakan coba lagi dalam ${result.resetSeconds} detik.`,
        retryAfter: result.resetSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': result.resetSeconds.toString(),
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetSeconds.toString(),
        },
      }
    );
  }

  return null;
}
