import { useState } from 'react';
import Image from 'next/image';
import { Building2, ChevronRight, Mail, Map, Search, Plus, Eye, EyeOff, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/utils/supabase/client';

interface CompanyGroup {
  user_id: string;
  company_name: string | null;
  email: string;
  company_logo: string | null;
  company_slug: string | null;
}

interface CompanyGridProps {
  adminGroups: CompanyGroup[];
  onSelect: (id: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function CompanyGrid({ adminGroups, onSelect, loading, onRefresh }: CompanyGridProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // ── Add Client / Company Modal State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // ── Delete Client / Company Modal State ──
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyGroup | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const filteredGroups = adminGroups.filter(group => {
    const search = searchQuery.toLowerCase();
    const nameMatch = (group.company_name || '').toLowerCase().includes(search);
    const emailMatch = (group.email || '').toLowerCase().includes(search);
    return search === '' || nameMatch || emailMatch;
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    setModalSuccess('');

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      // 1. Create Admin User for company
      const res = await fetch('/api/dashboard/create-user', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: 'admin',
          parentAdminId: null
        })
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        // empty or non-json response
      }
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun admin perusahaan');

      const createdUserId = data.user?.id;
      if (!createdUserId) throw new Error('ID pengguna baru tidak ditemukan.');

      // 2. Upload Logo if selected
      let uploadedLogoUrl = '';
      if (logoFile) {
        try {
          const formData = new FormData();
          formData.append('file', logoFile);
          const uploadHeaders: Record<string, string> = {};
          if (token) {
            uploadHeaders['Authorization'] = `Bearer ${token}`;
          }
          const logoRes = await fetch('/api/upload-logo', {
            method: 'POST',
            headers: uploadHeaders,
            body: formData
          });
          const logoText = await logoRes.text();
          const logoData = logoText ? JSON.parse(logoText) : {};
          if (logoRes.ok && logoData.url) {
            uploadedLogoUrl = logoData.url;
          }
        } catch (logoErr) {
          console.warn('Logo upload error:', logoErr);
        }
      }

      // 3. Save Company Profile (Name, Description, Logo)
      const profileRes = await fetch('/api/dashboard/company-profile', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          target_admin_id: createdUserId,
          company_name: newCompanyName,
          company_description: newDescription,
          company_logo: uploadedLogoUrl
        })
      });

      if (!profileRes.ok) {
        let profileError = 'Gagal menyimpan data nama dan deskripsi perusahaan';
        try {
          const profileText = await profileRes.text();
          const profileData = profileText ? JSON.parse(profileText) : {};
          if (profileData.error) profileError = profileData.error;
        } catch {
          // non-json response body
        }
        throw new Error(profileError);
      }

      setModalSuccess(`Perusahaan "${newCompanyName}" berhasil ditambahkan!`);
      
      // Reset form
      setNewCompanyName('');
      setNewEmail('');
      setNewPassword('');
      setNewDescription('');
      setLogoFile(null);
      setLogoPreview('');

      setTimeout(() => {
        setIsAddModalOpen(false);
        setModalSuccess('');
        if (onRefresh) onRefresh();
      }, 1200);

    } catch (err: any) {
      console.error('Failed to create company:', err);
      let errMsg = err.message || 'Gagal menambahkan perusahaan baru';
      if (errMsg.includes('already been registered') || errMsg.includes('already registered')) {
        errMsg = 'Email ini sudah terdaftar di sistem. Silakan gunakan alamat email lain.';
      }
      setModalError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyToDelete) return;

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/dashboard/users', {
        method: 'DELETE',
        headers: authHeaders,
        body: JSON.stringify({
          userId: companyToDelete.user_id,
          confirmEmail: confirmDeleteEmail
        })
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        // empty response
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus perusahaan');
      }

      setIsDeleteModalOpen(false);
      setCompanyToDelete(null);
      setConfirmDeleteEmail('');
      if (onRefresh) onRefresh();

    } catch (err: any) {
      console.error('Failed to delete company:', err);
      setDeleteError(err.message || 'Gagal menghapus perusahaan');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-500 shrink-0" />
            {t('companyDirectory') || 'Direktori Perusahaan (Klien)'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('companyDirectoryDesc') || 'Pilih salah satu perusahaan di bawah ini untuk masuk ke mode kelola dan mengunggah peta untuk mereka.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
          <div className="w-full sm:w-64 relative shrink-0">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder={t('searchCompany') || 'Cari perusahaan atau email...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner placeholder-zinc-400 text-sm"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-bold text-sm transition-all shadow-md shadow-cyan-600/20 w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>{t('addNewCompanyAdmin') || 'Tambah Perusahaan Baru'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-[24px] p-6 border border-zinc-200 dark:border-zinc-800 animate-pulse flex flex-col h-[180px]">
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-white/10 shrink-0"></div>
                <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                  <div className="h-6 bg-zinc-200 dark:bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-200 dark:bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-white/5 flex justify-between">
                <div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div>
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-white/10"></div>
              </div>
            </div>
          ))
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.user_id}
              onClick={() => onSelect(group.user_id)}
              className="group flex flex-col text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-6 hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden cursor-pointer"
            >
              {/* Delete Button (Hover Action) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompanyToDelete(group);
                    setConfirmDeleteEmail('');
                    setDeleteError('');
                    setIsDeleteModalOpen(true);
                  }}
                  title="Hapus Perusahaan"
                  className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4 relative z-10 pr-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                  {group.company_logo ? (
                    <Image src={group.company_logo} alt={group.company_name || 'Logo'} width={48} height={48} className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <div className="w-full h-full p-1 flex items-center justify-center relative">
                      <Image src="/Logo.webp" alt={group.company_name || 'Logo'} width={48} height={48} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white truncate">
                    {group.company_name || t('unnamed') || 'Tanpa Nama'}
                  </h3>
                  <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                    <Mail className="w-3 h-3 mr-1.5 shrink-0" />
                    <span className="truncate">{group.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between relative z-10">
                <span className="inline-flex items-center text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                  <Map className="w-3.5 h-3.5 mr-1.5" />{t('manageMap') || 'Kelola Peta'}
                </span>
                <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
        {!loading && filteredGroups.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-[24px] border border-dashed border-zinc-300 dark:border-zinc-700">
            {searchQuery ? (t('companyNotFound') || 'Perusahaan tidak ditemukan.') : (t('noClients') || 'Belum ada Klien (Admin) yang terdaftar.')}
          </div>
        )}
      </div>

      {/* ── Modal Tambah Perusahaan (Klien) Baru ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !modalLoading && setIsAddModalOpen(false)}
        title={t('addNewCompanyAdmin') || 'Tambah Perusahaan (Klien) Baru'}
        icon={<Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          
          {/* Logo Upload Box */}
          <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
              {logoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-8 h-8 text-zinc-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Logo Perusahaan (Opsional)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoSelect}
                className="text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-50 file:text-cyan-700 dark:file:bg-cyan-500/20 dark:file:text-cyan-300 hover:file:bg-cyan-100 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Nama Perusahaan / Klien <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="misal: Universitas Brawijaya / PT Pelindo"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Email Admin Perusahaan <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="admin@perusahaan.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Kata Sandi Sementara <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Deskripsi Singkat (Opsional)
            </label>
            <input
              type="text"
              placeholder="misal: Instansi Pendidikan / Sektor Infrastruktur"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {modalError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs border border-red-500/20">
              {modalError}
            </div>
          )}

          {modalSuccess && (
            <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl text-xs border border-emerald-500/20 font-bold">
              {modalSuccess}
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={modalLoading}
              className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={modalLoading || !newCompanyName || !newEmail || !newPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Tambah Perusahaan</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* ── Modal Hapus Perusahaan (Klien) ── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteLoading && setIsDeleteModalOpen(false)}
        title="Hapus Perusahaan (Klien)"
        icon={<Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleDeleteCompany} className="space-y-4">
          
          {/* Target Company Info Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden relative">
              {companyToDelete?.company_logo ? (
                <Image src={companyToDelete.company_logo} alt="Logo" width={48} height={48} className="w-full h-full object-contain p-0.5" />
              ) : (
                <Image src="/Logo.webp" alt="Logo" width={48} height={48} className="w-full h-full object-contain p-0.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                {companyToDelete?.company_name || 'Tanpa Nama'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {companyToDelete?.email}
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div>
              <span className="font-bold block mb-1">PERINGATAN PERMANEN!</span>
              Penghapusan ini tidak dapat dibatalkan. Seluruh data peta spasial, foto panorama 360°, titik lokasi, serta seluruh akun anggota pengguna di bawah perusahaan ini akan terhapus secara permanen dari database dan storage.
            </div>
          </div>

          {/* Email Confirmation Field */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Ketik email perusahaan <span className="font-mono font-bold text-red-500">({companyToDelete?.email})</span> untuk mengonfirmasi:
            </label>
            <input
              type="email"
              required
              placeholder={companyToDelete?.email || 'admin@perusahaan.com'}
              value={confirmDeleteEmail}
              onChange={(e) => setConfirmDeleteEmail(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-red-500 font-mono"
            />
          </div>

          {deleteError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs border border-red-500/20">
              {deleteError}
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteLoading}
              className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={deleteLoading || confirmDeleteEmail !== companyToDelete?.email}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Hapus Perusahaan</span>
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
}
