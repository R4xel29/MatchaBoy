'use client';

import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Sparkles,
  Loader2,
  CandyCane,
  Check,
  X,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { ToppingItem, IngredientItem } from './types';

interface MasterToppingsTabProps {
  toppings: ToppingItem[];
  ingredients: IngredientItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function MasterToppingsTab({
  toppings,
  ingredients,
  loading,
  onRefresh,
}: MasterToppingsTabProps) {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingTopping, setEditingTopping] = useState<ToppingItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    defaultPrice: '',
    ingredientId: '',
    ingredientQty: '',
  });
  const [saving, setSaving] = useState(false);

  const openModal = (topping?: ToppingItem) => {
    if (topping) {
      setEditingTopping(topping);
      setForm({
        name: topping.name,
        defaultPrice: topping.defaultPrice.toString(),
        ingredientId: topping.ingredientId || '',
        ingredientQty: topping.ingredientQty?.toString() || '',
      });
    } else {
      setEditingTopping(null);
      setForm({ name: '', defaultPrice: '', ingredientId: '', ingredientQty: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.defaultPrice) {
      return showToast('Nama dan harga topping wajib diisi', 'error');
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        defaultPrice: Number(form.defaultPrice),
        ingredientId: form.ingredientId || null,
        ingredientQty: form.ingredientQty ? Number(form.ingredientQty) : null,
        isAvailable: editingTopping ? editingTopping.isAvailable : true,
      };

      const url = editingTopping
        ? `/api/admin/toppings/${editingTopping.id}`
        : '/api/admin/toppings';

      const res = await fetch(url, {
        method: editingTopping ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      showToast('Master Topping berhasil disimpan', 'success');
      setShowModal(false);
      onRefresh();
    } catch {
      showToast('Gagal menyimpan Topping', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus master topping ini?')) return;
    try {
      await fetch(`/api/admin/toppings/${id}`, { method: 'DELETE' });
      showToast('Topping berhasil dihapus', 'success');
      onRefresh();
    } catch {
      showToast('Gagal menghapus topping', 'error');
    }
  };

  const toggleStatus = async (topping: ToppingItem) => {
    try {
      await fetch(`/api/admin/toppings/${topping.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !topping.isAvailable }),
      });
      onRefresh();
    } catch {
      showToast('Gagal mengubah status topping', 'error');
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h3 className="font-heading font-bold text-base text-stone-900 flex items-center gap-2">
            <CandyCane className="w-5 h-5 text-orange-500" />
            Master Topping & Add-On Global
          </h3>
          <p className="text-xs text-stone-500">
            Topping yang dibuat di sini dapat dipilih oleh pelanggan saat memesan minuman atau makanan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Topping
        </button>
      </div>

      {/* Toppings Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
          <span className="text-xs">Memuat master topping...</span>
        </div>
      ) : toppings.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-white">
          <CandyCane className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-600">Belum ada master topping</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Klik &quot;Tambah Topping&quot; untuk menambahkan topping seperti Boba, Jelly, atau Cheese Foam.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {toppings.map((t) => {
            const ing = ingredients.find((i) => i.id === t.ingredientId);

            return (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-stone-200 bg-white hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-stone-900">{t.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        t.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {t.isAvailable ? 'Tersedia' : 'Habis'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-orange-600 mt-1">
                    {formatRupiah(t.defaultPrice)}
                  </p>

                  {ing ? (
                    <p className="text-[11px] text-stone-500 mt-2 font-medium bg-stone-50 p-2 rounded-xl">
                      Bahan Baku: <strong className="text-stone-700">{ing.name}</strong> ({t.ingredientQty || 1} {ing.unit})
                    </p>
                  ) : (
                    <p className="text-[11px] text-stone-400 mt-2 italic bg-stone-50 p-2 rounded-xl">
                      Tidak terhubung ke bahan baku
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleStatus(t)}
                    className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                      t.isAvailable ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    {t.isAvailable ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5" /> Set Habis
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5" /> Set Tersedia
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openModal(t)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Topping */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-heading font-bold text-base text-stone-900">
                {editingTopping ? 'Edit Master Topping' : 'Tambah Topping Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Topping
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Grass Jelly, Boba Pearl"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Harga Default (Rp)
                </label>
                <input
                  type="number"
                  value={form.defaultPrice}
                  onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
                  placeholder="4000"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Hubungkan ke Bahan Baku (Opsi Pengurangan Stok)
                  </label>
                  <select
                    value={form.ingredientId}
                    onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Tidak Terhubung --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {form.ingredientId && (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Jumlah Pemakaian Bahan per Porsi
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.ingredientQty}
                      onChange={(e) => setForm({ ...form, ingredientQty: e.target.value })}
                      placeholder="1"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Simpan Topping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
