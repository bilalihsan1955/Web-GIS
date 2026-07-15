import { Metadata } from 'next';
import { createAdminClient } from '@/utils/supabase/server';

export async function generateMetadata(
  props: { params: Promise<{ adminId: string }> }
): Promise<Metadata> {
  const params = await props.params;
  const adminId = params.adminId;
  const adminSupabase = createAdminClient();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let profileData = null;

  try {
    if (uuidRegex.test(adminId)) {
      const { data } = await adminSupabase
        .from('user_roles')
        .select('company_name, company_description')
        .eq('user_id', adminId)
        .single();
      
      // If company_slug exists, it shouldn't be accessed via UUID anyway
      if (data && !data.company_slug) {
        profileData = data;
      }
    } else {
      const { data } = await adminSupabase
        .from('user_roles')
        .select('company_name, company_description')
        .eq('company_slug', adminId)
        .single();
      profileData = data;
    }
  } catch (err) {
    console.error("Error fetching metadata for guest map", err);
  }

  const title = profileData?.company_name ? `${profileData.company_name} — WebGIS` : 'Peta Interaktif — WebGIS';
  const description = profileData?.company_description || 'Platform pemetaan dan visualisasi tata ruang perusahaan Anda dalam lingkungan 3D interaktif.';

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
