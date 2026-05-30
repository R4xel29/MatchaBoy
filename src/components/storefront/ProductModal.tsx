'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Check } from 'lucide-react';
import type { Product, IceLevel, SugarLevel, AddOn } from '@/types';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { ADD_ONS } from '@/lib/constants';
import { PromoCountdown } from './PromoCountdown';
import { useSession } from 'next-auth/react';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  editCartItemId?: string;
  initialData?: any; // To preload ice, sugar, addOns, qty
  allProducts?: Product[];
}

const ICE_LEVELS: IceLevel[] = ['Normal Ice', 'Less Ice', 'No Ice'];
const SUGAR_LEVELS: SugarLevel[] = ['Normal Sugar', 'Less Sugar'];

export function ProductModal({ 
  product, 
  isOpen, 
  onClose, 
  editCartItemId, 
  initialData, 
  allProducts = [] 
}: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const editItem = useCartStore((s) => s.editItem);

  const [iceLevel, setIceLevel] = useState<IceLevel>('Normal Ice');
  const [sugarLevel, setSugarLevel] = useState<SugarLevel>('Normal Sugar');
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [size, setSize] = useState<string>('Normal');
  const [sizePrice, setSizePrice] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [matchaLevel, setMatchaLevel] = useState<number>(5);
  
  // Bundle Selection State
  const [bundleSelections, setBundleSelections] = useState<{ [groupId: string]: any }>({});

  const { data: session } = useSession();
  const isSoldOut = product?.badge === 'sold-out';
  const [subPhone, setSubPhone] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Initialize contact info from session
  useEffect(() => {
    if (isOpen && product && isSoldOut) {
      setSubPhone((session?.user as any)?.phone || '');
      setSubEmail(session?.user?.email || '');
      setSubSuccess(false);
      setSubError(null);
    }
  }, [isOpen, product, isSoldOut, session]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubLoading(true);
    setSubError(null);

    try {
      const res = await fetch(`/api/products/${product.id}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: subPhone || undefined,
          email: subEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mendaftar notifikasi.');
      }

      setSubSuccess(true);
    } catch (err: any) {
      setSubError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Sync state with initialData when modal opens
  useMemo(() => {
    if (isOpen) {
      if (initialData) {
        setIceLevel(initialData.iceLevel || 'Normal Ice');
        setSugarLevel(initialData.sugarLevel || 'Normal Sugar');
        setSelectedAddOns(initialData.addOns || []);
        setSize(initialData.size || 'Normal');
        setSizePrice(initialData.sizePrice || 0);
        setQuantity(initialData.quantity || 1);
        setMatchaLevel(initialData.matchaLevel || 5);
        if (initialData.bundleSelections) {
          const loaded: { [groupId: string]: any } = {};
          initialData.bundleSelections.forEach((s: any) => {
            loaded[s.groupId] = s;
          });
          setBundleSelections(loaded);
        }
      } else {
        setIceLevel('Normal Ice');
        setSugarLevel('Normal Sugar');
        setSelectedAddOns([]);
        setSize('Normal');
        setSizePrice(0);
        setQuantity(1);
        setMatchaLevel(5);

        if (product?.modifiers?.isBundle && product.modifiers.bundleGroups) {
          const defaults: { [groupId: string]: any } = {};
          product.modifiers.bundleGroups.forEach(group => {
            const firstOption = group.options?.[0];
            if (firstOption) {
              const optProduct = allProducts?.find(p => p.id === firstOption.productId);
              defaults[group.id] = {
                groupId: group.id,
                groupName: group.name,
                productId: firstOption.productId,
                productName: firstOption.name,
                priceAdjustment: firstOption.priceAdjustment || 0,
                iceLevel: optProduct?.modifiers?.iceLevel && optProduct.modifiers.iceLevel.length > 0 ? optProduct.modifiers.iceLevel[0] : undefined,
                sugarLevel: optProduct?.modifiers?.sugarLevel && optProduct.modifiers.sugarLevel.length > 0 ? optProduct.modifiers.sugarLevel[0] : undefined
              };
            }
          });
          setBundleSelections(defaults);
        } else {
          setBundleSelections({});
        }
      }
    }
  }, [isOpen, initialData, product, allProducts]);

  // Reset state on explicit close (fallback)
  const resetState = () => {
    if (!initialData) {
      setIceLevel('Normal Ice');
      setSugarLevel('Normal Sugar');
      setSelectedAddOns([]);
      setSize('Normal');
      setSizePrice(0);
      setQuantity(1);
      setBundleSelections({});
      setMatchaLevel(5);
    }
  };

  const addOnTotal = useMemo(
    () => selectedAddOns.reduce((sum, a) => sum + a.price, 0),
    [selectedAddOns]
  );

  const bundleSelectionsArray = useMemo(
    () => Object.values(bundleSelections),
    [bundleSelections]
  );

  const bundleAdjustmentsTotal = useMemo(() => {
    return bundleSelectionsArray.reduce((sum, item: any) => sum + (item.priceAdjustment || 0), 0);
  }, [bundleSelectionsArray]);

  const activePromo = product ? getActivePromo(product) : null;
  const baseProductPrice = activePromo ? activePromo.promoPrice : (product?.price ?? 0);

  const unitPrice = product?.modifiers?.isBundle
    ? (baseProductPrice + bundleAdjustmentsTotal)
    : (baseProductPrice + sizePrice + addOnTotal);
  
  const totalPrice = unitPrice * quantity;

  const isMatchaProduct = useMemo(() => {
    if (!product) return false;
    const nameLower = product.name.toLowerCase();
    const descLower = product.description.toLowerCase();
    return nameLower.includes('matcha') || nameLower.includes('green tea') || descLower.includes('matcha');
  }, [product]);

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addOn.id);
      return exists ? prev.filter((a) => a.id !== addOn.id) : [...prev, addOn];
    });
  };

  const handleSelectOption = (groupId: string, option: any) => {
    const optProduct = allProducts?.find(p => p.id === option.productId);
    setBundleSelections((prev) => ({
      ...prev,
      [groupId]: {
        groupId,
        groupName: product?.modifiers?.bundleGroups?.find((g) => g.id === groupId)?.name || '',
        productId: option.productId,
        productName: option.name,
        priceAdjustment: option.priceAdjustment || 0,
        iceLevel: optProduct?.modifiers?.iceLevel && optProduct.modifiers.iceLevel.length > 0 ? optProduct.modifiers.iceLevel[0] : undefined,
        sugarLevel: optProduct?.modifiers?.sugarLevel && optProduct.modifiers.sugarLevel.length > 0 ? optProduct.modifiers.sugarLevel[0] : undefined
      }
    }));
  };

  const handleOptionIceChange = (groupId: string, ice: IceLevel) => {
    setBundleSelections((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      return {
        ...prev,
        [groupId]: { ...current, iceLevel: ice }
      };
    });
  };

  const handleOptionSugarChange = (groupId: string, sugar: SugarLevel) => {
    setBundleSelections((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      return {
        ...prev,
        [groupId]: { ...current, sugarLevel: sugar }
      };
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    const promo = getActivePromo(product);
    const effectiveBasePrice = promo ? promo.promoPrice : product.price;
    
    const itemData = {
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: effectiveBasePrice,
      quantity,
      iceLevel: product.modifiers?.isBundle ? 'Normal Ice' as const : iceLevel,
      sugarLevel: product.modifiers?.isBundle ? 'Normal Sugar' as const : sugarLevel,
      size: product.modifiers?.isBundle ? 'Normal' : size,
      sizePrice: product.modifiers?.isBundle ? 0 : sizePrice,
      addOns: product.modifiers?.isBundle ? [] : selectedAddOns,
      isBundle: product.modifiers?.isBundle || false,
      bundleSelections: product.modifiers?.isBundle ? (bundleSelectionsArray as any[]) : undefined,
      matchaLevel: isMatchaProduct ? matchaLevel : undefined
    };

    if (editCartItemId) {
      editItem(editCartItemId, itemData);
    } else {
      addItem(itemData);
    }
    
    onClose();
    resetState();
  };

  const hasIceOption = product?.modifiers?.iceLevel && product.modifiers.iceLevel.length > 0;
  const hasSugarOption = product?.modifiers?.sugarLevel && product.modifiers.sugarLevel.length > 0;
  const hasAddOns = product?.modifiers?.addOns && product.modifiers.addOns.length > 0;
  const hasSizeOption = product?.modifiers?.sizes && product.modifiers.sizes.length > 0;
  const isBundleProduct = product?.modifiers?.isBundle === true;

  return (
    <AnimatePresence>
      {isOpen && product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.95, x: '-50%', y: '-45%' } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95, x: '-50%', y: '-45%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            drag={isDesktop ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, { offset }) => {
              if (!isDesktop && offset.y > 150) onClose();
            }}
            className={`fixed z-[101] bg-card shadow-2xl flex flex-col overflow-hidden
              ${isDesktop 
                ? 'top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md rounded-2xl max-h-[85vh]' 
                : 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh]'
              }`}
          >
            {/* Drag handle (Mobile only) */}
            {!isDesktop && (
              <div className="flex justify-center pt-3 pb-1 shrink-0 bg-card z-10">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 
                w-9 h-9 flex items-center justify-center 
                rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 
                transition-colors touch-target"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Scrollable Content Area */}
            <div className="overflow-y-auto flex-1 w-full pb-safe">
              {/* Product Image */}
              <div className="relative w-full aspect-[16/10] bg-brand-50 mx-auto shrink-0">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="px-5 pt-4 pb-6 space-y-5">
                {/* Flash Sale / Promo Banner */}
                {activePromo && (
                  <div className="-mx-5 -mt-4 px-5 py-3 bg-gradient-to-r from-rose-600 to-orange-500 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-xs uppercase tracking-wider">🔥 Flash Sale</span>
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Hemat {formatRupiah(product.price - activePromo.promoPrice)}
                      </span>
                    </div>
                    <PromoCountdown endDate={activePromo.endDate} className="text-white" />
                  </div>
                )}

                {/* Title & Description */}
                <div>
                  <h2 className="font-heading font-bold text-xl text-foreground">
                    {product.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    {activePromo ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through font-medium">
                          {formatRupiah(product.price)}
                        </span>
                        <span className="font-black text-xl text-rose-600">
                          {formatRupiah(activePromo.promoPrice)}
                        </span>
                      </>
                    ) : (
                      <>
                        {product.modifiers?.originalPrice && product.modifiers.originalPrice > product.price && (
                          <span className="text-sm text-muted-foreground line-through font-medium">
                            {formatRupiah(product.modifiers.originalPrice)}
                          </span>
                        )}
                        <span className="font-bold text-lg text-brand-700">
                          {formatRupiah(product.price)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isSoldOut ? (
                  <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-5 space-y-4">
                    <div className="text-center space-y-1.5">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-100 text-brand-700 text-lg mb-1">
                        🍵
                      </span>
                      <h3 className="font-heading font-bold text-base text-foreground">
                        Stok Sedang Habis
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        Dapatkan notifikasi WhatsApp segera setelah <strong>{product.name}</strong> tersedia kembali di Matchaboy!
                      </p>
                    </div>

                    {subSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-sm font-bold text-emerald-800">
                          Berhasil Mendaftar! 🎉
                        </p>
                        <p className="text-xs text-emerald-600">
                          Kami akan mengirimkan notifikasi ke nomor WhatsApp Anda saat produk ini siap dipesan kembali.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubscribe} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Nomor WhatsApp
                          </label>
                          <input
                            type="tel"
                            placeholder="Contoh: 081234567890"
                            required
                            value={subPhone}
                            onChange={(e) => setSubPhone(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Email (Opsional)
                          </label>
                          <input
                            type="email"
                            placeholder="nama@email.com"
                            value={subEmail}
                            onChange={(e) => setSubEmail(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>

                        {subError && (
                          <p className="text-xs text-rose-600 font-semibold mt-1">
                            ⚠️ {subError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={subLoading}
                          className="w-full py-3.5 px-6 mt-3 rounded-xl gradient-brand text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          {subLoading ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            'Beritahu Saya'
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <>
                    {isBundleProduct && product.modifiers?.bundleGroups ? (
                      /* ── Combo / Bundle Customization Grid ── */
                      <div className="space-y-6">
                        {product.modifiers.bundleGroups.map((group) => {
                          const selected = bundleSelections[group.id];
                          return (
                            <div key={group.id} className="space-y-3">
                              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                                <span>{group.name}</span>
                                <span className="text-[10px] text-brand-700 font-semibold">(Pilih 1)</span>
                              </h3>

                              {/* Options list */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {group.options.map((option) => {
                                  const isSelected = selected?.productId === option.productId;
                                  const optProduct = allProducts?.find(p => p.id === option.productId);
                                  return (
                                    <div key={option.productId} className="flex flex-col">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectOption(group.id, option)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-brand-400
                                          ${isSelected 
                                            ? 'border-brand-600 bg-brand-50/50 shadow-[0_2px_8px_rgba(139,92,26,0.06)]' 
                                            : 'border-border bg-card'
                                          }`}
                                      >
                                        {optProduct?.image && (
                                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                                            <Image
                                              src={optProduct.image}
                                              alt={option.name}
                                              fill
                                              sizes="48px"
                                              className="object-cover"
                                            />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold text-foreground line-clamp-1">{option.name}</p>
                                          {option.priceAdjustment > 0 && (
                                            <p className="text-[10px] text-brand-700 font-semibold mt-0.5">+{formatRupiah(option.priceAdjustment)}</p>
                                          )}
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0
                                          ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-border bg-white'}`}
                                        >
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                      </button>

                                      {/* Inline options for selected drinks inside combo */}
                                      {isSelected && optProduct && (
                                        <div className="mt-1.5 ml-2 p-2.5 rounded-lg bg-brand-50/20 border border-brand-100/40 space-y-2">
                                          {/* Ice Selector */}
                                          {optProduct.modifiers?.iceLevel && optProduct.modifiers.iceLevel.length > 0 && (
                                            <div>
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pilihan Es:</p>
                                              <div className="flex gap-1 flex-wrap">
                                                {optProduct.modifiers.iceLevel.map((ice) => (
                                                  <button
                                                    key={ice}
                                                    type="button"
                                                    onClick={() => handleOptionIceChange(group.id, ice as IceLevel)}
                                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all
                                                      ${selected.iceLevel === ice
                                                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                                        : 'bg-white text-muted-foreground border-border/80 hover:border-brand-400'
                                                      }`}
                                                  >
                                                    {ice}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Sugar Selector */}
                                          {optProduct.modifiers?.sugarLevel && optProduct.modifiers.sugarLevel.length > 0 && (
                                            <div>
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Level Gula:</p>
                                              <div className="flex gap-1 flex-wrap">
                                                {optProduct.modifiers.sugarLevel.map((sugar) => (
                                                  <button
                                                    key={sugar}
                                                    type="button"
                                                    onClick={() => handleOptionSugarChange(group.id, sugar as SugarLevel)}
                                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all
                                                      ${selected.sugarLevel === sugar
                                                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                                        : 'bg-white text-muted-foreground border-border/80 hover:border-brand-400'
                                                      }`}
                                                  >
                                                    {sugar}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* ── Standard Customization ── */
                      <>
                        {/* Matcha Level Slider (Khusus Produk Matcha) */}
                        {isMatchaProduct && (
                          <div className="space-y-3 bg-[#2E5A44]/5 p-4.5 rounded-3xl border border-[#2E5A44]/15 shadow-[0_4px_20px_rgba(46,90,68,0.02)] relative overflow-hidden mb-4">
                            {/* Visual Cup SVG Dinamis di Samping */}
                            <div className="flex items-center gap-4.5">
                              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                <MatchaCupVisualizer level={matchaLevel} />
                              </div>
                              <div className="flex-1 space-y-1 w-full text-left">
                                <h3 className="text-sm font-black text-gray-900 flex items-center justify-start gap-1">
                                  <span>Kepekatan Matcha</span> 🍵
                                </h3>
                                <p className="text-[10px] text-muted-foreground font-semibold leading-normal">
                                  Sesuaikan intensitas bubuk chasen matcha murni pilihanmu.
                                </p>
                                <div className="mt-1 flex items-baseline justify-start gap-1.5">
                                  <span className="text-xl font-black text-[#2E5A44] leading-none">{matchaLevel}</span>
                                  <span className="text-[9px] text-[#8C6239] font-black uppercase tracking-wider bg-[#8C6239]/10 px-2 py-0.5 rounded-md leading-none">
                                    {matchaLevel <= 3 && 'Mild Creamy 🥛'}
                                    {matchaLevel >= 4 && matchaLevel <= 6 && 'Perfect Balance ⚖️'}
                                    {matchaLevel >= 7 && matchaLevel <= 8 && 'Strong Shot ⚡'}
                                    {matchaLevel >= 9 && 'Ceremonial Pure 🏆'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Range Slider */}
                            <div className="pt-2 px-1 relative">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={matchaLevel}
                                onChange={(e) => setMatchaLevel(parseInt(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-emerald-100 via-emerald-400 to-emerald-950 focus:outline-none"
                                style={{
                                  WebkitAppearance: 'none',
                                }}
                              />
                              <div className="flex justify-between text-[8px] font-black text-[#A69F94] uppercase tracking-widest mt-1.5 px-0.5 select-none">
                                <span>Mild</span>
                                <span>Medium</span>
                                <span>Strong</span>
                                <span>Pure</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Ukuran */}
                        {hasSizeOption && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                              Ukuran
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              {product.modifiers?.sizes?.map((sz: any) => (
                                <button
                                  key={sz.name}
                                  type="button"
                                  onClick={() => {
                                    setSize(sz.name);
                                    setSizePrice(sz.price);
                                  }}
                                  className={`px-4 py-2 rounded-full text-sm font-medium 
                                    transition-all touch-target border
                                    ${
                                      size === sz.name
                                        ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                                        : 'bg-card text-foreground border-border hover:border-brand-400'
                                    }`}
                                >
                                  {sz.name} {sz.price > 0 ? `(+${formatRupiah(sz.price)})` : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ice Level */}
                        {hasIceOption && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                              Ice Level
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              {ICE_LEVELS.map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setIceLevel(level)}
                                  className={`px-4 py-2 rounded-full text-sm font-medium 
                                    transition-all touch-target border
                                    ${
                                      iceLevel === level
                                        ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                                        : 'bg-card text-foreground border-border hover:border-brand-400'
                                    }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sugar Level */}
                        {hasSugarOption && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                              Sugar Level
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              {SUGAR_LEVELS.map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setSugarLevel(level)}
                                  className={`px-4 py-2 rounded-full text-sm font-medium 
                                    transition-all touch-target border
                                    ${
                                      sugarLevel === level
                                        ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                                        : 'bg-card text-foreground border-border hover:border-brand-400'
                                    }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add-Ons */}
                        {hasAddOns && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                              Add-Ons
                            </h3>
                            <div className="space-y-2">
                              {(product.modifiers?.addOns ?? ADD_ONS).map((addOn) => {
                                const isSelected = selectedAddOns.some(
                                  (a) => a.id === addOn.id
                                );
                                return (
                                  <button
                                    key={addOn.id}
                                    onClick={() => toggleAddOn(addOn)}
                                    className={`w-full flex items-center justify-between 
                                      px-4 py-3 rounded-xl border transition-all touch-target
                                      ${
                                        isSelected
                                          ? 'border-brand-600 bg-brand-50'
                                          : 'border-border bg-card hover:border-brand-300'
                                      }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-5 h-5 rounded-md flex items-center justify-center 
                                          transition-colors border
                                          ${
                                            isSelected
                                              ? 'bg-brand-700 border-brand-700'
                                              : 'bg-card border-border'
                                          }`}
                                      >
                                        {isSelected && (
                                          <Check className="w-3 h-3 text-white" />
                                        )}
                                      </div>
                                      <span className="text-sm font-medium text-foreground">
                                        {addOn.name}
                                      </span>
                                    </div>
                                    <span className="text-sm text-brand-600 font-medium">
                                      +{formatRupiah(addOn.price)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Quantity + Add to Cart */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-9 h-9 flex items-center justify-center rounded-lg 
                            bg-card shadow-sm text-foreground touch-target
                            hover:bg-brand-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </motion.button>
                        <span className="w-8 text-center font-bold text-sm text-foreground">
                          {quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg 
                            bg-card shadow-sm text-foreground touch-target
                            hover:bg-brand-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>

                      {/* Add/Save to Cart */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleAddToCart}
                        className="flex-1 py-3.5 px-6 rounded-xl 
                          gradient-brand text-white 
                          font-semibold text-sm
                          shadow-lg shadow-brand-700/20
                          active:shadow-md
                          transition-shadow"
                      >
                        {editCartItemId ? 'Simpan — ' : 'Add — '}
                        {formatRupiah(totalPrice)}
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Premium Matcha Cup Visualizer Component ──
function MatchaCupVisualizer({ level }: { level: number }) {
  // Interpolate color from light milky green (level 1) to deep ceremonial dark green (level 10)
  // Level 1: HSL(95, 45%, 85%) -> Level 10: HSL(140, 65%, 12%)
  const h = 95 + (level - 1) * (45 / 9);     // 95 -> 140
  const s = 45 + (level - 1) * (20 / 9);     // 45% -> 65%
  const l = 85 - (level - 1) * (73 / 9);     // 85% -> 12%

  const liquidColor = `hsl(${h}, ${s}%, ${l}%)`;
  
  // Calculate bubble and steam particles count based on level
  const steamCount = Math.min(6, Math.floor(level / 1.5) + 1);
  const bubbleCount = Math.min(10, level);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center select-none pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes steam-rise {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 0.55; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes bubble-float {
          0% { transform: translateY(0) scale(0.6); opacity: 0.2; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-25px) scale(1); opacity: 0; }
        }
        @keyframes cup-shake {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(${Math.min(3, level / 3)}deg); }
        }
      `}} />

      {/* Steam rising */}
      <div className="absolute top-2 w-full flex justify-center gap-1.5 z-10 pointer-events-none">
        {Array.from({ length: steamCount }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-6 rounded-full bg-white/20 blur-[1.5px]"
            style={{
              animation: `steam-rise ${1.5 + Math.random() * 1}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* The Cup SVG */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: level > 7 ? 'cup-shake 0.3s ease-in-out infinite' : 'none',
        }}
        className="relative z-20 drop-shadow-[0_4px_12px_rgba(46,90,68,0.12)]"
      >
        {/* Cup Handle */}
        <path
          d="M72 40 C84 40, 84 64, 72 64"
          stroke="#D4A574"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Glass Cup Body */}
        <path
          d="M20 28 L28 76 C29 82, 35 86, 42 86 H58 C65 86, 71 82, 72 76 L80 28 Z"
          fill="rgba(255, 255, 255, 0.45)"
          stroke="#E5E2DD"
          strokeWidth="3.5"
        />

        {/* Liquid level (Matcha) */}
        <path
          d="M23 48 L28 76 C29 80, 34 83, 40 83 H60 C66 83, 71 80, 72 76 L77 48 Z"
          fill={liquidColor}
          className="transition-colors duration-500 ease-out"
        />

        {/* Liquid Surface Curve */}
        <ellipse
          cx="50"
          cy="48"
          rx="27"
          ry="5.5"
          fill={liquidColor}
          className="transition-colors duration-500 ease-out"
        />

        {/* Glass Highlight */}
        <path
          d="M26 34 L32 70"
          stroke="rgba(255, 255, 255, 0.7)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Floating Bubbles */}
      <div className="absolute bottom-6 w-12 h-8 z-30 pointer-events-none">
        {Array.from({ length: bubbleCount }).map((_, i) => {
          const left = 20 + Math.random() * 60;
          const delay = Math.random() * 2;
          const duration = 1 + Math.random() * 1.5;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animation: `bubble-float ${duration}s ease-in infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
