'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, UserCog, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AppUser } from '@/hooks/useUsersManagement';
import { DeleteUserModal } from './DeleteUserModal';

interface UserModalsProps {
  isMounted: boolean;
  userRole: string;
  selectedCompanyId: string;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (open: boolean) => void;
  selectedUser: AppUser | null;
  userToDelete: AppUser | null;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  role: string;
  setRole: (role: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  confirmEmailInput: string;
  setConfirmEmailInput: (val: string) => void;
  modalLoading: boolean;
  modalError: string;
  handleCreateUser: (e: React.FormEvent) => Promise<void>;
  handleEditRole: (e: React.FormEvent) => Promise<void>;
  confirmDeleteUser: () => Promise<void>;
}

export function UserModals(props: UserModalsProps) {
  const { t } = useLanguage();

  if (!props.isMounted || typeof document === 'undefined') return null;

  const createModal = (
    <Modal
      isOpen={props.isCreateModalOpen}
      onClose={() => props.setIsCreateModalOpen(false)}
      title={t('createNewUser') || 'Tambah Pengguna Baru'}
      icon={<UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={props.handleCreateUser} className="space-y-4">
        {props.modalError && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {props.modalError}
          </div>
        )}
        <div>
          <input
            required
            type="email"
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder={t('emailAddress') || 'Alamat email'}
            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <input
            required
            type={props.showPassword ? 'text' : 'password'}
            value={props.password}
            onChange={(e) => props.setPassword(e.target.value)}
            placeholder={t('temporaryPassword') || 'Kata sandi'}
            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 pr-12 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => props.setShowPassword(!props.showPassword)}
            aria-label={props.showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            {props.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <select
            value={props.role}
            onChange={(e) => props.setRole(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="user" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
              {t('userStandardAccess') || 'Pengguna (Staf Lapangan)'}
            </option>
            <option value="admin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
              {props.selectedCompanyId !== 'all'
                ? t('coAdminCompanyLevel') || 'Admin Perusahaan'
                : t('adminNewCompany') || 'Admin (Pemilik Perusahaan Baru)'}
            </option>
            {props.userRole === 'superadmin' && props.selectedCompanyId === 'all' && (
              <option value="superadmin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                {t('superAdminAccess') || 'Super Administrator'}
              </option>
            )}
          </select>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => props.setIsCreateModalOpen(false)}
            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-sm"
          >
            {t('cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            disabled={props.modalLoading}
            className="w-full sm:w-auto px-5 py-2.5 justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all flex items-center disabled:opacity-50 text-sm"
          >
            {props.modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {t('createNewUser') || 'Buat akun'}
          </button>
        </div>
      </form>
    </Modal>
  );

  const editModal = props.selectedUser && (
    <Modal
      isOpen={props.isEditModalOpen}
      onClose={() => props.setIsEditModalOpen(false)}
      title={t('editUser') || 'Edit Pengguna'}
      icon={<UserCog className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={props.handleEditRole} className="space-y-4">
        {props.modalError && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {props.modalError}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">
            {t('emailAddress') || 'Alamat email'}
          </label>
          <input
            required
            type="email"
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">
            Kata sandi baru (Opsional)
          </label>
          <input
            type={props.showPassword ? 'text' : 'password'}
            value={props.password}
            onChange={(e) => props.setPassword(e.target.value)}
            placeholder="Biarkan kosong jika tidak diubah"
            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl px-4 py-3 pr-12 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => props.setShowPassword(!props.showPassword)}
            className="absolute inset-y-0 bottom-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-cyan-600 transition-colors pt-5"
          >
            {props.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 ml-1">
            {t('role') || 'Peran'}
          </label>
          <select
            value={props.role}
            onChange={(e) => props.setRole(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="user" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
              {t('userStandardAccess') || 'Pengguna (Staf Lapangan)'}
            </option>
            <option value="admin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
              {t('admin360') || 'Admin Perusahaan'}
            </option>
            {props.userRole === 'superadmin' && (
              <option value="superadmin" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                {t('superAdminAccess') || 'Super Administrator'}
              </option>
            )}
          </select>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => props.setIsEditModalOpen(false)}
            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-sm"
          >
            {t('cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            disabled={props.modalLoading}
            className="w-full sm:w-auto px-5 py-2.5 justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all flex items-center disabled:opacity-50 text-sm"
          >
            {props.modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {t('save') || 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );

  return (
    <>
      {createPortal(createModal, document.body)}
      {editModal && createPortal(editModal, document.body)}
      <DeleteUserModal
        isMounted={props.isMounted}
        isOpen={props.isDeleteModalOpen}
        onClose={() => props.setIsDeleteModalOpen(false)}
        userToDelete={props.userToDelete}
        confirmEmailInput={props.confirmEmailInput}
        setConfirmEmailInput={props.setConfirmEmailInput}
        modalLoading={props.modalLoading}
        modalError={props.modalError}
        confirmDeleteUser={props.confirmDeleteUser}
      />
    </>
  );
}
