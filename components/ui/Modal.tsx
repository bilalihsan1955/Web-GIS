import { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: string; // e.g., 'max-w-md', 'max-w-sm', 'max-w-5xl'
  noPadding?: boolean;
}

export default function Modal({ isOpen, onClose, title, icon, children, maxWidth = 'max-w-md', noPadding = false }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-zinc-900/40 dark:bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
      <div 
        className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-slide-up relative flex flex-col`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-zinc-50 dark:bg-black/20 px-6 py-5 border-b border-zinc-200 dark:border-white/10 relative shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 pr-6">
            {icon}
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className={`${noPadding ? '' : 'p-6'} overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar flex-1 relative`}>
          {children}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>,
    document.body
  );
}
