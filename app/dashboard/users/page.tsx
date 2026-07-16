'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, Plus, Edit, Trash2, Loader2, UserCog, CheckCircle2, X, Eye, EyeOff, Search, ChevronDown, Map, UserPlus, AlertCircle, ChevronLeft } from 'lucide-react';
import UserMapPreviewModal from '@/components/admin/UserMapPreviewModal';
import CompanyGrid from '@/components/admin/CompanyGrid';
import { useDashboardStore } from '@/store/useDashboardStore';
import Modal from '@/components/ui/Modal';

interface AppUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  parent_admin_id?: string | null;
  parent_admin_email?: string | null;
}

export default function UsersManagementPage() {
  const { t, language } = useLanguage();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useDashboardStore((s) => s.setSelectedCompanyId);
  const userRoleFromStore = useDashboardStore((s) => s.userRole);
  const effectiveRole = userRole === 'superadmin' ? 'superadmin' : (userRoleFromStore || (isMounted && typeof window !== 'undefined' ? localStorage.getItem('webgis_user_role') : null) || userRole);
  const isSuperadminGlobal = effectiveRole === 'superadmin' && selectedCompanyId === 'all';
  const [adminGroups, setAdminGroups] = useState<{user_id: string, company_name: string | null, email: string, company_logo: string | null, company_slug: string | null}[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMapPreviewOpen, setIsMapPreviewOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [previewUser, setPreviewUser] = useState<AppUser | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    checkAccessAndFetch();
  }, []);

  async function checkAccessAndFetch() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleData?.role !== 'superadmin' && roleData?.role !== 'admin') {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    setUserRole(roleData.role);

    if (roleData.role === 'superadmin') {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id, company_name, email, company_logo, company_slug')
        .eq('role', 'admin')
        .is('parent_admin_id', null)
        .order('company_name', { ascending: true });
      if (admins) {
        setAdminGroups(admins);
      }
    }

    fetchUsers();
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/dashboard/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const parentAdminId = userRole === 'superadmin' && selectedCompanyId !== 'all' ? selectedCompanyId : null;
      
      const res = await fetch('/api/dashboard/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, parentAdminId })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setModalLoading(true);
    setModalError('');

    try {
      const res = await fetch('/api/dashboard/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role, email, password: password || undefined })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const openDeleteModal = async (u: AppUser) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === u.id) {
      // Create a visually coherent way to deny self-deletion without browser alerts
      setModalError("You cannot delete your own account.");
      setUserToDelete(null);
      return;
    }
    
    setUserToDelete(u);
    setModalError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setModalLoading(true);
    setModalError('');
    
    try {
      const res = await fetch('/api/dashboard/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id })
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error deleting user.');
    } finally {
      setModalLoading(false);
    }
  };

  const openCreateModal = () => {
    setEmail('');
    setPassword('');
    setRole('user');
    setShowPassword(false);
    setModalError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (u: AppUser) => {
    setSelectedUser(u);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setModalError('');
    setIsEditModalOpen(true);
  };

  const openMapPreview = (u: AppUser) => {
    setPreviewUser(u);
    setIsMapPreviewOpen(true);
  };


  if (isAdmin === false) {
    return (
      <div className="flex h-full min-h-[80vh] flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/20 border border-red-500/30 p-6 rounded-full mb-6 shadow-inner">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 drop- dark:">{t('accessDenied') || 'Access Denied'}</h1>
        <p className="text-zinc-300 max-w-md mx-auto">
          You do not have the required Super Admin privileges to view or manage system users.
        </p>
      </div>
    );
  }

  const createModalContent = (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={() => setIsCreateModalOpen(false)}
      title={t('createNewUser') || 'Create New User'}
      icon={<UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleCreateUser} className="space-y-4">
        {modalError && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {modalError}
          </div>
        )}
        <div>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} spellCheck={false} autoComplete="off" placeholder={t('emailAddress') || 'Email Address'} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all " />
        </div>
        <div className="relative">
          <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('temporaryPassword') || 'Temporary Password'} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 pr-12 focus:ring-1 focus:ring-cyan-500 outline-none transition-all " />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
        {userRole === 'superadmin' ? (
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer">
            <option value="user" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('userStandardAccess') || 'User (Standard Access)'}</option>
            <option value="admin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
              {selectedCompanyId !== 'all' ? (t('coAdminCompanyLevel') || 'Co-Admin (Company Level)') : (t('adminNewCompany') || 'Admin (New Company Owner)')}
            </option>
            {selectedCompanyId === 'all' && (
              <option value="superadmin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('superAdminAccess') || 'Super Admin (System Access)'}</option>
            )}
          </select>
        ) : (
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer">
            <option value="user" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('userStandardAccess') || 'User (Standard Access)'}</option>
            <option value="admin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('coAdminAccess') || 'Co-Admin (Manage Group Maps)'}</option>
          </select>
        )}
        </div>
        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onClick={() => setIsCreateModalOpen(false)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-sm">{t('cancel') || 'Cancel'}</button>
          <button type="submit" disabled={modalLoading} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center disabled:opacity-50 text-sm">
            {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {t('createNewUser') || 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );

  const editModalContent = selectedUser && (
    <Modal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      title={t('editUser') || 'Edit User'}
      icon={<UserCog className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleEditRole} className="space-y-4">
        {modalError && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {modalError}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">{t('emailAddress') || 'Email Address'}</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} spellCheck={false} autoComplete="off" placeholder={t('emailAddress') || 'Email Address'} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all " />
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">New Password (Optional)</label>
          <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 pr-12 focus:ring-1 focus:ring-cyan-500 outline-none transition-all " />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 bottom-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-cyan-400 transition-colors pt-5"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">{t('role') || 'Role'}</label>
        {userRole === 'superadmin' ? (
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer">
            <option value="user" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('userStandardAccess') || 'User (Standard Access)'}</option>
            <option value="admin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('admin360') || 'Admin (360 Map Management)'}</option>
            <option value="superadmin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('superAdminAccess') || 'Super Admin (System Access)'}</option>
          </select>
        ) : (
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer">
            <option value="user" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('userStandardAccess') || 'User (Standard Access)'}</option>
            <option value="admin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{t('coAdminAccess') || 'Co-Admin (Manage Group Maps)'}</option>
          </select>
        )}
        </div>
        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-sm">{t('cancel') || 'Cancel'}</button>
          <button type="submit" disabled={modalLoading} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center disabled:opacity-50 text-sm">
            {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {t('saveChanges') || 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );

  const deleteModalContent = userToDelete && (
    <Modal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      title={t('confirmDeletion') || 'Confirm Deletion'}
      icon={<AlertCircle className="w-5 h-5 text-red-500" />}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <div className="flex justify-center mb-6 mt-2">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-[20px] flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30">
            <Trash2 className="w-8 h-8" />
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">
          Are you sure you want to permanently delete <strong className="text-zinc-900 dark:text-white">{userToDelete.email}</strong>? This cannot be undone.
        </p>

        {modalError && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 text-left">
            {modalError}
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => setIsDeleteModalOpen(false)} 
            disabled={modalLoading}
            className="flex-1 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button 
            onClick={confirmDeleteUser}
            disabled={modalLoading}
            className="flex-1 px-5 py-2.5 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50 "
          >
            {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {t('delete') || 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );

  const filteredUsers = users.filter(user => {
    if (userRole === 'superadmin' && selectedCompanyId !== 'all') {
      if (user.parent_admin_id !== selectedCompanyId && user.id !== selectedCompanyId) {
        return false;
      }
    }
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? user.role.toLowerCase() === roleFilter.toLowerCase() : true;
    return matchesSearch && matchesRole;
  });

  // Prevent hydration mismatch by returning a neutral placeholder during SSR and initial hydration
  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center"></div>
    );
  }

  if (isSuperadminGlobal) {
    return (
      <div className="animate-fade-in pb-12 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-5 ">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t('globalUserManagement') || 'Manajemen Pengguna Global'}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('selectCompanyToViewUsers') || 'Pilih salah satu perusahaan di bawah ini untuk melihat pengguna/karyawannya.'}</p>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center justify-center bg-cyan-50 dark:bg-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 w-full lg:w-auto"
          >
            <UserPlus className="w-5 h-5 mr-2 shrink-0" />
            {t('addNewCompanyAdmin') || 'Tambah Perusahaan Baru (Admin)'}
          </button>
        </div>
        <CompanyGrid adminGroups={adminGroups} onSelect={setSelectedCompanyId} loading={loading} />
        {isMounted && document.body && createPortal(createModalContent, document.body)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans relative">
      
      {/* Top Level Error Display for non-modal actions */}
      {modalError && !isCreateModalOpen && !isEditModalOpen && !isDeleteModalOpen && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20  flex justify-between items-center">
          <span>{modalError}</span>
          <button onClick={() => setModalError('')} className="hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {userRole === 'superadmin' && selectedCompanyId !== 'all' && (
        <div className="flex flex-col gap-3 mb-2">
          <button 
            onClick={() => setSelectedCompanyId('all')}
            className="group flex items-center text-sm font-medium text-zinc-500 hover:text-cyan-600 dark:text-zinc-400 dark:hover:text-cyan-400 transition-colors w-fit bg-zinc-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            {t('backToCompanies') || 'Kembali ke Daftar Perusahaan'}
          </button>
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('managingSpecificCompany') || 'Anda sedang mengelola pengguna untuk satu perusahaan tertentu secara eksklusif.'}
            </p>
          </div>
        </div>
      )}

      {/* Page Context Actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4 relative z-[60] items-stretch lg:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <input 
            type="text" 
            placeholder={t('searchUsers') || 'Search users by email or role...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] w-full outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all "
          />
        </div>

        {/* Custom Role Filter Dropdown */}
        <div className="relative z-[70] w-full sm:w-auto">
          <button
            onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
            className={`flex items-center justify-between w-full sm:w-auto min-w-[170px] min-h-[44px] px-4 py-2.5 rounded-xl border transition-all outline-none
              ${isRoleFilterOpen 
                ? 'bg-zinc-100 border-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white' 
                : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50'}`}
          >
            <span className="font-medium text-sm">{roleFilter ? (roleFilter === 'admin' ? 'Admin' : 'User') : 'All Roles'}</span>
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isRoleFilterOpen ? 'text-cyan-600 dark:text-cyan-400 rotate-180' : 'text-zinc-400'}`} />
          </button>
          
          {isRoleFilterOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setIsRoleFilterOpen(false)} />
              <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-full sm:w-48 z-[101] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg animate-fade-in origin-top">
                {[
                  { value: '', label: 'All Roles' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'user', label: 'User' }
                ].map((roleOption) => (
                  <button
                    key={roleOption.value || 'all'}
                    onClick={() => { setRoleFilter(roleOption.value); setIsRoleFilterOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800
                      ${roleFilter === roleOption.value 
                        ? 'bg-zinc-50 text-zinc-900 dark:bg-zinc-800 dark:text-white font-semibold' 
                        : 'text-zinc-700 dark:text-zinc-300'}`}
                  >
                    {roleOption.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center bg-cyan-50 dark:bg-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 min-h-[44px] w-full sm:w-auto"
        >
          <UserPlus className="w-5 h-5 mr-2 shrink-0" />
          {t('addNewUser') || 'Add New User'}
        </button>
      </div>

      {/* ── DATA TABLE ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px]  overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 font-semibold bg-zinc-100/50 dark:bg-black/20">
                <th className="px-6 py-5">{t('accountEmail') || 'Account Email'}</th>
                <th className="px-6 py-5">{t('systemRole') || 'System Role'}</th>
                {userRole === 'superadmin' && <th className="px-6 py-5">{t('parentAdmin') || 'Parent Admin'}</th>}
                <th className="px-6 py-5">{t('joinedDate') || 'Joined Date'}</th>
                <th className="px-6 py-5 text-right">{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse bg-white/5 border-b border-zinc-100 dark:border-white/5 last:border-0">
                    <td className="px-6 py-5 flex items-center"><div className="h-4 w-4 bg-zinc-200 dark:bg-white/10 rounded-full mr-3 shrink-0"></div><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-48"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-zinc-200 dark:bg-white/10 rounded-full w-24"></div></td>
                    {userRole === 'superadmin' && <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div></td>}
                    <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div></td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <div className="h-9 w-24 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                        <div className="h-9 w-20 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                        <div className="h-9 w-24 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'superadmin' ? 5 : 4} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    {searchQuery ? (t('noUsersFoundSearch') || 'No users found matching your search.') : (t('noUsersFound') || 'No users found.')}
                  </td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 font-medium text-zinc-900 dark:text-white flex items-center drop-">
                    <UserCog className="w-4 h-4 mr-3 text-cyan-700 dark:text-cyan-400" />
                    {u.email}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                      u.role === 'admin' ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30' : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  {userRole === 'superadmin' && (
                    <td className="px-6 py-5 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                      {u.parent_admin_email || '-'}
                    </td>
                  )}
                  <td className="px-6 py-5 text-sm text-zinc-600 dark:text-zinc-300 drop-">
                    {new Date(u.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => openMapPreview(u)}
                        className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-white/10 transition-all font-medium text-sm flex items-center"
                      >
                        <Map className="w-4 h-4 mr-1.5" /> {t('preview') || 'Preview'}
                      </button>
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-white/10 transition-all font-medium text-sm flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1.5" /> {t('edit') || 'Edit'}
                      </button>
                      <button 
                        onClick={() => openDeleteModal(u)}
                        className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-medium text-sm flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" /> {t('delete') || 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render Modals via Portals */}
      {isMounted && document.body && createPortal(createModalContent, document.body)}
      {isMounted && document.body && createPortal(editModalContent, document.body)}
      {isMounted && document.body && createPortal(deleteModalContent, document.body)}
      {isMounted && document.body && createPortal(
        <UserMapPreviewModal 
          isOpen={isMapPreviewOpen} 
          onClose={() => setIsMapPreviewOpen(false)} 
          userId={previewUser?.id || ''} 
          userEmail={previewUser?.email || ''} 
        />, 
        document.body
      )}

    </div>
  );
}
