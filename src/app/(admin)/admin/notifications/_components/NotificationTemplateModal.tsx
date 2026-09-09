'use client';

import React from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { NotificationTemplate, TRIGGER_OPTIONS } from './types';

interface NotificationTemplateModalProps {
  editTpl: Partial<NotificationTemplate> | null;
  setEditTpl: React.Dispatch<React.SetStateAction<Partial<NotificationTemplate> | null>>;
  savingTpl: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function NotificationTemplateModal({
  editTpl,
  setEditTpl,
  savingTpl,
  onSave,
  onCancel,
}: NotificationTemplateModalProps) {
  if (!editTpl) return null;

  return (
    <div className="bg-white rounded-3xl border border-orange-200/80 p-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="font-extrabold text-slate-900 text-sm font-heading">
          {editTpl.id ? 'Edit Template Notifikasi' : 'Tambah Template Notifikasi Baru'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Pemicu Notifikasi (Trigger)
          </label>
          <select
            value={editTpl.trigger || ''}
            onChange={(e) => setEditTpl({ ...editTpl, trigger: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="">Pilih pemicu event...</option>
            {TRIGGER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Judul Notifikasi
          </label>
          <input
            type="text"
            value={editTpl.title || ''}
            onChange={(e) => setEditTpl({ ...editTpl, title: e.target.value })}
            placeholder="Contoh: Pesanan Selesai Disiapkan"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Pesan Notifikasi{' '}
            <span className="text-slate-400 font-normal lowercase">
              (placeholder: {'{{name}}'}, {'{{points}}'}, {'{{orderNo}}'})
            </span>
          </label>
          <textarea
            value={editTpl.message || ''}
            onChange={(e) => setEditTpl({ ...editTpl, message: e.target.value })}
            rows={3}
            placeholder="Halo {{name}}! Pesanan {{orderNo}} sudah siap dinikmati. Kamu memperoleh {{points}} poin loyalitas!"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 resize-none focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={savingTpl || !editTpl.trigger || !editTpl.title || !editTpl.message}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-glow-orange"
          >
            {savingTpl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Template</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
