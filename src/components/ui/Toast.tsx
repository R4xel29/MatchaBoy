'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <Check className="w-4 h-4 text-brand-600" />,
    error: <AlertTriangle className="w-4 h-4 text-red-500" />,
    info: <ShoppingBag className="w-4 h-4 text-brand-600" />,
  };

  const bgColors: Record<ToastType, string> = {
    success: 'bg-brand-50 border-brand-200 text-brand-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-card border-border text-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 
        rounded-xl border shadow-lg backdrop-blur-sm max-w-sm w-full
        ${bgColors[toast.type]}`}
    >
      <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
        {icons[toast.type]}
      </div>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="w-6 h-6 rounded-full hover:bg-black/5 
          flex items-center justify-center shrink-0 touch-target"
      >
        <X className="w-3 h-3 opacity-50" />
      </button>
    </motion.div>
  );
}
