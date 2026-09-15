'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, ZoomIn } from 'lucide-react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export default function PhotoLightboxModal({
  isOpen,
  imageUrl,
  title,
  onClose,
}: PhotoLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 flex items-center justify-between border-b border-white/10 text-white">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
              {title || 'Bukti Foto Inspeksi SOP'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors text-xs flex items-center gap-1"
              title="Buka foto asli di tab baru"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Buka Asli</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-white/80 hover:text-rose-400 transition-colors"
              title="Tutup pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-black/40">
          <img
            src={imageUrl}
            alt={title || 'Bukti SOP'}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-white/5"
          />
        </div>
      </div>
    </div>
  );
}
