'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AppUser } from '@/hooks/useUsersManagement';

interface DeleteUserModalProps {
  isMounted: boolean;
  isOpen: boolean;
  onClose: () => void;
  userToDelete: AppUser | null;
  confirmEmailInput: string;
  setConfirmEmailInput: (val: string) => void;
  modalLoading: boolean;
  modalError: string;
  confirmDeleteUser: () => Promise<void>;
}

export function DeleteUserModal(props: DeleteUserModalProps) {
  const { t } = useLanguage();

  if (!props.isMounted || typeof document === 'undefined' || !props.userToDelete) return null;

  const isTargetCompanyOwner = props.userToDelete.role === 'admin' && !props.userToDelete.parent_admin_id;

  const content = (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={isTargetCompanyOwner ? 'Hapus Perusahaan & Seluruh Data' : 'Hapus Pengguna'}
      icon={<AlertCircle className="w-5 h-5 text-red-500" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {props.modalError && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {props.modalError}
          </div>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {isTargetCompanyOwner
            ? `Tindakan ini akan menghapus akun perusahaan ${props.userToDelete.email} beserta seluruh data titik spasial, lokasi, dan staf terafiliasi.`
            : `Apakah Anda yakin ingin menghapus akun ${props.userToDelete.email}?`}
        </p>

        {isTargetCompanyOwner && (
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Ketikkan email perusahaan untuk konfirmasi:
            </label>
            <input
              type="email"
              value={props.confirmEmailInput}
              onChange={(e) => props.setConfirmEmailInput(e.target.value)}
              placeholder={props.userToDelete.email}
              className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 rounded-xl transition-colors text-sm"
          >
            {t('cancel') || 'Batal'}
          </button>
          <button
            type="button"
            disabled={props.modalLoading || (isTargetCompanyOwner && props.confirmEmailInput !== props.userToDelete.email)}
            onClick={props.confirmDeleteUser}
            className="w-full sm:w-auto px-5 py-2.5 justify-center bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center disabled:opacity-50 text-sm"
          >
            {props.modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {isTargetCompanyOwner ? 'Hapus perusahaan' : 'Hapus akun'}
          </button>
        </div>
      </div>
    </Modal>
  );

  return createPortal(content, document.body);
}
