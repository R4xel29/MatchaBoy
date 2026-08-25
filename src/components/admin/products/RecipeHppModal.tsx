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
  CupSoda,
  Sparkles,
  Info,
  PackageCheck,
  Scale,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { ProductItem, IngredientItem, ModifiersData } from './types';

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

type SizeTab = 'REGULAR' | 'JUMBO' | 'TUMBLER';

export function RecipeHppModal({
  product,
  ingredients,
  isOpen,
  onClose,
  onSuccess,
}: RecipeHppModalProps) {
  const { showToast } = useToast();
  const [regularItems, setRegularItems] = useState<RecipeItemRow[]>([]);
  const [jumboItems, setJumboItems] = useState<RecipeItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SizeTab>('REGULAR');

  // Parse product modifiers to get Large size price adjustment
  const parsedModifiers: ModifiersData | null = useMemo(() => {
    if (!product?.modifiers) return null;
    try {
      return typeof product.modifiers === 'string' ? JSON.parse(product.modifiers) : product.modifiers;
    } catch {
      return null;
    }
  }, [product?.modifiers]);

  const largeExtraPrice = useMemo(() => {
    if (!parsedModifiers?.sizes || parsedModifiers.sizes.length === 0) return 3000;
    const largeSize = parsedModifiers.sizes.find(
      (s) => s.name.toLowerCase().includes('large') || s.name.toLowerCase().includes('jumbo')
    );
    return largeSize?.price ?? 3000;
  }, [parsedModifiers]);

  // Identify packaging cups from ingredients list
  const cupRegularIng = useMemo(() => {
    return ingredients.find(
      (i) =>
        i.isPackaging &&
        (i.name.toLowerCase().includes('regular') ||
          i.name.toLowerCase().includes('14') ||
          i.name.toLowerCase().includes('16') ||
          i.name.toLowerCase().includes('gelas'))
    );
  }, [ingredients]);

  const cupJumboIng = useMemo(() => {
    return ingredients.find(
      (i) =>
        i.isPackaging &&
        (i.name.toLowerCase().includes('jumbo') ||
          i.name.toLowerCase().includes('large') ||
          i.name.toLowerCase().includes('22'))
    );
  }, [ingredients]);

  const cupRegularCost = cupRegularIng?.costPerUnit ?? 350;
  const cupJumboCost = cupJumboIng?.costPerUnit ?? 550;

  // Check if an ingredient is a cup packaging
  const isCupPackaging = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return false;
    const name = ing.name.toLowerCase();
    return ing.isPackaging || name.includes('cup') || name.includes('gelas');
  };

  // Fetch current recipe when modal opens
  useEffect(() => {
    if (!product || !isOpen) return;
    setLoading(true);
    fetch(`/api/admin/products/${product.id}/recipe`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: any) => {
        const rawReg = Array.isArray(data) ? data : data.recipe || [];
        const mappedReg: RecipeItemRow[] = rawReg.map((item: any) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity.toString(),
        }));
        setRegularItems(mappedReg);

        const rawJumbo = data.jumboRecipe || [];
        if (Array.isArray(rawJumbo) && rawJumbo.length > 0) {
          setJumboItems(
            rawJumbo.map((item: any) => ({
              ingredientId: item.ingredientId,
              quantity: item.quantity.toString(),
            }))
          );
        } else {
          // Auto initialize Jumbo from Regular with 1.25x scaling
          setJumboItems(
            mappedReg.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: (Math.round((parseFloat(item.quantity) || 0) * 1.25 * 100) / 100).toString(),
            }))
          );
        }
      })
      .catch((err) => console.error('Error fetching recipe:', err))
      .finally(() => setLoading(false));
  }, [product, isOpen]);

  // Sync Jumbo from Regular (1.25x)
  const syncJumboFromRegular = () => {
    setJumboItems(
      regularItems.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: (Math.round((parseFloat(item.quantity) || 0) * 1.25 * 100) / 100).toString(),
      }))
    );
    showToast('Resep Jumbo berhasil disinkronkan dari Regular (Skala 1.25x)', 'success');
  };

  // Add ingredient row
  const addRow = () => {
    const available = ingredients.find(
      (ing) => !regularItems.some((r) => r.ingredientId === ing.id)
    );
    if (!available) {
      return showToast('Semua bahan baku sudah ditambahkan', 'info');
    }
    setRegularItems((prev) => [...prev, { ingredientId: available.id, quantity: '1' }]);
    setJumboItems((prev) => [...prev, { ingredientId: available.id, quantity: '1.25' }]);
  };

  const removeRow = (index: number) => {
    setRegularItems((prev) => prev.filter((_, i) => i !== index));
    setJumboItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRegularRow = (index: number, field: 'ingredientId' | 'quantity', val: string) => {
    setRegularItems((prev) => {
      const updated = prev.map((item, i) => (i === index ? { ...item, [field]: val } : item));
      // If ingredient changed, sync ingredientId to Jumbo row
      if (field === 'ingredientId') {
        setJumboItems((jPrev) =>
          jPrev.map((jItem, jI) => (jI === index ? { ...jItem, ingredientId: val } : jItem))
        );
      }
      return updated;
    });
  };

  const updateJumboRow = (index: number, val: string) => {
    setJumboItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: val } : item))
    );
  };

  // Dual-Size Calculations
  const regularCalc = useMemo(() => {
    if (!product) return { rawHpp: 0, cupCost: 0, totalHpp: 0, sellingPrice: 0, grossProfit: 0, marginPercent: 0 };
    let rawHpp = 0;
    regularItems.forEach((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      const qty = parseFloat(item.quantity) || 0;
      if (ing && !isCupPackaging(ing.id)) {
        rawHpp += qty * ing.costPerUnit;
      }
    });

    const cupCost = cupRegularCost;
    const totalHpp = rawHpp + cupCost;
    const sellingPrice = product.price;
    const grossProfit = sellingPrice - totalHpp;
    const marginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
      rawHpp,
      cupCost,
      totalHpp,
      sellingPrice,
      grossProfit,
      marginPercent: Math.round(marginPercent * 10) / 10,
    };
  }, [product, regularItems, ingredients, cupRegularCost]);

  const jumboCalc = useMemo(() => {
    if (!product) return { rawHpp: 0, cupCost: 0, totalHpp: 0, sellingPrice: 0, grossProfit: 0, marginPercent: 0 };
    let rawHpp = 0;
    jumboItems.forEach((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      const qty = parseFloat(item.quantity) || 0;
      if (ing && !isCupPackaging(ing.id)) {
        rawHpp += qty * ing.costPerUnit;
      }
    });

    const cupCost = cupJumboCost;
    const totalHpp = rawHpp + cupCost;
    const sellingPrice = product.price + largeExtraPrice;
    const grossProfit = sellingPrice - totalHpp;
    const marginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
      rawHpp,
      cupCost,
      totalHpp,
      sellingPrice,
      grossProfit,
      marginPercent: Math.round(marginPercent * 10) / 10,
    };
  }, [product, jumboItems, ingredients, cupJumboCost, largeExtraPrice]);

  const tumblerCalc = useMemo(() => {
    if (!product) return { rawHpp: 0, cupCost: 0, totalHpp: 0, sellingPrice: 0, grossProfit: 0, marginPercent: 0 };
    const rawHpp = regularCalc.rawHpp;
    const cupCost = 0;
    const totalHpp = rawHpp;
    const sellingPrice = product.price;
    const grossProfit = sellingPrice - totalHpp;
    const marginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
      rawHpp,
      cupCost,
      totalHpp,
      sellingPrice,
      grossProfit,
      marginPercent: Math.round(marginPercent * 10) / 10,
    };
  }, [product, regularCalc]);

  const activeCalc = useMemo(() => {
    if (activeTab === 'JUMBO') return jumboCalc;
    if (activeTab === 'TUMBLER') return tumblerCalc;
    return regularCalc;
  }, [activeTab, regularCalc, jumboCalc, tumblerCalc]);

  const hasCupInRecipe = useMemo(() => {
    return regularItems.some((r) => isCupPackaging(r.ingredientId));
  }, [regularItems, ingredients]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const validRegular = regularItems
        .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
        .map((r) => ({
          ingredientId: r.ingredientId,
          quantity: parseFloat(r.quantity),
        }));

      const validJumbo = jumboItems
        .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
        .map((r) => ({
          ingredientId: r.ingredientId,
          quantity: parseFloat(r.quantity),
        }));

      const res = await fetch(`/api/admin/products/${product.id}/recipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validRegular,
          jumboItems: validJumbo,
        }),
      });

      if (!res.ok) throw new Error();

      showToast('Resep & HPP Regular & Jumbo berhasil disimpan!', 'success');
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
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-inner">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 line-clamp-1">
                  Resep & Kalkulasi HPP: {product.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Harga Jual Regular: <strong className="text-orange-600">{formatRupiah(product.price)}</strong> • Jumbo: <strong className="text-orange-600">{formatRupiah(product.price + largeExtraPrice)}</strong>
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

          {/* Size Simulation & Editing Selector Tabs */}
          <div className="px-5 pt-3 pb-2 bg-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-800">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-bold">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>Atur Resep & HPP Ukuran:</span>
            </div>

            <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('REGULAR')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'REGULAR'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <CupSoda className="w-3.5 h-3.5" />
                <span>Regular (16 oz)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('JUMBO')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'JUMBO'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Jumbo (22 oz)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('TUMBLER')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'TUMBLER'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <span>Tumbler</span>
              </button>
            </div>
          </div>

          {/* Business Margin Indicator Banner for Active Tab */}
          <div className="p-4 bg-stone-900 text-white border-b border-stone-800">
            <div className="grid grid-cols-3 gap-3">
              {/* Total HPP Card */}
              <div className="p-3 bg-stone-800/90 rounded-2xl border border-stone-700 flex flex-col justify-between text-left">
                <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" /> Total HPP ({activeTab})
                </span>
                <div className="mt-1">
                  <p className="text-base font-black text-amber-400">{formatRupiah(activeCalc.totalHpp)}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Bahan: {formatRupiah(activeCalc.rawHpp)} + Cup: {formatRupiah(activeCalc.cupCost)}
                  </p>
                </div>
              </div>

              {/* Laba Kotor Card */}
              <div className="p-3 bg-stone-800/90 rounded-2xl border border-stone-700 flex flex-col justify-between text-left">
                <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Laba Kotor / Porsi
                </span>
                <div className="mt-1">
                  <p className="text-base font-black text-emerald-400">{formatRupiah(activeCalc.grossProfit)}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Harga Jual: {formatRupiah(activeCalc.sellingPrice)}
                  </p>
                </div>
              </div>

              {/* Margin Profit Card */}
              <div
                className={`p-3 rounded-2xl border flex flex-col justify-between text-left ${
                  activeCalc.marginPercent >= 60
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : activeCalc.marginPercent >= 40
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                <span className="text-[10px] uppercase font-bold flex items-center gap-1 opacity-80">
                  <Percent className="w-3 h-3" /> Margin Profit
                </span>
                <div className="mt-1">
                  <p className="text-base font-black flex items-center gap-1.5">
                    {activeCalc.marginPercent}%
                    {activeCalc.marginPercent >= 60 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </p>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {activeCalc.marginPercent >= 60 ? 'Sangat Sehat' : activeCalc.marginPercent >= 40 ? 'Standar F&B' : 'Perlu Evaluasi'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Context Guidance Bar */}
          <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-200/70 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-amber-950">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              {activeTab === 'REGULAR' && (
                <span>
                  Mengatur takaran bahan untuk <strong>Ukuran Regular (16 oz)</strong>. Biaya Cup Regular ({formatRupiah(cupRegularCost)}) ditambahkan otomatis.
                </span>
              )}
              {activeTab === 'JUMBO' && (
                <span>
                  Mengatur takaran spesifik <strong>Ukuran Jumbo (22 oz)</strong>. Biaya Cup Jumbo ({formatRupiah(cupJumboCost)}) ditambahkan otomatis.
                </span>
              )}
              {activeTab === 'TUMBLER' && (
                <span>
                  Simulasi pesanan pelanggan dengan <strong>Tumbler Pribadi</strong> (tanpa biaya cup sekali pakai).
                </span>
              )}
            </div>

            {activeTab === 'JUMBO' && (
              <button
                type="button"
                onClick={syncJumboFromRegular}
                className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px] font-bold shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Auto 1.25x dari Regular
              </button>
            )}
          </div>

          {hasCupInRecipe && (
            <div className="px-5 py-2 bg-blue-50 border-b border-blue-200 text-left flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-[11px] text-blue-900">
                <strong>Catatan Kemasan:</strong> Bahan kemasan cup dihitung otomatis per ukuran dan tidak digabung dobel ke bahan racikan pokok.
              </p>
            </div>
          )}

          {/* Recipe Items Table */}
          <div className="p-5 overflow-y-auto space-y-3.5 text-left flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Bahan Baku Racikan ({activeTab === 'JUMBO' ? 'Porsi Jumbo' : 'Porsi Regular'})
                </h4>
                <p className="text-[11px] text-stone-500">
                  {activeTab === 'JUMBO'
                    ? 'Tentukan jumlah gram/ml bahan yang dibutuhkan khusus untuk gelas Jumbo 22 oz.'
                    : 'Tentukan jumlah gram/ml bahan yang dibutuhkan untuk gelas Regular 16 oz.'}
                </p>
              </div>

              {activeTab === 'REGULAR' && (
                <button
                  type="button"
                  onClick={addRow}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Bahan
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                <span className="text-xs">Memuat data resep...</span>
              </div>
            ) : regularItems.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50">
                <ChefHat className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-600">Belum ada bahan baku racikan</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Klik &quot;Tambah Bahan&quot; untuk menghubungkan resep racikan dan menghitung HPP otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {regularItems.map((regItem, idx) => {
                  const currentIng = ingredients.find((i) => i.id === regItem.ingredientId);
                  const isCup = isCupPackaging(regItem.ingredientId);
                  
                  const jumboItem = jumboItems[idx] || { ingredientId: regItem.ingredientId, quantity: (parseFloat(regItem.quantity) * 1.25).toString() };
                  const activeQty = activeTab === 'JUMBO' ? jumboItem.quantity : regItem.quantity;
                  const subtotal = (parseFloat(activeQty) || 0) * (currentIng?.costPerUnit || 0);

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 shadow-sm ${
                        isCup
                          ? 'border-blue-200 bg-blue-50/30'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      {/* Ingredient Select (Editable in Regular Tab) */}
                      <div className="flex-1">
                        {activeTab === 'REGULAR' ? (
                          <select
                            value={regItem.ingredientId}
                            onChange={(e) => updateRegularRow(idx, 'ingredientId', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/50 focus:ring-2 focus:ring-orange-500"
                          >
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({formatRupiah(ing.costPerUnit)} / {ing.unit}) {ing.isPackaging ? '📦' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3 py-2 bg-stone-50 rounded-xl border border-stone-200/80">
                            <span className="text-xs font-bold text-stone-800">
                              {currentIng?.name || 'Bahan'}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-2">
                              ({formatRupiah(currentIng?.costPerUnit || 0)} / {currentIng?.unit})
                            </span>
                          </div>
                        )}

                        {isCup && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 mt-1">
                            📦 Kemasan Otomatis (Dipotong dinamis per order)
                          </span>
                        )}
                      </div>

                      {/* Quantity Input */}
                      <div className="w-32 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          value={activeQty}
                          disabled={activeTab === 'TUMBLER'}
                          onChange={(e) => {
                            if (activeTab === 'JUMBO') {
                              updateJumboRow(idx, e.target.value);
                            } else {
                              updateRegularRow(idx, 'quantity', e.target.value);
                            }
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl border text-xs font-bold text-right focus:ring-2 focus:ring-orange-500 ${
                            activeTab === 'JUMBO'
                              ? 'border-orange-300 bg-orange-50/40 text-orange-950 font-black'
                              : 'border-stone-200 bg-stone-50/50 text-stone-900'
                          }`}
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

                      {/* Delete button (Only on Regular Tab to keep sync) */}
                      {activeTab === 'REGULAR' && (
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus bahan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
            <div className="text-left text-xs text-stone-500">
              HPP <strong>Regular: {formatRupiah(regularCalc.totalHpp)}</strong> • <strong>Jumbo: {formatRupiah(jumboCalc.totalHpp)}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Simpan Semua Resep
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
