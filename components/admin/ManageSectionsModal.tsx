'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Layers } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type Section = {
  id: string;
  name: string;
};

import Modal from '@/components/ui/Modal';

export default function ManageSectionsModal({ 
  isOpen, 
  onClose,
  adminId
}: { 
  isOpen: boolean; 
  onClose: () => void;
  adminId?: string; // If passed, fetch sections for this admin. If not, use logged in user's group.
}) {
  const { t } = useLanguage();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchSections();
    }
  }, [isOpen]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      // Because we have RLS "Users can read group sections"
      // it should automatically return sections belonging to the user's admin group.
      // If we are superadmin, we might need to filter by adminId if provided.
      let query = supabase.from('company_sections').select('*').order('created_at', { ascending: true });
      if (adminId && adminId !== 'all') {
        query = query.eq('created_by', adminId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSections(data || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let creatorId = userData.user.id;
      // If adminId is provided, and we are superadmin, create on behalf of adminId
      if (adminId) {
        creatorId = adminId;
      }

      const { data, error } = await supabase
        .from('company_sections')
        .insert([{ name: newSectionName.trim(), created_by: creatorId }])
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        setSections([...sections, data]);
        setNewSectionName('');
      }
    } catch (err) {
      console.error('Error adding section:', err);
      alert('Gagal menambah sektor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm(t('confirm') + '?')) return;
    try {
      const { error } = await supabase
        .from('company_sections')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setSections(sections.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting section:', err);
      alert('Gagal menghapus sektor');
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const handleEditSection = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const { error } = await supabase
        .from('company_sections')
        .update({ name: editingName.trim() })
        .eq('id', id);
        
      if (error) throw error;
      setSections(sections.map(s => s.id === id ? { ...s, name: editingName.trim() } : s));
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      console.error('Error updating section:', err);
      alert('Gagal memperbarui sektor');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('manageSections')}
      icon={<Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleAddSection} className="flex gap-2">
        <input 
          type="text" 
          value={newSectionName} 
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={t('sectionName')}
          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/20 text-sm text-zinc-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
          disabled={isSubmitting}
        />
        <button 
          type="submit"
          disabled={isSubmitting || !newSectionName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </form>

      <div className="flex flex-col gap-2 mt-4 max-h-[250px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center p-4 text-sm text-zinc-500 dark:text-zinc-400">
            {t('noSections')}
          </div>
        ) : (
          sections.map(section => (
            <div key={section.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
              {editingId === section.id ? (
                <div className="flex flex-1 gap-2 mr-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-white dark:bg-black/20 border border-zinc-300 dark:border-white/20 text-sm text-zinc-900 dark:text-white outline-none focus:border-cyan-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSection(section.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button 
                    onClick={() => handleEditSection(section.id)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-100 px-2 py-1 rounded"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">{section.name}</span>
              )}
              
              {editingId !== section.id && (
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={() => {
                      setEditingId(section.id);
                      setEditingName(section.name);
                    }}
                    className="text-zinc-400 hover:text-cyan-500 transition-colors p-1"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeleteSection(section.id)}
                    className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
