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
}

const ICE_LEVELS: IceLevel[] = ['Normal Ice', 'Less Ice', 'No Ice'];
const SUGAR_LEVELS: SugarLevel[] = ['Normal Sugar', 'Less Sugar'];

export function ProductModal({ product, isOpen, onClose, editCartItemId, initialData }: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const editItem = useCartStore((s) => s.editItem);

  const [iceLevel, setIceLevel] = useState<IceLevel>('Normal Ice');
  const [sugarLevel, setSugarLevel] = useState<SugarLevel>('Normal Sugar');
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);

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
      } else {
        setIceLevel('Normal Ice');
        setSugarLevel('Normal Sugar');
        setSelectedAddOns([]);
        setQuantity(1);
      }
    }
  }, [isOpen, initialData]);

  // Reset state on explicit close (fallback)
  const resetState = () => {
    if (!initialData) {
      setIceLevel('Normal Ice');
      setSugarLevel('Normal Sugar');
      setSelectedAddOns([]);
      setQuantity(1);
    }
  };

  const addOnTotal = useMemo(
    () => selectedAddOns.reduce((sum, a) => sum + a.price, 0),
    [selectedAddOns]
  );

  const unitPrice = (product?.price ?? 0) + addOnTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addOn.id);
      return exists ? prev.filter((a) => a.id !== addOn.id) : [...prev, addOn];
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
      iceLevel,
      sugarLevel,
      addOns: selectedAddOns,
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
              <div className="relative w-full aspect-[16/10] bg-matcha-50 mx-auto shrink-0">
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
                <p className="mt-2 font-bold text-lg text-matcha-700">
                  {formatRupiah(product.price)}
                </p>
              </div>

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
                              ? 'bg-matcha-700 text-white border-matcha-700 shadow-sm'
                              : 'bg-card text-foreground border-border hover:border-matcha-400'
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
                              ? 'bg-matcha-700 text-white border-matcha-700 shadow-sm'
                              : 'bg-card text-foreground border-border hover:border-matcha-400'
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
                                ? 'border-matcha-600 bg-matcha-50'
                                : 'border-border bg-card hover:border-matcha-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center 
                                transition-colors border
                                ${
                                  isSelected
                                    ? 'bg-matcha-700 border-matcha-700'
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
                          <span className="text-sm text-matcha-600 font-medium">
                            +{formatRupiah(addOn.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                      hover:bg-matcha-50 transition-colors"
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
                      hover:bg-matcha-50 transition-colors"
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
                    gradient-matcha text-white 
                    font-semibold text-sm
                    shadow-lg shadow-matcha-700/20
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
