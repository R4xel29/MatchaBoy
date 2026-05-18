'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Check } from 'lucide-react';
import type { Product, IceLevel, SugarLevel, AddOn } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { ADD_ONS } from '@/lib/constants';

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
  const [quantity, setQuantity] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Bundle Selection State
  const [bundleSelections, setBundleSelections] = useState<{ [groupId: string]: any }>({});

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
        setQuantity(initialData.quantity || 1);
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
        setQuantity(1);

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
      setQuantity(1);
      setBundleSelections({});
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

  const unitPrice = product?.modifiers?.isBundle
    ? ((product.price ?? 0) + bundleAdjustmentsTotal)
    : ((product?.price ?? 0) + addOnTotal);
  
  const totalPrice = unitPrice * quantity;

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
    
    const itemData = {
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: product.price,
      quantity,
      iceLevel: product.modifiers?.isBundle ? 'Normal Ice' as const : iceLevel,
      sugarLevel: product.modifiers?.isBundle ? 'Normal Sugar' as const : sugarLevel,
      addOns: product.modifiers?.isBundle ? [] : selectedAddOns,
      isBundle: product.modifiers?.isBundle || false,
      bundleSelections: product.modifiers?.isBundle ? (bundleSelectionsArray as any[]) : undefined
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
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
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
            className={`fixed z-[61] bg-card shadow-2xl flex flex-col overflow-hidden
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
                {/* Title & Description */}
                <div>
                  <h2 className="font-heading font-bold text-xl text-foreground">
                    {product.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                  <p className="mt-2 font-bold text-lg text-brand-700">
                    {formatRupiah(product.price)}
                  </p>
                </div>

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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
