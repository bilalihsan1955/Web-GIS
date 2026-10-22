import { Metadata } from 'next';
import { query } from '@/lib/db';

export async function generateMetadata(
  props: { params: Promise<{ adminId: string }> }
): Promise<Metadata> {
  const params = await props.params;
  const adminId = params.adminId;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let profileData: {
    company_name: string | null;
    company_description: string | null;
    company_slug: string | null;
  } | null = null;

  try {
    if (uuidRegex.test(adminId)) {
      const res = await query<{
        company_name: string | null;
        company_description: string | null;
        company_slug: string | null;
      }>(
        `SELECT company_name, company_description, company_slug FROM user_roles WHERE user_id = $1 LIMIT 1`,
        [adminId]
      );
      if (res.rows[0] && !res.rows[0].company_slug) {
        profileData = res.rows[0];
      }
    } else {
      const res = await query<{
        company_name: string | null;
        company_description: string | null;
        company_slug: string | null;
      }>(
        `SELECT company_name, company_description, company_slug FROM user_roles WHERE company_slug = $1 LIMIT 1`,
        [adminId]
      );
      profileData = res.rows[0] || null;
    }
  } catch (err) {
    console.error('Error fetching metadata for guest map:', err);
  }

  const title = profileData?.company_name ? `${profileData.company_name} — WebGIS` : 'Peta Interaktif — WebGIS';
  const description =
    profileData?.company_description ||
    'Platform pemetaan dan visualisasi tata ruang perusahaan Anda dalam lingkungan 3D interaktif.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default function GuestMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
