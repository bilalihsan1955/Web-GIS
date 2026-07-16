import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Loader2, CheckCircle2, UploadCloud, ChevronDown, Edit } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Modal from '@/components/ui/Modal';

interface EditNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  modalError: string;
  modalLoading: boolean;
  
  editImagePreview: string;
  handleEditImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  editLocationName: string;
  setEditLocationName: (val: string) => void;
  editLocationDescription: string;
  setEditLocationDescription: (val: string) => void;
  adminId?: string;
  editLocationSectionId: string;
  setEditLocationSectionId: (val: string) => void;
  
  editCaptureDate: string;
  setEditCaptureDate: (val: string) => void;
  
  editIsPublished: boolean;
  setEditIsPublished: (val: boolean) => void;
}

export default function EditNodeModal({
  isOpen,
  onClose,
  onSubmit,
  modalError,
  modalLoading,
  editImagePreview,
  handleEditImageSelect,
  editLocationName,
  setEditLocationName,
  editLocationDescription,
  setEditLocationDescription,
  adminId,
  editLocationSectionId,
  setEditLocationSectionId,
  editCaptureDate,
  setEditCaptureDate,
  editIsPublished,
  setEditIsPublished
}: EditNodeModalProps) {
  const { t } = useLanguage();
  const [isEditSectionDropdownOpen, setIsEditSectionDropdownOpen] = useState(false);
  const supabase = createClient();
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);

  const fetchSections = useCallback(async () => {
    let query = supabase.from('company_sections').select('id, name').order('created_at', { ascending: true });
    if (adminId && adminId !== 'all') {
      query = query.eq('created_by', adminId);
    }
    const { data } = await query;
    if (data) setSections(data);
  }, [adminId, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchSections();
    }
  }, [isOpen, fetchSections]);

  useEffect(() => {
    if (isEditSectionDropdownOpen) {
      fetchSections();
    }
  }, [isEditSectionDropdownOpen, fetchSections]);


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Spatial Node"
      icon={<Edit className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {modalError && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {modalError}
          </div>
        )}
        
        {/* Image Replacement */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">360° Image</label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 relative shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 relative">
              <input 
                type="file"
                accept="image/*"
                onChange={handleEditImageSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <UploadCloud className="w-4 h-4" /> Replace Image
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">New image will be compressed automatically.</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-1.5">{t('locationName')}</label>
            <input 
              type="text" 
              required
              value={editLocationName} 
              onChange={e => setEditLocationName(e.target.value)} 
              className="w-full bg-white/60 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-inner backdrop-blur-sm"
            />
          </div>
          
          <div className="relative">
            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-1.5">{t('locationDesc')}</label>
              <div className="relative">
                <div 
                  onClick={() => setIsEditSectionDropdownOpen(!isEditSectionDropdownOpen)}
                  className="w-full bg-white/60 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center shadow-inner hover:bg-white/80 dark:hover:bg-black/60 transition-colors backdrop-blur-sm"
                >
                  <span className="truncate pr-2">{sections.find(s => s.id === editLocationSectionId)?.name || 'Pilih Sektor...'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isEditSectionDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {isEditSectionDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in max-h-48 overflow-y-auto">
                    <div 
                      className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer transition-colors text-sm text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-white/5"
                      onClick={() => {
                        setEditLocationSectionId('');
                        setIsEditSectionDropdownOpen(false);
                      }}
                    >
                      -- Kosongkan Sektor --
                    </div>
                    {sections.map((sec) => (
                      <div 
                        key={sec.id}
                        className="px-4 py-3 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer transition-colors text-sm text-zinc-700 dark:text-zinc-200"
                        onClick={() => {
                          setEditLocationSectionId(sec.id);
                          setIsEditSectionDropdownOpen(false);
                        }}
                      >
                        {sec.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-1.5">Capture Date</label>
          <input 
            type="date" 
            value={editCaptureDate} 
            onChange={e => setEditCaptureDate(e.target.value)} 
            className="w-full bg-white/60 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-inner backdrop-blur-sm" 
          />
        </div>

        <div>
          <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl border border-zinc-200 dark:border-white/5">
            <input 
              type="checkbox"
              checked={editIsPublished}
              onChange={(e) => setEditIsPublished(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-300 dark:border-white/10 bg-white dark:bg-black/40 text-cyan-500 dark:text-cyan-400 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-transparent"
            />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">Published (Visible on Map)</span>
          </label>
        </div>

        <div className="pt-4 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" disabled={modalLoading} className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors flex items-center disabled:opacity-50 shadow-lg shadow-cyan-500/20 active:scale-95">
            {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
