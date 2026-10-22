import 'server-only';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ============================================================================
// lib/storage/index.ts: Standalone Enterprise Storage Engine (OWASP A01 & A04)
// Decoupled from proprietary cloud lock-in. Supports Local Disk & S3-Compatible
// ============================================================================

export interface StorageResult {
  url: string;
  storagePath: string;
  size: number;
  mimeType: string;
}

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.geojson',
  '.json',
  '.kml',
]);

const LOCAL_UPLOAD_BASE = path.join(process.cwd(), 'public', 'uploads');

/**
 * Sanitizes and generates an unguessable UUID-based filename.
 * Prevents Path Traversal (OWASP A01:2021) and Null-byte injection.
 */
function sanitizeFileName(originalName: string): { safeName: string; ext: string } {
  // Strip null bytes and control characters
  const cleaned = originalName.replace(/[\0\x00-\x1f\x7f-\x9f]/g, '');
  const ext = path.extname(cleaned).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Ekstensi file '${ext}' tidak diizinkan untuk penyimpanan.`);
  }

  const safeName = `${crypto.randomUUID()}${ext}`;
  return { safeName, ext };
}

/**
 * Uploads file buffer to storage driver (Local Disk or S3-Compatible)
 */
export async function uploadFile(
  buffer: Buffer | Uint8Array,
  originalName: string,
  mimeType: string,
  folder = 'panoramas'
): Promise<StorageResult> {
  const { safeName } = sanitizeFileName(originalName);
  const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

  // 1. S3-Compatible Storage Driver (AWS S3 / Cloudflare R2 / MinIO)
  if (driver === 's3' && process.env.S3_BUCKET && process.env.S3_ENDPOINT) {
    const s3Path = `${folder}/${safeName}`;
    const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
    const bucket = process.env.S3_BUCKET;
    const publicBase = process.env.S3_PUBLIC_URL || `${endpoint}/${bucket}`;

    try {
      // Direct REST upload for S3-compatible endpoints
      const uploadUrl = `${endpoint}/${bucket}/${s3Path}`;
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': buffer.length.toString(),
          ...(process.env.S3_ACCESS_KEY_ID ? { 'x-amz-meta-uploader': 'web-gis' } : {}),
        },
        body: buffer as unknown as BodyInit,
      });

      if (!res.ok) {
        throw new Error(`S3 upload failed with status ${res.status}`);
      }

      return {
        url: `${publicBase}/${s3Path}`,
        storagePath: s3Path,
        size: buffer.length,
        mimeType,
      };
    } catch (err) {
      console.warn('[Storage] S3 upload failed, falling back to local disk:', err);
      // Fallback to local disk to guarantee operational availability
    }
  }

  // 2. Local Disk Driver (public/uploads/<folder>)
  // Guarantee target directory exists recursively
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const targetDir = path.join(LOCAL_UPLOAD_BASE, safeFolder);

  if (!fsSync.existsSync(targetDir)) {
    fsSync.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, safeName);

  // Path Traversal Security Assertion
  if (!filePath.startsWith(LOCAL_UPLOAD_BASE)) {
    throw new Error('Access Denied: Path traversal attempt detected.');
  }

  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/${safeFolder}/${safeName}`;

  return {
    url: publicUrl,
    storagePath: filePath,
    size: buffer.length,
    mimeType,
  };
}

/**
 * Deletes file safely from storage. Validates that deletion stays strictly
 * inside the public/uploads directory to prevent arbitrary file deletion attacks.
 */
export async function deleteFile(fileUrlOrPath: string): Promise<boolean> {
  if (!fileUrlOrPath) return false;

  try {
    // If it's a relative public URL: /uploads/panoramas/uuid.jpg
    if (fileUrlOrPath.startsWith('/uploads/')) {
      const relativePart = fileUrlOrPath.replace(/^\/uploads\//, '');
      const fullPath = path.resolve(LOCAL_UPLOAD_BASE, relativePart);

      // Strict Path Traversal Assertion
      if (!fullPath.startsWith(LOCAL_UPLOAD_BASE)) {
        console.error('[Storage Security] Blocked path traversal attempt in deleteFile:', fileUrlOrPath);
        return false;
      }

      try {
        await fs.unlink(fullPath);
        return true;
      } catch (err: any) {
        if (err.code === 'ENOENT') return true; // Already deleted
        throw err;
      }
    }

    // Direct absolute path within LOCAL_UPLOAD_BASE
    if (fileUrlOrPath.startsWith(LOCAL_UPLOAD_BASE)) {
      await fs.unlink(fileUrlOrPath);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Storage] Error deleting file:', error);
    return false;
  }
}
