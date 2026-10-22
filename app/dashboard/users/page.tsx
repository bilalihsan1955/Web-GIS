'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  ShieldAlert,
  Search,
  ChevronDown,
  UserPlus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Map,
  X,
} from 'lucide-react';
import UserMapPreviewModal from '@/components/admin/UserMapPreviewModal';
import CompanyGrid from '@/components/admin/CompanyGrid';
import { useUsersManagement } from '@/hooks/useUsersManagement';
import { UserModals } from '@/components/admin/users/UserModals';

// ============================================================================
// app/dashboard/users/page.tsx: Presentational Users Management (< 230 lines)
// Decoupled from Supabase — Connects to Standalone PostgreSQL via useUsersManagement
// ============================================================================

export default function UsersManagementPage() {
  const { t } = useLanguage();
  const m = useUsersManagement();

  if (m.isAdmin === false) {
    return (
      <div className="flex h-full min-h-[80vh] flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/20 border border-red-500/30 p-6 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">{t('accessDenied') || 'Akses Ditolak'}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Anda tidak memiliki hak akses administrator untuk mengelola pengguna sistem.
        </p>
      </div>
    );
  }

  if (m.isSuperadminGlobal) {
    return (
      <div className="space-y-6 animate-fade-in pb-12 font-sans">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-5">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t('globalUserManagement') || 'Manajemen Pengguna Global'}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Pilih salah satu perusahaan di bawah ini untuk melihat pengguna/karyawannya.</p>
          </div>
          <button
            onClick={m.openCreateModal}
            className="flex items-center justify-center bg-cyan-50 dark:bg-cyan-500/20 hover:bg-cyan-100 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 w-full lg:w-auto"
          >
            <UserPlus className="w-5 h-5 mr-2 shrink-0" />
            {t('addNewCompanyAdmin') || 'Tambah Perusahaan Baru (Admin)'}
          </button>
        </div>
        <CompanyGrid adminGroups={m.adminGroups} onSelect={m.setSelectedCompanyId} loading={m.loading} />
        <UserModals {...m} />
      </div>
    );
  }

  const roleClass = (r: string) =>
    r === 'superadmin'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
      : r === 'admin'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans relative">
      {m.modalError && !m.isCreateModalOpen && !m.isEditModalOpen && !m.isDeleteModalOpen && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 flex justify-between items-center">
          <span>{m.modalError}</span>
          <button onClick={() => m.modalError && m.checkAccessAndFetch()} className="hover:text-red-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {m.userRole === 'superadmin' && m.selectedCompanyId !== 'all' && (
        <div className="flex flex-col gap-3 mb-2">
          <button
            onClick={() => m.setSelectedCompanyId('all')}
            className="group flex items-center text-sm font-medium text-zinc-500 hover:text-cyan-600 transition-colors w-fit bg-zinc-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            {t('backToCompanies') || 'Kembali ke Daftar Perusahaan'}
          </button>
          <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Anda sedang mengelola pengguna untuk satu perusahaan tertentu secara eksklusif.
            </p>
          </div>
        </div>
      )}

      {/* Page Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4 relative z-[60] items-stretch lg:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder={t('searchUsers') || 'Cari pengguna berdasarkan email atau peran...'}
            value={m.searchQuery}
            onChange={(e) => m.setSearchQuery(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 w-full outline-none focus:border-cyan-500"
          />
        </div>

        {/* Role Filter */}
        <div className="relative z-[70] w-full sm:w-auto">
          <button
            onClick={() => m.setIsRoleFilterOpen(!m.isRoleFilterOpen)}
            className="flex items-center justify-between w-full sm:w-auto min-w-[170px] min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm"
          >
            <span>{m.roleFilter ? (m.roleFilter === 'admin' ? 'Admin' : 'User') : 'Semua peran'}</span>
            <ChevronDown className="w-4 h-4 ml-2 text-zinc-400" />
          </button>
          {m.isRoleFilterOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => m.setIsRoleFilterOpen(false)} />
              <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-full sm:w-48 z-[101] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                {[{ value: '', label: 'Semua peran' }, { value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }].map((opt) => (
                  <button
                    key={opt.value || 'all'}
                    onClick={() => { m.setRoleFilter(opt.value); m.setIsRoleFilterOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={m.openCreateModal}
          className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('createNewUser') || 'Tambah pengguna'}
        </button>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">{t('users') || 'Pengguna'}</th>
                <th className="px-6 py-4">{t('role') || 'Peran'}</th>
                <th className="px-6 py-4">{t('joinedDate') || 'Terdaftar'}</th>
                <th className="px-6 py-4 text-right">{t('actions') || 'Aksi'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {m.loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">Memuat data pengguna...</td></tr>
              ) : m.paginatedUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">Tidak ada pengguna yang sesuai.</td></tr>
              ) : (
                m.paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-white">{u.email}</div>
                      {u.parent_admin_email && <div className="text-xs text-zinc-400 mt-0.5">Admin: {u.parent_admin_email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleClass(u.role)}`}>
                        {u.role === 'superadmin' ? 'Superadmin' : u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => { m.setPreviewUser(u); m.setIsMapPreviewOpen(true); }} title="Lihat Peta" className="p-1.5 text-zinc-400 hover:text-cyan-600 rounded-lg">
                        <Map className="w-4 h-4" />
                      </button>
                      <button onClick={() => m.openEditModal(u)} title="Edit Peran" className="p-1.5 text-zinc-400 hover:text-blue-600 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => m.openDeleteModal(u)} title="Hapus Akun" className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {m.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <span className="text-xs text-zinc-500">Halaman {m.currentPage} dari {m.totalPages}</span>
            <div className="flex gap-1">
              <button disabled={m.currentPage <= 1} onClick={() => m.setCurrentPage((p) => Math.max(1, p - 1))} className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30">
                <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <button disabled={m.currentPage >= m.totalPages} onClick={() => m.setCurrentPage((p) => Math.min(m.totalPages, p + 1))} className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30">
                <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      <UserModals {...m} />

      {m.isMapPreviewOpen && m.previewUser && (
        <UserMapPreviewModal
          isOpen={m.isMapPreviewOpen}
          onClose={() => m.setIsMapPreviewOpen(false)}
          userId={m.previewUser.id}
          userEmail={m.previewUser.email}
        />
      )}
    </div>
  );
}
