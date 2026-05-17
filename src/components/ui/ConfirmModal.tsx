'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isLoading && onCancel()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-6 flex flex-col pt-8"
          >
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4 ${isDestructive ? 'bg-red-100' : 'bg-brand-100'}`}>
               <AlertCircle className={`h-7 w-7 ${isDestructive ? 'text-red-600' : 'text-brand-600'}`} />
            </div>
            
            <h2 className="text-xl font-bold font-heading text-center text-foreground mb-2">
              {title}
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-8 leading-relaxed">
              {message}
            </p>

            <div className="flex gap-3 w-full">
              <button
                disabled={isLoading}
                onClick={onCancel}
                className="w-1/2 px-4 py-2.5 font-medium text-sm text-foreground bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                disabled={isLoading}
                onClick={onConfirm}
                className={`w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm text-white rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
                    isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
