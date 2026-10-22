'use client';

import React from 'react';
import { Building2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button, Input } from '@/components/ui/GlobalComponents';
import { CompanyGroup } from './CompanyCard';

// ============================================================================
// components/admin/company/CompanyModals.tsx: Add & Delete Company Modals (< 170 lines)
// Clean Architecture: Uses Global Design System with Email Deletion Guard
// ============================================================================

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  success: string;
  newCompanyName: string;
  setNewCompanyName: (val: string) => void;
  newEmail: string;
  setNewEmail: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  newDescription: string;
  setNewDescription: (val: string) => void;
  logoPreview: string;
  handleLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  error,
  success,
  newCompanyName,
  setNewCompanyName,
  newEmail,
  setNewEmail,
  newPassword,
  setNewPassword,
  newDescription,
  setNewDescription,
  logoPreview,
  handleLogoSelect,
  showPassword,
  setShowPassword,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Tambah Perusahaan (Klien) Baru"
      icon={<Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Logo Upload Box */}
        <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
          <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden relative">
            {logoPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Building2 className="w-7 h-7 text-zinc-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Logo perusahaan (opsional)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoSelect}
              className="text-xs text-zinc-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer"
            />
          </div>
        </div>

        <Input
          label="Nama perusahaan"
          placeholder="Contoh: PT Nusantara Teknologi Spasial"
          value={newCompanyName}
          onChange={(e) => setNewCompanyName(e.target.value)}
          required
        />

        <Input
          label="Email admin perusahaan"
          type="email"
          placeholder="admin@perusahaan.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
        />

        <div className="relative">
          <Input
            label="Kata sandi"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimal 6 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-7 text-zinc-400 hover:text-zinc-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Input
          label="Deskripsi perusahaan (opsional)"
          placeholder="Profil singkat bidang usaha atau proyek..."
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />

        {error && <p className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-900/30">{error}</p>}
        {success && <p className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/30">{success}</p>}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Buat perusahaan
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface DeleteCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  company: CompanyGroup | null;
  confirmEmail: string;
  setConfirmEmail: (val: string) => void;
}

export const DeleteCompanyModal: React.FC<DeleteCompanyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  error,
  company,
  confirmEmail,
  setConfirmEmail,
}) => {
  if (!company) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="Hapus Akun Perusahaan"
      icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Tindakan ini akan menghapus permanen data perusahaan <strong>{company.company_name}</strong> beserta seluruh node foto 360°, seksi wilayah, dan akun staf di bawahnya.
        </p>

        <div className="space-y-1.5 p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200/60 dark:border-red-900/30">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Ketik ulang email untuk konfirmasi: <code className="font-mono text-red-600">{company.email}</code>
          </label>
          <Input
            placeholder={company.email}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-xs font-medium text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}

        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="submit"
            isLoading={loading}
            disabled={confirmEmail !== company.email}
          >
            Hapus permanen
          </Button>
        </div>
      </form>
    </Modal>
  );
};
