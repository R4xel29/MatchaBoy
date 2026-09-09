'use client';

import { X, Tag, Calendar, Save, Loader2 } from 'lucide-react';
import { ExpenseFormData, CATEGORIES } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: ExpenseFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExpenseFormData>>;
  onSave: () => void;
  isSaving: boolean;
}

export function ExpenseFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSave,
  isSaving,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-base font-extrabold text-slate-900">
            {isEditing ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200/50 rounded-xl text-slate-400 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Nama Pengeluaran *</label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all" 
                placeholder="e.g. Beli Es Batu, Gas LPG, Sewa Ruko"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Nominal (Rp) *</label>
              <input 
                type="number"
                value={formData.amount} 
                onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-bold" 
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Kategori</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-semibold"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Sumber Pembayaran */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Sumber Kas Pembiayaan</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, source: 'CASH_DRAWER' }))}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  formData.source === 'CASH_DRAWER'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kas Laci (Tunai)
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, source: 'BANK_TRANSFER' }))}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  formData.source === 'BANK_TRANSFER'
                    ? 'bg-sky-100 border-sky-300 text-sky-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Transfer Bank / Rekening
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-semibold" 
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Catatan Tambahan (Opsional)</label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all resize-none"
              placeholder="Keterangan toko / suplier / PIC..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/70">
          <button onClick={onClose} className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 rounded-2xl hover:bg-slate-200/50 transition-colors cursor-pointer">Batal</button>
          <button onClick={onSave} disabled={isSaving}
            className="px-5 py-2 text-xs sm:text-sm font-extrabold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20 cursor-pointer">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
