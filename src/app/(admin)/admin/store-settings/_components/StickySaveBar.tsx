'use client';

import React from 'react';
import { Save, Loader2 } from 'lucide-react';

interface StickySaveBarProps {
  saved: boolean;
  saving: boolean;
  handleSave: () => void;
}

export function StickySaveBar({ saved, saving, handleSave }: StickySaveBarProps) {
  return (
    <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-slate-600 font-medium">
          Perubahan belum disimpan otomatis. Tekan tombol Simpan atau shortcut{' '}
          <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
            Ctrl+S
          </kbd>
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {saved && (
          <span className="text-xs font-bold text-emerald-600">
            ✓ Berhasil Disimpan!
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow-orange flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>
    </div>
  );
}
