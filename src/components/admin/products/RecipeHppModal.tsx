'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Search,
  Coffee,
  Check,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type {
  ProductItem,
  IngredientItem,
  ModifiersData,
  SugarDosesConfig,
  MatchaDosesConfig,
  ShotDosesConfig,
} from './types';

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

type MainTab = 'REGULAR' | 'JUMBO' | 'TUMBLER' | 'MODIFIERS';

/**
 * Modern Searchable Ingredient Combobox
 * Replaces rigid raw native selects with an intuitive instant-search dropdown.
 */
function SearchableIngredientSelect({
  value,
  onChange,
  ingredients,
  disabled = false,
  placeholder = 'Pilih bahan baku...',
}: {
  value: string;
  onChange: (id: string) => void;
  ingredients: IngredientItem[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => ingredients.find((i) => i.id === value),
    [ingredients, value]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.toLowerCase();
    return ingredients.filter(
      (i) => i.name.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q)
    );
  }, [ingredients, search]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 text-left bg-stone-50 hover:bg-stone-100/90 border border-stone-200 rounded-xl flex items-center justify-between text-xs font-semibold text-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
      >
        <span className="truncate flex items-center gap-1.5">
          {selected ? (
            <>
              <span className="font-bold text-stone-900 truncate">{selected.name}</span>
              <span className="text-[11px] text-stone-400 font-normal">
                ({formatRupiah(selected.costPerUnit)} / {selected.unit})
              </span>
              {selected.isPackaging && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Kemasan
                </span>
              )}
            </>
          ) : (
            <span className="text-stone-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[280px] max-h-64 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-stone-100 flex items-center gap-2 bg-stone-50/80">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Ketik nama bahan baku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none placeholder:text-stone-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-stone-400 hover:text-stone-600 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-48 p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-5 text-center text-xs text-stone-400">
                Bahan baku tidak ditemukan
              </div>
            ) : (
              filtered.map((ing) => {
                const isSelected = ing.id === value;
                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => {
                      onChange(ing.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-2.5 py-2 text-left rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-orange-50 text-orange-800 font-bold border border-orange-200/60'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-stone-900 truncate">{ing.name}</p>
                      <p className="text-[10px] text-stone-400">
                        {formatRupiah(ing.costPerUnit)} per {ing.unit}{' '}
                        {ing.isPackaging ? '• Kemasan Cup' : ''}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<MainTab>('REGULAR');

  // Dosage states for modifiers
  const [sugarConfig, setSugarConfig] = useState<SugarDosesConfig>({
    ingredientId: '',
    less: 10,
    lumayan: 20,
    manisSekali: 30,
  });
  const [matchaConfig, setMatchaConfig] = useState<MatchaDosesConfig>({
    ingredientId: '',
    light: 4,
    medium: 6,
    bold: 8,
    extraBold: 10,
  });
  const [shotConfig, setShotConfig] = useState<ShotDosesConfig>({
    ingredientId: '',
    single: 18,
    double: 36,
    triple: 54,
  });

  const [enableSugarDoses, setEnableSugarDoses] = useState(false);
  const [enableMatchaDoses, setEnableMatchaDoses] = useState(false);
  const [enableShotDoses, setEnableShotDoses] = useState(false);

  // Parse product modifiers
  const parsedModifiers: ModifiersData | null = useMemo(() => {
    if (!product?.modifiers) return null;
    try {
      return typeof product.modifiers === 'string'
        ? JSON.parse(product.modifiers)
        : product.modifiers;
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

  const isCupPackaging = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return false;
    const name = ing.name.toLowerCase();
    return ing.isPackaging || name.includes('cup') || name.includes('gelas');
  };

  // Find candidate ingredients for sugar, matcha, and espresso
  const detectedSugarIng = useMemo(() => {
    return (
      ingredients.find(
        (i) =>
          !i.isPackaging &&
          (i.name.toLowerCase().includes('gula') ||
            i.name.toLowerCase().includes('sugar') ||
            i.name.toLowerCase().includes('aren') ||
            i.name.toLowerCase().includes('syrup'))
      ) || ingredients[0]
    );
  }, [ingredients]);

  const detectedMatchaIng = useMemo(() => {
    return (
      ingredients.find(
        (i) => !i.isPackaging && i.name.toLowerCase().includes('matcha')
      ) || ingredients[0]
    );
  }, [ingredients]);

  const detectedCoffeeIng = useMemo(() => {
    return (
      ingredients.find(
        (i) =>
          !i.isPackaging &&
          (i.name.toLowerCase().includes('kopi') ||
            i.name.toLowerCase().includes('coffee') ||
            i.name.toLowerCase().includes('espresso') ||
            i.name.toLowerCase().includes('nescafe'))
      ) || ingredients[0]
    );
  }, [ingredients]);

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
          setJumboItems(
            mappedReg.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: (
                Math.round((parseFloat(item.quantity) || 0) * 1.25 * 100) / 100
              ).toString(),
            }))
          );
        }

        // Initialize Sugar Doses
        if (data.sugarDoses && data.sugarDoses.ingredientId) {
          setSugarConfig(data.sugarDoses);
          setEnableSugarDoses(true);
        } else {
          const recipeSugar = mappedReg.find((r) => {
            const ing = ingredients.find((i) => i.id === r.ingredientId);
            return (
              ing &&
              (ing.name.toLowerCase().includes('gula') ||
                ing.name.toLowerCase().includes('sugar') ||
                ing.name.toLowerCase().includes('aren'))
            );
          });
          const targetId = recipeSugar ? recipeSugar.ingredientId : detectedSugarIng?.id || '';
          const baseQty = recipeSugar ? parseFloat(recipeSugar.quantity) || 20 : 20;
          setSugarConfig({
            ingredientId: targetId,
            less: Math.round(baseQty * 0.5 * 10) / 10,
            lumayan: baseQty,
            manisSekali: Math.round(baseQty * 1.5 * 10) / 10,
          });
          setEnableSugarDoses(!!recipeSugar);
        }

        // Initialize Matcha Doses
        if (data.matchaDoses && data.matchaDoses.ingredientId) {
          setMatchaConfig(data.matchaDoses);
          setEnableMatchaDoses(true);
        } else {
          const recipeMatcha = mappedReg.find((r) => {
            const ing = ingredients.find((i) => i.id === r.ingredientId);
            return ing && ing.name.toLowerCase().includes('matcha');
          });
          const isMatchaProduct =
            product.name.toLowerCase().includes('matcha') ||
            parsedModifiers?.showMatcha === true;
          const targetId = recipeMatcha ? recipeMatcha.ingredientId : detectedMatchaIng?.id || '';
          const baseQty = recipeMatcha ? parseFloat(recipeMatcha.quantity) || 6 : 6;
          setMatchaConfig({
            ingredientId: targetId,
            light: Math.round(baseQty * 0.65 * 10) / 10,
            medium: baseQty,
            bold: Math.round(baseQty * 1.35 * 10) / 10,
            extraBold: Math.round(baseQty * 1.7 * 10) / 10,
          });
          setEnableMatchaDoses(!!recipeMatcha || isMatchaProduct);
        }

        // Initialize Shot Doses (Single, Double, Triple Shot)
        if (data.shotDoses && data.shotDoses.ingredientId) {
          setShotConfig(data.shotDoses);
          setEnableShotDoses(true);
        } else {
          const recipeCoffee = mappedReg.find((r) => {
            const ing = ingredients.find((i) => i.id === r.ingredientId);
            return (
              ing &&
              (ing.name.toLowerCase().includes('kopi') ||
                ing.name.toLowerCase().includes('coffee') ||
                ing.name.toLowerCase().includes('espresso') ||
                ing.name.toLowerCase().includes('nescafe'))
            );
          });
          const isCoffeeProduct =
            product.name.toLowerCase().includes('kopi') ||
            product.name.toLowerCase().includes('coffee') ||
            product.name.toLowerCase().includes('americano') ||
            product.name.toLowerCase().includes('latte') ||
            parsedModifiers?.showEspressoShot === true;
          const targetId = recipeCoffee ? recipeCoffee.ingredientId : detectedCoffeeIng?.id || '';
          const baseQty = recipeCoffee ? parseFloat(recipeCoffee.quantity) || 18 : 18;
          setShotConfig({
            ingredientId: targetId,
            single: baseQty,
            double: Math.round(baseQty * 2 * 10) / 10,
            triple: Math.round(baseQty * 3 * 10) / 10,
          });
          setEnableShotDoses(!!recipeCoffee || isCoffeeProduct);
        }
      })
      .catch((err) => console.error('Error fetching recipe:', err))
      .finally(() => setLoading(false));
  }, [
    product,
    isOpen,
    ingredients,
    detectedSugarIng,
    detectedMatchaIng,
    detectedCoffeeIng,
    parsedModifiers,
  ]);

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
    if (!product)
      return { rawHpp: 0, cupCost: 0, totalHpp: 0, sellingPrice: 0, grossProfit: 0, marginPercent: 0 };
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
    if (!product)
      return { rawHpp: 0, cupCost: 0, totalHpp: 0, sellingPrice: 0, grossProfit: 0, marginPercent: 0 };
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
    if (!product)
      return { rawHpp: 0, cupCost: 0, totalHpp: 0, sellingPrice: 0, grossProfit: 0, marginPercent: 0 };
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

  // Modifiers HPP Cost Calculators
  const sugarCostBreakdown = useMemo(() => {
    const ing = ingredients.find((i) => i.id === sugarConfig.ingredientId);
    if (!ing) return { lessCost: 0, lumayanCost: 0, manisSekaliCost: 0, unit: 'gr' };
    return {
      lessCost: Math.round(sugarConfig.less * ing.costPerUnit),
      lumayanCost: Math.round(sugarConfig.lumayan * ing.costPerUnit),
      manisSekaliCost: Math.round(sugarConfig.manisSekali * ing.costPerUnit),
      unit: ing.unit,
      costPerUnit: ing.costPerUnit,
    };
  }, [ingredients, sugarConfig]);

  const matchaCostBreakdown = useMemo(() => {
    const ing = ingredients.find((i) => i.id === matchaConfig.ingredientId);
    if (!ing) return { lightCost: 0, mediumCost: 0, boldCost: 0, extraBoldCost: 0, unit: 'gr' };
    return {
      lightCost: Math.round(matchaConfig.light * ing.costPerUnit),
      mediumCost: Math.round(matchaConfig.medium * ing.costPerUnit),
      boldCost: Math.round(matchaConfig.bold * ing.costPerUnit),
      extraBoldCost: Math.round(matchaConfig.extraBold * ing.costPerUnit),
      unit: ing.unit,
      costPerUnit: ing.costPerUnit,
    };
  }, [ingredients, matchaConfig]);

  const shotCostBreakdown = useMemo(() => {
    const ing = ingredients.find((i) => i.id === shotConfig.ingredientId);
    if (!ing) return { singleCost: 0, doubleCost: 0, tripleCost: 0, unit: 'gr' };
    return {
      singleCost: Math.round(shotConfig.single * ing.costPerUnit),
      doubleCost: Math.round(shotConfig.double * ing.costPerUnit),
      tripleCost: Math.round(shotConfig.triple * ing.costPerUnit),
      unit: ing.unit,
      costPerUnit: ing.costPerUnit,
    };
  }, [ingredients, shotConfig]);

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

      const payload: any = {
        items: validRegular,
        jumboItems: validJumbo,
      };

      if (enableSugarDoses && sugarConfig.ingredientId) {
        payload.sugarDoses = sugarConfig;
      } else {
        payload.sugarDoses = null;
      }

      if (enableMatchaDoses && matchaConfig.ingredientId) {
        payload.matchaDoses = matchaConfig;
      } else {
        payload.matchaDoses = null;
      }

      if (enableShotDoses && shotConfig.ingredientId) {
        payload.shotDoses = shotConfig;
      } else {
        payload.shotDoses = null;
      }

      const res = await fetch(`/api/admin/products/${product.id}/recipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      showToast('Resep & Takaran Modifikasi berhasil disimpan!', 'success');
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
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200/80 overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Top Header - Modern Minimalist */}
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 line-clamp-1">
                  Resep & Kalkulasi HPP: {product.name}
                </h3>
                <p className="text-xs text-stone-500 flex items-center gap-2">
                  <span>
                    Regular: <strong className="text-orange-600">{formatRupiah(product.price)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Jumbo: <strong className="text-orange-600">{formatRupiah(product.price + largeExtraPrice)}</strong>
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Navigation Tab Bar */}
          <div className="px-6 pt-3 pb-3 bg-white border-b border-stone-100 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center p-1 bg-stone-100/80 rounded-2xl border border-stone-200/60 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('REGULAR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'REGULAR'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/60'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Regular (16 oz)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('JUMBO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'JUMBO'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/60'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                Jumbo (22 oz)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('TUMBLER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'TUMBLER'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/60'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tumbler
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MODIFIERS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'MODIFIERS'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'text-stone-700 hover:text-orange-600'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Takaran Modifikasi
                {(enableSugarDoses || enableMatchaDoses || enableShotDoses) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>

            {activeTab === 'JUMBO' && (
              <button
                type="button"
                onClick={syncJumboFromRegular}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors cursor-pointer"
                title="Salin semua bahan regular dikali 1.25x ke porsi Jumbo"
              >
                <RefreshCw className="w-3 h-3" /> Auto Skala 1.25x
              </button>
            )}
          </div>

          {/* Size Tab Content: Financial KPI Cards + Recipe Items */}
          {activeTab !== 'MODIFIERS' && (
            <>
              {/* Financial Metrics Cards */}
              <div className="px-6 py-3.5 bg-stone-50/40 border-b border-stone-100 grid grid-cols-3 gap-3 text-left">
                {/* 1. Total HPP */}
                <div className="p-3 bg-white rounded-2xl border border-stone-200/70 shadow-xs">
                  <div className="flex items-center justify-between text-stone-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Total HPP ({activeTab})
                    </span>
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-base sm:text-lg font-heading font-black text-stone-900">
                    {formatRupiah(activeCalc.totalHpp)}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                    Bahan: {formatRupiah(activeCalc.rawHpp)}
                    {activeTab !== 'TUMBLER' && ` + Cup: ${formatRupiah(activeCalc.cupCost)}`}
                  </p>
                </div>

                {/* 2. Laba Kotor */}
                <div className="p-3 bg-white rounded-2xl border border-stone-200/70 shadow-xs">
                  <div className="flex items-center justify-between text-stone-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Laba Kotor / Porsi
                    </span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-base sm:text-lg font-heading font-black text-emerald-600">
                    {formatRupiah(activeCalc.grossProfit)}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                    Harga Jual: {formatRupiah(activeCalc.sellingPrice)}
                  </p>
                </div>

                {/* 3. Margin Profit */}
                <div className="p-3 bg-white rounded-2xl border border-stone-200/70 shadow-xs">
                  <div className="flex items-center justify-between text-stone-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Margin Profit
                    </span>
                    <Percent className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-base sm:text-lg font-heading font-black ${
                        activeCalc.marginPercent >= 50
                          ? 'text-emerald-600'
                          : activeCalc.marginPercent >= 30
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {activeCalc.marginPercent}%
                    </p>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        activeCalc.marginPercent >= 50
                          ? 'bg-emerald-50 text-emerald-700'
                          : activeCalc.marginPercent >= 30
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {activeCalc.marginPercent >= 50
                        ? 'Sehat'
                        : activeCalc.marginPercent >= 30
                        ? 'Standar F&B'
                        : 'Tipis'}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-0.5 truncate">Standar F&B: 35-50%</p>
                </div>
              </div>

              {/* Informative Hint Banner */}
              <div className="px-6 py-2 bg-orange-50/50 border-b border-orange-100 flex items-center gap-2 text-left">
                <Info className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <p className="text-[11px] text-orange-900">
                  {activeTab === 'JUMBO' ? (
                    <>
                      Takaran khusus <strong>Gelas Jumbo (22 oz)</strong>. Biaya Cup Jumbo (
                      {formatRupiah(cupJumboCost)}) ditambahkan otomatis.
                    </>
                  ) : activeTab === 'TUMBLER' ? (
                    <>
                      Simulasi <strong>Bawa Tumbler Sendiri</strong>. Bebas biaya kemasan cup plastik (
                      <strong>Rp 0</strong>).
                    </>
                  ) : (
                    <>
                      Takaran dasar <strong>Gelas Regular (16 oz)</strong>. Biaya Cup Regular (
                      {formatRupiah(cupRegularCost)}) ditambahkan otomatis.
                    </>
                  )}
                </p>
              </div>

              {/* Recipe Items Table */}
              <div className="p-6 overflow-y-auto space-y-3.5 text-left flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Bahan Baku Racikan ({activeTab === 'JUMBO' ? 'Porsi Jumbo' : 'Porsi Regular'})
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {activeTab === 'JUMBO'
                        ? 'Tentukan jumlah gram/ml bahan yang dibutuhkan khusus untuk porsi Jumbo 22 oz.'
                        : 'Tentukan jumlah gram/ml bahan yang dibutuhkan untuk porsi Regular 16 oz.'}
                    </p>
                  </div>

                  {activeTab === 'REGULAR' && (
                    <button
                      type="button"
                      onClick={addRow}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-orange-200/60 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Bahan
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-stone-400">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                    <span className="text-xs font-medium">Memuat data resep...</span>
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

                      const jumboItem = jumboItems[idx] || {
                        ingredientId: regItem.ingredientId,
                        quantity: (parseFloat(regItem.quantity) * 1.25).toString(),
                      };
                      const activeQty = activeTab === 'JUMBO' ? jumboItem.quantity : regItem.quantity;
                      const subtotal = (parseFloat(activeQty) || 0) * (currentIng?.costPerUnit || 0);

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all flex items-center gap-3 shadow-2xs ${
                            isCup
                              ? 'border-blue-200 bg-blue-50/30'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          {/* Searchable Combobox */}
                          <div className="flex-1 min-w-[200px]">
                            {activeTab === 'REGULAR' ? (
                              <SearchableIngredientSelect
                                value={regItem.ingredientId}
                                onChange={(val) => updateRegularRow(idx, 'ingredientId', val)}
                                ingredients={ingredients}
                              />
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
                          <div className="w-28 sm:w-32 flex items-center gap-1.5 shrink-0">
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
                              className={`w-full px-2.5 py-2 rounded-xl border text-xs font-bold text-right focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all ${
                                activeTab === 'JUMBO'
                                  ? 'border-orange-300 bg-orange-50/40 text-orange-950 font-black'
                                  : 'border-stone-200 bg-stone-50/50 text-stone-900'
                              }`}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-stone-400 w-9 truncate">
                              {currentIng?.unit || 'unit'}
                            </span>
                          </div>

                          {/* Subtotal */}
                          <div className="w-20 sm:w-24 text-right shrink-0">
                            <span className="text-xs font-bold text-stone-700">
                              {formatRupiah(subtotal)}
                            </span>
                          </div>

                          {/* Delete button */}
                          {activeTab === 'REGULAR' && (
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
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
            </>
          )}

          {/* Modifiers Tab Content: Sweetness, Matcha, Espresso Shot */}
          {activeTab === 'MODIFIERS' && (
            <div className="p-6 overflow-y-auto space-y-5 text-left flex-1">
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-start gap-3">
                <Sliders className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Takaran Fleksibel Modifikasi Minuman
                  </h4>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed mt-0.5">
                    Atur gramatur bahan spesifik untuk tingkat kemanisan (Less, Lumayan, Manis Sekali), kepekatan matcha (Light s/d Extra Bold), dan espresso shot (Single hingga Triple Shot). Stok inventaris akan dipotong secara akurat sesuai racikan pelanggan.
                  </p>
                </div>
              </div>

              {/* 1. SWEETNESS / GULA */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Takaran Tingkat Kemanisan (Sweetness Level)
                      </h4>
                      <p className="text-[10px] text-stone-400">
                        Pilihan takaran untuk Less, Lumayan (Biasa), dan Manis Sekali
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableSugarDoses}
                      onChange={(e) => setEnableSugarDoses(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {enableSugarDoses && (
                  <div className="pt-2 border-t border-stone-100 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        Bahan Baku Pemanis / Gula:
                      </label>
                      <SearchableIngredientSelect
                        value={sugarConfig.ingredientId}
                        onChange={(id) => setSugarConfig((prev) => ({ ...prev, ingredientId: id }))}
                        ingredients={ingredients}
                        placeholder="Pilih bahan gula (misal: Gula Aren, Simple Syrup)..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Less Sugar */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Less Sugar (Sedikit)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={sugarConfig.less}
                            onChange={(e) =>
                              setSugarConfig((prev) => ({
                                ...prev,
                                less: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {sugarCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700 font-semibold mt-1">
                          Biaya: {formatRupiah(sugarCostBreakdown.lessCost)}
                        </p>
                      </div>

                      {/* Lumayan / Biasa */}
                      <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-200">
                        <span className="text-[11px] font-bold text-orange-950 block">
                          Lumayan (Biasa / Standar)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={sugarConfig.lumayan}
                            onChange={(e) =>
                              setSugarConfig((prev) => ({
                                ...prev,
                                lumayan: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-orange-200 text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {sugarCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-orange-700 font-semibold mt-1">
                          Biaya: {formatRupiah(sugarCostBreakdown.lumayanCost)}
                        </p>
                      </div>

                      {/* Manis Sekali */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Manis Sekali (Extra Sweet)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={sugarConfig.manisSekali}
                            onChange={(e) =>
                              setSugarConfig((prev) => ({
                                ...prev,
                                manisSekali: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {sugarCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700 font-semibold mt-1">
                          Biaya: {formatRupiah(sugarCostBreakdown.manisSekaliCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. MATCHA LEVELS */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Takaran Kepekatan Matcha (Matcha Level)
                      </h4>
                      <p className="text-[10px] text-stone-400">
                        Pilihan takaran bubuk matcha untuk level Light hingga Extra Bold
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMatchaDoses}
                      onChange={(e) => setEnableMatchaDoses(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {enableMatchaDoses && (
                  <div className="pt-2 border-t border-stone-100 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        Bahan Baku Bubuk Matcha:
                      </label>
                      <SearchableIngredientSelect
                        value={matchaConfig.ingredientId}
                        onChange={(id) =>
                          setMatchaConfig((prev) => ({ ...prev, ingredientId: id }))
                        }
                        ingredients={ingredients}
                        placeholder="Pilih bubuk matcha..."
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Light */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Light (Lvl 1-3)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={matchaConfig.light}
                            onChange={(e) =>
                              setMatchaConfig((prev) => ({
                                ...prev,
                                light: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {matchaCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-semibold mt-1 truncate">
                          {formatRupiah(matchaCostBreakdown.lightCost)}
                        </p>
                      </div>

                      {/* Medium */}
                      <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-200">
                        <span className="text-[11px] font-bold text-orange-950 block">
                          Medium (Lvl 4-6)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={matchaConfig.medium}
                            onChange={(e) =>
                              setMatchaConfig((prev) => ({
                                ...prev,
                                medium: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-orange-200 text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {matchaCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-orange-700 font-semibold mt-1 truncate">
                          {formatRupiah(matchaCostBreakdown.mediumCost)}
                        </p>
                      </div>

                      {/* Bold */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Bold (Lvl 7-8)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={matchaConfig.bold}
                            onChange={(e) =>
                              setMatchaConfig((prev) => ({
                                ...prev,
                                bold: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {matchaCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-semibold mt-1 truncate">
                          {formatRupiah(matchaCostBreakdown.boldCost)}
                        </p>
                      </div>

                      {/* Extra Bold */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Extra Bold (9-10)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={matchaConfig.extraBold}
                            onChange={(e) =>
                              setMatchaConfig((prev) => ({
                                ...prev,
                                extraBold: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {matchaCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-semibold mt-1 truncate">
                          {formatRupiah(matchaCostBreakdown.extraBoldCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. ESPRESSO SHOT DOSES (Single, Double, Triple Shot) */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Takaran Espresso Shot (Single, Double, Triple)
                      </h4>
                      <p className="text-[10px] text-stone-400">
                        Pilihan takaran kopi dari Single Shot hingga Triple Shot
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableShotDoses}
                      onChange={(e) => setEnableShotDoses(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {enableShotDoses && (
                  <div className="pt-2 border-t border-stone-100 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        Bahan Baku Kopi / Espresso:
                      </label>
                      <SearchableIngredientSelect
                        value={shotConfig.ingredientId}
                        onChange={(id) => setShotConfig((prev) => ({ ...prev, ingredientId: id }))}
                        ingredients={ingredients}
                        placeholder="Pilih bahan kopi (misal: Nescafe, Espresso Beans)..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Single Shot */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Single Shot (1 Shot)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={shotConfig.single}
                            onChange={(e) =>
                              setShotConfig((prev) => ({
                                ...prev,
                                single: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {shotCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-800 font-semibold mt-1">
                          Biaya: {formatRupiah(shotCostBreakdown.singleCost)}
                        </p>
                      </div>

                      {/* Double Shot */}
                      <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-200">
                        <span className="text-[11px] font-bold text-orange-950 block">
                          Double Shot (2 Shots)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={shotConfig.double}
                            onChange={(e) =>
                              setShotConfig((prev) => ({
                                ...prev,
                                double: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-orange-200 text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {shotCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-orange-700 font-semibold mt-1">
                          Biaya: {formatRupiah(shotCostBreakdown.doubleCost)}
                        </p>
                      </div>

                      {/* Triple Shot */}
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-[11px] font-bold text-stone-700 block">
                          Triple Shot (3 Shots)
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={shotConfig.triple}
                            onChange={(e) =>
                              setShotConfig((prev) => ({
                                ...prev,
                                triple: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-right rounded-lg bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[11px] text-stone-400 font-bold w-6">
                            {shotCostBreakdown.unit}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-800 font-semibold mt-1">
                          Biaya: {formatRupiah(shotCostBreakdown.tripleCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Sticky Action Footer */}
          <div className="p-4 border-t border-stone-100 bg-stone-50/90 flex items-center justify-between">
            <div className="text-left text-xs text-stone-500">
              HPP <strong>Regular: {formatRupiah(regularCalc.totalHpp)}</strong> •{' '}
              <strong>Jumbo: {formatRupiah(jumboCalc.totalHpp)}</strong>
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
