'use client';

import React, { useState } from 'react';
import { Building2, Search, Plus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { CompanyCard, CompanyGroup } from './company/CompanyCard';
import { AddCompanyModal, DeleteCompanyModal } from './company/CompanyModals';
import { Button, Input } from '@/components/ui/GlobalComponents';

// ============================================================================
// components/admin/CompanyGrid.tsx: Modular Company Directory Orchestrator (< 150 lines)
// Clean Architecture: Uses CompanyCard and CompanyModals for Superadmin Directory
// ============================================================================

interface CompanyGridProps {
  adminGroups: CompanyGroup[];
  onSelect: (id: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function CompanyGrid({ adminGroups, onSelect, loading, onRefresh }: CompanyGridProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // Add Company Modal State
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

  // Delete Company Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyGroup | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const filteredGroups = adminGroups.filter((group) => {
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
      const res = await fetch('/api/dashboard/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: 'admin', parentAdminId: null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun admin perusahaan');

      let uploadedLogoUrl = '';
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const logoRes = await fetch('/api/upload-logo', { method: 'POST', body: formData });
        const logoData = await logoRes.json();
        if (logoRes.ok && logoData.url) uploadedLogoUrl = logoData.url;
      }

      await fetch('/api/dashboard/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_admin_id: data.user?.id,
          company_name: newCompanyName,
          company_description: newDescription,
          company_logo: uploadedLogoUrl,
        }),
      });

      setModalSuccess(`Perusahaan "${newCompanyName}" berhasil dibuat!`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setModalSuccess('');
        if (onRefresh) onRefresh();
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || 'Gagal menambahkan perusahaan baru');
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
      const res = await fetch('/api/dashboard/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: companyToDelete.user_id, confirmEmail: confirmDeleteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus perusahaan');

      setIsDeleteModalOpen(false);
      setCompanyToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus perusahaan');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar with Search and Add Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-none">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-600" /> Direktori perusahaan (klien)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Pilih salah satu perusahaan untuk masuk ke mode kelola peta.</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Input
            placeholder="Cari perusahaan atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button variant="primary" size="md" onClick={() => setIsAddModalOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Tambah perusahaan
          </Button>
        </div>
      </div>

      {/* Grid of Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGroups.map((group) => (
          <CompanyCard
            key={group.user_id}
            group={group}
            onSelect={onSelect}
            onDeleteClick={(g) => {
              setCompanyToDelete(g);
              setConfirmDeleteEmail('');
              setIsDeleteModalOpen(true);
            }}
          />
        ))}
      </div>

      {/* Subcomponent Modals */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateCompany}
        loading={modalLoading}
        error={modalError}
        success={modalSuccess}
        newCompanyName={newCompanyName}
        setNewCompanyName={setNewCompanyName}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        newDescription={newDescription}
        setNewDescription={setNewDescription}
        logoPreview={logoPreview}
        handleLogoSelect={handleLogoSelect}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />

      <DeleteCompanyModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSubmit={handleDeleteCompany}
        loading={deleteLoading}
        error={deleteError}
        company={companyToDelete}
        confirmEmail={confirmDeleteEmail}
        setConfirmEmail={setConfirmDeleteEmail}
      />
    </div>
  );
}
