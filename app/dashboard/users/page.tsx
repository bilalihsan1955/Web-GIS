'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert, Plus, Edit, Trash2, Loader2, UserCog, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';

interface AppUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersManagementPage() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  
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
    if (roleData?.role !== 'admin') {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
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
      const res = await fetch('/api/dashboard/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
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
        body: JSON.stringify({ userId: selectedUser.id, role })
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
      setModalError("You cannot delete your own admin account.");
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
    setRole(u.role);
    setModalError('');
    setIsEditModalOpen(true);
  };


  if (isAdmin === false) {
    return (
      <div className="flex h-full min-h-[80vh] flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/20 border border-red-500/30 p-6 rounded-full mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="h-16 w-16 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">Access Denied</h1>
        <p className="text-slate-300 max-w-md mx-auto">
          You do not have the required administrative privileges to view or manage system users. Please contact a system administrator.
        </p>
      </div>
    );
  }

  const createModalContent = isCreateModalOpen && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative z-[100000] bg-slate-900/90 border border-white/20 p-8 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Create New User</h3>
          <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleCreateUser} className="space-y-5">
          {modalError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
              {modalError}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-inner" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Temporary Password</label>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-inner" />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">System Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none shadow-inner">
              <option value="user" className="bg-slate-900 text-white">User (Standard Access)</option>
              <option value="admin" className="bg-slate-900 text-white">Admin (Full Access)</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={modalLoading} className="px-5 py-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-500/30 transition-colors flex items-center disabled:opacity-50 shadow-lg shadow-cyan-500/10">
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const editModalContent = isEditModalOpen && selectedUser && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative z-[100000] bg-slate-900/90 border border-white/20 p-8 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Edit User Role</h3>
          <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleEditRole} className="space-y-5">
          {modalError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
              {modalError}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Account Email</label>
            <input type="text" value={selectedUser.email} disabled className="w-full bg-black/40 border border-white/5 text-slate-500 rounded-xl px-4 py-3 outline-none cursor-not-allowed shadow-inner" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">System Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none shadow-inner">
              <option value="user" className="bg-slate-900 text-white">User (Standard Access)</option>
              <option value="admin" className="bg-slate-900 text-white">Admin (Full Access)</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={modalLoading} className="px-5 py-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-500/30 transition-colors flex items-center disabled:opacity-50 shadow-lg shadow-cyan-500/10">
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const deleteModalContent = isDeleteModalOpen && userToDelete && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative z-[100000] bg-slate-900/90 border border-white/20 p-8 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30 mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-md">Confirm Deletion</h3>
          <p className="text-sm text-slate-400 drop-shadow-sm leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-white">{userToDelete.email}</strong>? This cannot be undone.
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
              className="flex-1 px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeleteUser}
              disabled={modalLoading}
              className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50 shadow-lg shadow-red-500/10"
            >
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans relative">
      
      {/* Top Level Error Display for non-modal actions */}
      {modalError && !isCreateModalOpen && !isEditModalOpen && !isDeleteModalOpen && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 shadow-md flex justify-between items-center">
          <span>{modalError}</span>
          <button onClick={() => setModalError('')} className="hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Page Context Actions */}
      <div className="flex items-center justify-end">
        <button 
          onClick={openCreateModal}
          className="flex items-center bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New User
        </button>
      </div>

      {/* ── DATA TABLE ── */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-300 font-semibold bg-black/20">
                <th className="px-6 py-5">Account Email</th>
                <th className="px-6 py-5">System Role</th>
                <th className="px-6 py-5">Joined Date</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse bg-white/5 border-b border-white/5 last:border-0">
                    <td className="px-6 py-5 flex items-center"><div className="h-4 w-4 bg-white/10 rounded-full mr-3 shrink-0"></div><div className="h-4 bg-white/10 rounded w-48"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-white/10 rounded-full w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-24"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-6 bg-white/10 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 font-medium text-white flex items-center drop-shadow-sm">
                    <UserCog className="w-4 h-4 mr-3 text-cyan-400" />
                    {u.email}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-300 drop-shadow-sm">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all font-medium text-sm flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1.5" /> Edit
                      </button>
                      <button 
                        onClick={() => openDeleteModal(u)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" /> Delete
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

    </div>
  );
}
