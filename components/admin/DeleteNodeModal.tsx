import { Trash2, Loader2 } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-md p-4">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 rounded-2xl shadow-sm dark:shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30 mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">Confirm Deletion</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 drop-shadow-sm leading-relaxed">
            Are you sure you want to permanently delete this panorama? This action will remove the file from storage and the database and cannot be undone.
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
              className="flex-1 px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={deleteLoading}
              className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50 shadow-none dark:shadow-lg dark:shadow-red-500/10"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
