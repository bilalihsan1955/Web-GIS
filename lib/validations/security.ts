import { z } from 'zod';

// ============================================================================
// lib/validations/security.ts: Application Security Validator (OWASP 2021–2026)
// Prevents BOPLA/Mass Assignment, Stored DOM XSS, File Spoofing & SSRF
// ============================================================================

// ----------------------------------------------------------------------------
// 1. STRICT ZOD DTO SCHEMAS (OWASP API3:2023 - BOPLA / Mass Assignment)
// Strict picking: Any unallowed fields (like injected 'role' or 'created_by') are stripped or rejected.
// ----------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
}).strict();

export const createUserSchema = z.object({
  email: z.string().trim().email('Format email tidak valid').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
  role: z.enum(['user', 'admin']).default('user'),
  parentAdminId: z.string().uuid().nullable().optional(),
}).strict();

export const updateUserSchema = z.object({
  userId: z.string().uuid('ID pengguna harus berformat UUID'),
  role: z.enum(['user', 'admin']).optional(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(6).max(100).optional(),
}).strict();

export const createSectionSchema = z.object({
  name: z.string().trim().min(1, 'Nama sektor/seksi wajib diisi').max(100),
}).strict();

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'Nama lokasi wajib diisi').max(150),
  description: z.string().trim().max(500).optional(),
  section_id: z.string().uuid().nullable().optional(),
}).strict();

export const updateBoundarySchema = z.object({
  id: z.string().uuid('ID boundary harus berupa UUID'),
  name: z.string().trim().min(1).max(150).optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Format warna harus hex (contoh: #06b6d4)').optional(),
  opacity: z.number().min(0).max(1).optional(),
  is_visible: z.boolean().optional(),
}).strict();

// ----------------------------------------------------------------------------
// 2. MAGIC-BYTES FILE VALIDATION (OWASP A04:2021 & A08:2021)
// Verifies true binary file signature to stop executable disguised as .jpg/.png
// ----------------------------------------------------------------------------

export interface MagicByteValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  error?: string;
}

export function validateFileMagicBytes(buffer: Uint8Array | Buffer): MagicByteValidationResult {
  if (!buffer || buffer.length < 8) {
    return { isValid: false, detectedMime: null, error: 'Ukuran berkas terlalu kecil atau korup.' };
  }

  // Check JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: 'image/jpeg' };
  }

  // Check PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: 'image/png' };
  }

  // Check WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, detectedMime: 'image/webp' };
  }

  return {
    isValid: false,
    detectedMime: null,
    error: 'File signature tidak valid. Hanya file gambar JPEG, PNG, dan WEBP asli yang diizinkan.',
  };
}

// ----------------------------------------------------------------------------
// 3. STORED DOM XSS SANITIZATION (OWASP A03:2021)
// Sanitizes strings extracted from EXIF GPS metadata & GeoJSON/KML feature properties
// ----------------------------------------------------------------------------

/**
 * Escapes HTML characters to prevent XSS when rendered in Mapbox & Viewer DOM popups
 */
export function sanitizeHtmlString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitizes all string properties in a GeoJSON feature properties object
 */
export function sanitizeGeoJSONProperties(properties: Record<string, any>): Record<string, any> {
  if (!properties || typeof properties !== 'object') return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    const safeKey = sanitizeHtmlString(key);
    if (typeof value === 'string') {
      cleaned[safeKey] = sanitizeHtmlString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[safeKey] = sanitizeGeoJSONProperties(value);
    } else {
      cleaned[safeKey] = value;
    }
  }

  return cleaned;
}

// ----------------------------------------------------------------------------
// 4. ANTI-SSRF URL VALIDATOR (OWASP A10:2021 & API7:2023)
// Blocks requests targeting internal networks, localhost, or cloud metadata IP
// ----------------------------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function isSafeExternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);

    // Only allow http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return false;
    }

    // Block AWS / GCP / Azure metadata endpoint: 169.254.169.254
    if (hostname === '169.254.169.254') {
      return false;
    }

    // Block private RFC 1918 IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const b1 = parseInt(match[1], 10);
      const b2 = parseInt(match[2], 10);

      if (b1 === 10) return false; // 10.0.0.0/8
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return false; // 172.16.0.0/12
      if (b1 === 192 && b2 === 168) return false; // 192.168.0.0/16
      if (b1 === 127) return false; // 127.0.0.0/8 loopback
      if (b1 === 169 && b2 === 254) return false; // Link-local
    }

    return true;
  } catch {
    return false;
  }
}
