import Modal from '@/components/ui/Modal';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface DeleteNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleteError: string;
  deleteLoading: boolean;
}

export default function DeleteNodeModal({
  isOpen,
  onClose,
  onConfirm,
  deleteError,
  deleteLoading
}: DeleteNodeModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('confirmDeletion') || 'Confirm Deletion'}
      icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <div className="flex justify-center mb-6 mt-2">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-[20px] flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30">
            <Trash2 className="w-8 h-8" />
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">
          {t('deleteWarning')}
        </p>

        {deleteError && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 text-left">
            {deleteError}
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={onClose} 
            disabled={deleteLoading}
            className="flex-1 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={onConfirm}
            disabled={deleteLoading}
            className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50 shadow-lg dark:shadow-red-500/10"
          >
            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {t('delete')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
