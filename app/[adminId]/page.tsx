import { Metadata } from 'next';
import { query } from '@/lib/db';
import ClientAdminPage from './ClientAdminPage';

// ============================================================================
// app/[adminId]/page.tsx: Public Company Spatial Map with Dynamic Metadata SEO
// Next.js 16 App Router Server Component with Standalone PostgreSQL
// ============================================================================

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ adminId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { adminId } = await params;
  try {
    const res = await query(
      `SELECT company_name, company_description, company_logo 
       FROM user_roles 
       WHERE company_slug = $1 OR user_id::text = $1 
       LIMIT 1`,
      [adminId]
    );
    const data = res.rows[0];
    const title = data?.company_name ? `${data.company_name} - Web-GIS 360°` : 'Peta Interaktif 360° - Web-GIS';
    const description =
      data?.company_description || 'Jelajahi peta spasial interaktif dan dokumentasi foto panorama 360 derajat.';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: data?.company_logo ? [{ url: data.company_logo }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return {
      title: 'Peta Interaktif 360° - Web-GIS',
      description: 'Jelajahi peta spasial interaktif dan dokumentasi foto panorama 360 derajat.',
    };
  }
}

export default async function AdminPage({ params }: PageProps) {
  const { adminId } = await params;

  let is403 = false;
  let is404 = false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    if (uuidRegex.test(adminId)) {
      const res = await query(
        `SELECT user_id, company_slug FROM user_roles WHERE user_id = $1 LIMIT 1`,
        [adminId]
      );
      if (res.rows.length > 0) {
        if (res.rows[0].company_slug) {
          is403 = true;
        }
      } else {
        is404 = true;
      }
    } else {
      const res = await query(
        `SELECT company_slug FROM user_roles WHERE company_slug = $1 LIMIT 1`,
        [adminId]
      );
      if (res.rows.length === 0) {
        is404 = true;
      }
    }
  } catch {
    is404 = true;
  }

  if (is404 || is403) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-center px-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
            is404 ? 'bg-zinc-800/50 text-zinc-400' : 'bg-red-500/10 text-red-500'
          }`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                is404
                  ? 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7'
                  : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              }
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {is404 ? 'Halaman tidak ditemukan' : 'Akses ditolak'}
        </h1>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          {is404
            ? 'Tautan mungkin salah atau perusahaan belum terdaftar.'
            : 'Halaman ini harus diakses menggunakan URL slug khusus perusahaan Anda.'}
        </p>
      </div>
    );
  }

  return <ClientAdminPage adminId={adminId} />;
}
