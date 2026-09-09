'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Loader2, Save } from 'lucide-react';
import { HelpArticleFormData } from './types';

interface HelpArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: HelpArticleFormData;
  setFormData: React.Dispatch<React.SetStateAction<HelpArticleFormData>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function HelpArticleModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  saving,
  onSave,
}: HelpArticleModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/80 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 font-heading">
                <HelpCircle className="w-4.5 h-4.5 text-orange-600" />
                <span>{formData.id ? 'Edit Artikel Bantuan' : 'Tambah Artikel Bantuan Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSave} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Kategori FAQ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Contoh: Pemesanan, Pembayaran, Voucher, Akun"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Urutan Tampil (Order Index)
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    placeholder="Semakin kecil semakin di atas"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end pb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-active-faq"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 w-4 h-4"
                    />
                    <label
                      htmlFor="is-active-faq"
                      className="font-bold text-slate-800 cursor-pointer select-none text-xs"
                    >
                      Aktif / Tampilkan ke Customer
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Judul / Pertanyaan FAQ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Bagaimana cara menggunakan voucher diskon?"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Isi Jawaban Bantuan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={7}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan jawaban panduan lengkap di sini..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 resize-none font-medium text-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition-all shadow-glow-orange active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Artikel</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
