'use client';

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItemData {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: {
    (messageOrOptions: string | ToastOptions, type?: ToastType, duration?: number): void;
    success: (message: string, options?: Partial<ToastOptions>) => void;
    error: (message: string, options?: Partial<ToastOptions>) => void;
    warning: (message: string, options?: Partial<ToastOptions>) => void;
    info: (message: string, options?: Partial<ToastOptions>) => void;
  };
}

const ToastContext = createContext<ToastContextType>({
  showToast: Object.assign(() => {}, {
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
  }),
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItemData, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItemData = { ...item, id };
    setToasts((prev) => {
      // Limit to 4 visible toasts at a time to prevent screen clutter
      const next = [newToast, ...prev];
      return next.slice(0, 4);
    });
  }, []);

  const showToastFn = useCallback(
    (messageOrOptions: string | ToastOptions, typeParam: ToastType = 'success', durationParam = 3500) => {
      if (typeof messageOrOptions === 'string') {
        addToast({
          message: messageOrOptions,
          type: typeParam,
          duration: durationParam,
        });
      } else {
        addToast({
          message: messageOrOptions.message,
          title: messageOrOptions.title,
          type: messageOrOptions.type || 'success',
          duration: messageOrOptions.duration || 3500,
          action: messageOrOptions.action,
        });
      }
    },
    [addToast]
  );

  const showToast = Object.assign(showToastFn, {
    success: useCallback(
      (message: string, options?: Partial<ToastOptions>) => {
        showToastFn({ ...options, message, type: 'success' });
      },
      [showToastFn]
    ),
    error: useCallback(
      (message: string, options?: Partial<ToastOptions>) => {
        showToastFn({ ...options, message, type: 'error' });
      },
      [showToastFn]
    ),
    warning: useCallback(
      (message: string, options?: Partial<ToastOptions>) => {
        showToastFn({ ...options, message, type: 'warning' });
      },
      [showToastFn]
    ),
    info: useCallback(
      (message: string, options?: Partial<ToastOptions>) => {
        showToastFn({ ...options, message, type: 'info' });
      },
      [showToastFn]
    ),
  });

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Viewport */}
      <div
        aria-live="polite"
        role="region"
        className="fixed top-4 left-0 right-0 sm:top-6 sm:right-6 sm:left-auto sm:w-[400px] z-[999999] flex flex-col items-center sm:items-end gap-2.5 px-4 pointer-events-none"
      >
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <ToastCard
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

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItemData;
  onDismiss: () => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(toast.duration);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const totalDuration = remainingTimeRef.current;
    const initialProgress = progress;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const fraction = elapsed / totalDuration;
      const newProgress = Math.max(0, initialProgress * (1 - fraction));

      setProgress(newProgress);

      if (elapsed >= totalDuration) {
        onDismiss();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPaused, onDismiss, toast.duration]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const typeConfig: Record<
    ToastType,
    {
      icon: React.ReactNode;
      badgeClass: string;
      barClass: string;
      borderClass: string;
    }
  > = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      badgeClass: 'bg-emerald-50 border-emerald-100',
      barClass: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      borderClass: 'border-emerald-100',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
      badgeClass: 'bg-rose-50 border-rose-100',
      barClass: 'bg-gradient-to-r from-rose-500 to-red-600',
      borderClass: 'border-rose-100',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      badgeClass: 'bg-amber-50 border-amber-100',
      barClass: 'bg-gradient-to-r from-amber-500 to-orange-500',
      borderClass: 'border-amber-100',
    },
    info: {
      icon: <Info className="w-5 h-5 text-orange-600" />,
      badgeClass: 'bg-orange-50 border-orange-100',
      barClass: 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600',
      borderClass: 'border-orange-100',
    },
  };

  const config = typeConfig[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden flex flex-col w-full max-w-[390px] rounded-2xl bg-white/95 backdrop-blur-xl border ${config.borderClass} shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition-all`}
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        {/* Icon Badge */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${config.badgeClass} shadow-xs mt-0.5`}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          {toast.title && (
            <h4 className="text-xs font-bold text-slate-900 tracking-tight mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-[13px] font-medium text-slate-700 leading-snug break-words">
            {toast.message}
          </p>

          {/* Action button if provided */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700 underline transition-colors cursor-pointer"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          title="Tutup notifikasi"
          className="w-7 h-7 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="h-[2.5px] w-full bg-slate-100/80 overflow-hidden">
        <div
          className={`h-full ${config.barClass} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
