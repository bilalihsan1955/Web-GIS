import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';

export interface AppUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  parent_admin_id?: string | null;
  parent_admin_email?: string | null;
}

export function useUsersManagement() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCoAdmin, setIsCoAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useDashboardStore((s) => s.setSelectedCompanyId);
  const userRoleFromStore = useDashboardStore((s) => s.userRole);

  const effectiveRole =
    userRole === 'superadmin'
      ? 'superadmin'
      : userRoleFromStore ||
        (isMounted && typeof window !== 'undefined' ? localStorage.getItem('webgis_user_role') : null) ||
        userRole;

  const isSuperadminGlobal = effectiveRole === 'superadmin' && selectedCompanyId === 'all';
  const [adminGroups, setAdminGroups] = useState<
    { user_id: string; company_name: string | null; email: string; company_logo: string | null; company_slug: string | null }[]
  >([]);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('[useUsersManagement] Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAccessAndFetch = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const meData = await meRes.json();
      const meUser = meData.user;

      if (!meUser || (meUser.role !== 'superadmin' && meUser.role !== 'admin')) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setCurrentUser(meUser);
      setIsAdmin(true);
      setUserRole(meUser.role);
      setIsCoAdmin(meUser.role === 'admin' && Boolean(meUser.parentAdminId));

      if (meUser.role === 'superadmin') {
        const nodesRes = await fetch('/api/dashboard/nodes');
        if (nodesRes.ok) {
          const nodesData = await nodesRes.json();
          if (nodesData.adminGroups) setAdminGroups(nodesData.adminGroups);
        }
      }

      await fetchUsers();
    } catch (err) {
      console.error('[useUsersManagement] checkAccess error:', err);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    setIsMounted(true);
    checkAccessAndFetch();
  }, [checkAccessAndFetch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, itemsPerPage]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const parentAdminId = userRole === 'superadmin' && selectedCompanyId !== 'all' ? selectedCompanyId : null;

      const res = await fetch('/api/dashboard/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, parentAdminId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal membuat pengguna');

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
        body: JSON.stringify({ userId: selectedUser.id, role, email, password: password || undefined }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui peran');

      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const openDeleteModal = (u: AppUser) => {
    const isTargetCompanyOwner = u.role === 'admin' && !u.parent_admin_id;

    if (currentUser?.id === u.id && !isTargetCompanyOwner) {
      setModalError('Anda tidak dapat menghapus akun Anda sendiri.');
      setUserToDelete(null);
      return;
    }

    setUserToDelete(u);
    setConfirmEmailInput('');
    setModalError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setModalLoading(true);
    setModalError('');

    const isTargetCompanyOwner = userToDelete.role === 'admin' && !userToDelete.parent_admin_id;

    try {
      const bodyPayload: { userId: string; confirmEmail?: string } = { userId: userToDelete.id };
      if (isTargetCompanyOwner) {
        bodyPayload.confirmEmail = confirmEmailInput;
      }

      const res = await fetch('/api/dashboard/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setConfirmEmailInput('');
        fetchUsers();
        if (isTargetCompanyOwner && userRole === 'superadmin') {
          setSelectedCompanyId('all');
          checkAccessAndFetch();
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus pengguna');
      }
    } catch (err: any) {
      setModalError(err.message || 'Kendala jaringan saat menghapus pengguna.');
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
    setShowPassword(false);
    setModalError('');
    setIsEditModalOpen(true);
  };

  // Filtered & Paginated Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = searchQuery === '' || u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === '' || u.role === roleFilter;

      let matchesCompany = true;
      if (userRole === 'superadmin' && selectedCompanyId !== 'all') {
        matchesCompany = u.id === selectedCompanyId || u.parent_admin_id === selectedCompanyId;
      }

      return matchesSearch && matchesRole && matchesCompany;
    });
  }, [users, searchQuery, roleFilter, userRole, selectedCompanyId]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  return {
    isAdmin,
    isCoAdmin,
    userRole,
    users,
    loading,
    isMounted,
    currentUser,
    adminGroups,
    selectedCompanyId,
    setSelectedCompanyId,
    isSuperadminGlobal,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    isRoleFilterOpen,
    setIsRoleFilterOpen,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredUsers,
    paginatedUsers,
    totalPages,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isMapPreviewOpen,
    setIsMapPreviewOpen,
    selectedUser,
    userToDelete,
    previewUser,
    setPreviewUser,
    email,
    setEmail,
    password,
    setPassword,
    role,
    setRole,
    showPassword,
    setShowPassword,
    confirmEmailInput,
    setConfirmEmailInput,
    modalLoading,
    modalError,
    handleCreateUser,
    handleEditRole,
    openDeleteModal,
    confirmDeleteUser,
    openCreateModal,
    openEditModal,
    checkAccessAndFetch,
  };
}
