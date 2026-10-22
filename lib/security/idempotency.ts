import 'server-only';
import { NextResponse } from 'next/server';

// ============================================================================
// lib/security/idempotency.ts: Idempotency Key Guard for Mutation & Upload APIs
// Prevents duplicate record creation from double-clicks or network retries
// ============================================================================

interface IdempotencyRecord {
  status: 'processing' | 'completed';
  responseBody?: any;
  statusCode?: number;
  createdAt: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

// TTL: Evict entries older than 10 minutes
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 300000);

export function checkIdempotency(req: Request): {
  idempotencyKey: string | null;
  cachedResponse: NextResponse | null;
} {
  const key = req.headers.get('x-idempotency-key') || req.headers.get('idempotency-key');
  if (!key) {
    return { idempotencyKey: null, cachedResponse: null };
  }

  const record = idempotencyStore.get(key);
  if (!record) {
    // Register as in-flight processing
    idempotencyStore.set(key, { status: 'processing', createdAt: Date.now() });
    return { idempotencyKey: key, cachedResponse: null };
  }

  if (record.status === 'processing') {
    return {
      idempotencyKey: key,
      cachedResponse: NextResponse.json(
        { error: 'Permintaan identik sedang diproses. Mohon tunggu beberapa saat.' },
        { status: 409, headers: { 'Retry-After': '2' } }
      ),
    };
  }

  // Already completed: return idempotent cached response
  return {
    idempotencyKey: key,
    cachedResponse: NextResponse.json(record.responseBody, {
      status: record.statusCode || 200,
      headers: { 'X-Cache-Lookup': 'HIT-IDEMPOTENT' },
    }),
  };
}

export function saveIdempotentResponse(
  key: string | null,
  body: any,
  statusCode = 200
): void {
  if (!key) return;
  idempotencyStore.set(key, {
    status: 'completed',
    responseBody: body,
    statusCode,
    createdAt: Date.now(),
  });
}
