import { createAdminClient } from '@/utils/supabase/server';
import ClientAdminPage from './ClientAdminPage';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ params }: { params: { adminId: string } }) {
  // Use Promise.resolve for params compatibility between Next 14 and Next 15
  const resolvedParams = await Promise.resolve(params);
  const adminId = resolvedParams.adminId;
  const adminSupabase = createAdminClient();
  
  let is403 = false;
  let is404 = false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  try {
    if (uuidRegex.test(adminId)) {
      const { data } = await adminSupabase
        .from('user_roles')
        .select('user_id, company_slug')
        .eq('user_id', adminId)
        .single();
        
      if (data) {
        if (data.company_slug) {
          is403 = true;
        }
      } else {
        is404 = true;
      }
    } else {
      const { data } = await adminSupabase
        .from('user_roles')
        .select('company_slug')
        .eq('company_slug', adminId)
        .single();
        
      if (!data) {
        is404 = true;
      }
    }
  } catch (err) {
    is404 = true;
  }

  if (is404 || is403) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-center px-4">
        {is404 ? (
          <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
          {is404 ? 'Halaman Tidak Ditemukan' : 'Akses Ditolak'}
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          {is404 ? 'Tautan mungkin salah atau perusahaan belum terdaftar.' : 'Halaman ini harus diakses menggunakan URL Tautan Khusus (Slug) perusahaan Anda, bukan menggunakan ID bawaan.'}
        </p>
      </div>
    );
  }

  return <ClientAdminPage adminId={adminId} />;
}
