'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChefHat,
  Plus,
  Trash2,
  Save,
  Loader2,
  TrendingUp,
  Percent,
  Coins,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { ProductItem, IngredientItem } from './types';

interface RecipeItemRow {
  ingredientId: string;
  quantity: string;
}

interface RecipeHppModalProps {
  product: ProductItem | null;
  ingredients: IngredientItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecipeHppModal({
  product,
  ingredients,
  isOpen,
  onClose,
  onSuccess,
}: RecipeHppModalProps) {
  const { showToast } = useToast();
  const [recipeItems, setRecipeItems] = useState<RecipeItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch current recipe when modal opens
  useEffect(() => {
    if (!product || !isOpen) return;
    setLoading(true);
    fetch(`/api/admin/products/${product.id}/recipe`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setRecipeItems(
          data.map((item: any) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity.toString(),
          }))
        );
      })
      .catch((err) => console.error('Error fetching recipe:', err))
      .finally(() => setLoading(false));
  }, [product, isOpen]);

  // Add ingredient row
  const addRow = () => {
    const available = ingredients.find(
      (ing) => !recipeItems.some((r) => r.ingredientId === ing.id)
    );
    if (!available) {
      return showToast('Semua bahan baku sudah ditambahkan', 'info');
    }
    setRecipeItems((prev) => [...prev, { ingredientId: available.id, quantity: '1' }]);
  };

  const removeRow = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'ingredientId' | 'quantity', val: string) => {
    setRecipeItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  // Calculations
  const { totalHpp, grossProfit, marginPercent } = useMemo(() => {
    if (!product) return { totalHpp: 0, grossProfit: 0, marginPercent: 0 };
    let hpp = 0;
    recipeItems.forEach((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      const qty = parseFloat(item.quantity) || 0;
      if (ing) {
        hpp += qty * ing.costPerUnit;
      }
    });

    const profit = product.price - hpp;
    const margin = product.price > 0 ? (profit / product.price) * 100 : 0;

    return {
      totalHpp: hpp,
      grossProfit: profit,
      marginPercent: Math.round(margin * 10) / 10,
    };
  }, [product, recipeItems, ingredients]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const validItems = recipeItems
        .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
        .map((r) => ({
          ingredientId: r.ingredientId,
          quantity: parseFloat(r.quantity),
        }));

      const res = await fetch(`/api/admin/products/${product.id}/recipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      });

      if (!res.ok) throw new Error();

      showToast('Resep & HPP berhasil diperbarui!', 'success');
      onSuccess();
      onClose();
    } catch {
      showToast('Gagal menyimpan resep', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 line-clamp-1">
                  Resep & Kalkulasi HPP: {product.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Harga Jual: <strong className="text-stone-800">{formatRupiah(product.price)}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Business Margin Indicator Banner */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-stone-900 text-white">
            <div className="p-3 bg-stone-800/80 rounded-2xl border border-stone-700">
              <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" /> Total HPP
              </span>
              <p className="text-sm font-bold text-amber-400 mt-1">{formatRupiah(totalHpp)}</p>
            </div>

            <div className="p-3 bg-stone-800/80 rounded-2xl border border-stone-700">
              <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Laba Kotor / Porsi
              </span>
              <p className="text-sm font-bold text-emerald-400 mt-1">{formatRupiah(grossProfit)}</p>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                marginPercent >= 60
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : marginPercent >= 40
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
                <Percent className="w-3 h-3" /> Margin Profit
              </span>
              <p className="text-sm font-black mt-1 flex items-center gap-1.5">
                {marginPercent}%
                {marginPercent >= 60 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Bahan Baku Penyusun Resep
                </h4>
                <p className="text-[11px] text-stone-500">
                  Stok bahan di gudang akan otomatis terpotong setiap kali menu ini dipesan.
                </p>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Bahan
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                <span className="text-xs">Memuat data resep...</span>
              </div>
            ) : recipeItems.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50">
                <ChefHat className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-600">Belum ada bahan baku terhubung</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Klik &quot;Tambah Bahan&quot; untuk menghubungkan resep dan menghitung HPP otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recipeItems.map((item, idx) => {
                  const currentIng = ingredients.find((i) => i.id === item.ingredientId);
                  const subtotal = (parseFloat(item.quantity) || 0) * (currentIng?.costPerUnit || 0);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 transition-all flex items-center gap-3 shadow-sm"
                    >
                      {/* Ingredient Select */}
                      <div className="flex-1">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => updateRow(idx, 'ingredientId', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/50 focus:ring-2 focus:ring-orange-500"
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({formatRupiah(ing.costPerUnit)} / {ing.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="w-28 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-bold text-right focus:ring-2 focus:ring-orange-500"
                          placeholder="0"
                        />
                        <span className="text-xs font-bold text-stone-400 w-10 truncate">
                          {currentIng?.unit || 'unit'}
                        </span>
                      </div>

                      {/* Subtotal */}
                      <div className="w-24 text-right">
                        <span className="text-xs font-bold text-stone-700">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
            <div className="text-left text-xs text-stone-500">
              Total {recipeItems.length} bahan baku dikonfigurasi
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Simpan Resep
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
