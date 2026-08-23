'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Plus,
  Trash2,
  Package,
  Calculator,
  Truck,
  Check,
  Search,
  X,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import type { ProductItem, BundleGroup, CategoryItem } from './types';

interface BundleBuilderSectionProps {
  bundleGroups: BundleGroup[];
  setBundleGroups: React.Dispatch<React.SetStateAction<BundleGroup[]>>;
  discountType: 'fixed' | 'nominal' | 'percent';
  setDiscountType: (type: 'fixed' | 'nominal' | 'percent') => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  freeShipping: boolean;
  setFreeShipping: (val: boolean) => void;
  allProducts: ProductItem[];
  categories: CategoryItem[];
  basePrice: string;
  setBasePrice: (val: string) => void;
}

export function BundleBuilderSection({
  bundleGroups,
  setBundleGroups,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  freeShipping,
  setFreeShipping,
  allProducts,
  categories,
  setBasePrice,
}: BundleBuilderSectionProps) {
  const [activeGroupIdForPicker, setActiveGroupIdForPicker] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');

  // Calculate regular sum of items
  const regularTotalPrice = bundleGroups.reduce((total, group) => {
    if (group.options.length > 0) {
      const firstOpt = group.options[0];
      const prod = allProducts.find((p) => p.id === firstOpt.productId);
      if (prod) {
        return total + prod.price * (group.selectCount || 1);
      }
    }
    return total;
  }, 0);

  // Group helpers
  const addGroup = () => {
    const id = 'grp_' + Math.random().toString(36).substring(2, 9);
    setBundleGroups((prev) => [
      ...prev,
      { id, name: `Pilihan Menu #${prev.length + 1}`, selectCount: 1, options: [] },
    ]);
  };

  const removeGroup = (id: string) => {
    setBundleGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGroupName = (id: string, name: string) => {
    setBundleGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  };

  const addOptionToGroup = (groupId: string, productId: string) => {
    const prod = allProducts.find((p) => p.id === productId);
    if (!prod) return;

    setBundleGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.options.some((o) => o.productId === productId)) return g;
        return {
          ...g,
          options: [
            ...g.options,
            { productId, name: prod.name, priceAdjustment: 0 },
          ],
        };
      })
    );
  };

  const removeOptionFromGroup = (groupId: string, productId: string) => {
    setBundleGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.filter((o) => o.productId !== productId),
        };
      })
    );
  };

  const updateOptionAdjustment = (
    groupId: string,
    productId: string,
    adjustment: number
  ) => {
    setBundleGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.map((o) =>
            o.productId === productId ? { ...o, priceAdjustment: adjustment } : o
          ),
        };
      })
    );
  };

  // Discount calculation
  const handleDiscountChange = (type: 'fixed' | 'nominal' | 'percent', val: string) => {
    setDiscountType(type);
    setDiscountValue(val);
    if (type === 'percent') {
      const pct = Number(val || 0);
      const finalPrice = Math.max(0, regularTotalPrice * (1 - pct / 100));
      setBasePrice(Math.round(finalPrice).toString());
    } else if (type === 'nominal') {
      const nom = Number(val || 0);
      const finalPrice = Math.max(0, regularTotalPrice - nom);
      setBasePrice(Math.round(finalPrice).toString());
    }
  };

  const filteredPickerProducts = allProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(pickerSearch.toLowerCase());
    const matchesCat = pickerCategory === 'all' || p.categoryId === pickerCategory;
    const isCombo = p.modifiers ? JSON.parse(p.modifiers).isBundle : false;
    return matchesSearch && matchesCat && !isCombo && p.badge !== 'archived';
  });

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Konfigurasi Grup Paket Combo
          </h4>
          <p className="text-[11px] text-stone-500">
            Tentukan grup menu yang dapat dipilih pelanggan saat membeli paket bundling ini.
          </p>
        </div>

        <button
          type="button"
          onClick={addGroup}
          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Grup
        </button>
      </div>

      {/* Groups List */}
      {bundleGroups.length === 0 ? (
        <div className="py-8 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60">
          <Layers className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-600">Belum ada grup pilihan paket</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Klik &quot;Tambah Grup&quot; untuk membuat grup pilihan (misal: Pilih 1 Minuman & 1 Pastry).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bundleGroups.map((group, gIdx) => (
            <div
              key={group.id}
              className="p-4 rounded-2xl border border-stone-200 bg-white shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold flex-1 focus:ring-2 focus:ring-emerald-500"
                  placeholder="Nama Grup (e.g. Pilih Minuman Utama)"
                />
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Options in group */}
              <div className="space-y-2">
                {group.options.map((opt) => {
                  const prod = allProducts.find((p) => p.id === opt.productId);
                  return (
                    <div
                      key={opt.productId}
                      className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Package className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-xs font-bold text-stone-800 truncate">
                          {prod?.name || opt.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          ({formatRupiah(prod?.price || 0)})
                        </span>
                      </div>

                      {/* Price Adjustment */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-400">+Rp</span>
                        <input
                          type="number"
                          value={opt.priceAdjustment || 0}
                          onChange={(e) =>
                            updateOptionAdjustment(
                              group.id,
                              opt.productId,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-16 px-2 py-1 rounded-lg border border-stone-200 text-[11px] font-bold text-right bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionFromGroup(group.id, opt.productId)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setActiveGroupIdForPicker(group.id)}
                  className="w-full py-2 rounded-xl border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Pilih Produk untuk Grup Ini
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Discount Strategy Calculator */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-950">
              Kalkulator Harga Diskon Bundling
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-800">
            Total Normal: {formatRupiah(regularTotalPrice)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { type: 'fixed', label: 'Harga Tetap (Manual)' },
            { type: 'nominal', label: 'Potongan Rp (Nominal)' },
            { type: 'percent', label: 'Potongan % (Persen)' },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() =>
                handleDiscountChange(item.type as any, discountValue)
              }
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                discountType === item.type
                  ? 'bg-white border-emerald-600 text-emerald-800 shadow-sm'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-100/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {discountType !== 'fixed' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-bold text-emerald-900">
              {discountType === 'percent' ? 'Persentase Diskon (%):' : 'Nominal Diskon (Rp):'}
            </span>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => handleDiscountChange(discountType, e.target.value)}
              className="w-32 px-3 py-1.5 rounded-xl border border-emerald-300 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500"
              placeholder={discountType === 'percent' ? '15' : '10000'}
            />
          </div>
        )}

        {/* Free Shipping for Bundle Toggle */}
        <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-700" /> Gratis Ongkir untuk Paket Ini
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={freeShipping}
              onChange={(e) => setFreeShipping(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Visual Product Picker Modal */}
      {activeGroupIdForPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading font-bold text-sm text-stone-900">
                Pilih Produk untuk Grup Bundle
              </h3>
              <button
                onClick={() => setActiveGroupIdForPicker(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search */}
            <div className="my-3 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Cari menu produk..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setPickerCategory('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                    pickerCategory === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Semua
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPickerCategory(c.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                      pickerCategory === c.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid in Picker */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredPickerProducts.map((prod) => {
                const currentGrp = bundleGroups.find(
                  (g) => g.id === activeGroupIdForPicker
                );
                const isSelected = currentGrp?.options.some(
                  (o) => o.productId === prod.id
                );

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (isSelected) {
                        removeOptionFromGroup(activeGroupIdForPicker, prod.id);
                      } else {
                        addOptionToGroup(activeGroupIdForPicker, prod.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-stone-100 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-9 h-9 rounded-lg object-cover bg-stone-100 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-stone-400" />
                        </div>
                      )}
                      <div className="truncate text-left">
                        <p className="text-xs font-bold truncate">{prod.name}</p>
                        <p className="text-[10px] text-stone-500">
                          {formatRupiah(prod.price)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'border border-stone-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveGroupIdForPicker(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Selesai Memilih
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
