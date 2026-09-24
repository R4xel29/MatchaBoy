'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Flame, Sparkles, CupSoda, Coffee, UtensilsCrossed, Bell } from 'lucide-react';
import type { Product } from '@/types';
import { formatRupiah, cn, getEffectiveProductDisplay } from '@/lib/utils';
import { isFoodItem } from '@/lib/receipt-modifiers';
import { PromoCountdown } from './PromoCountdown';

interface ProductCardProps {
  product: Product;
  onAddClick: (product: Product) => void;
  index: number;
  packagingStock?: { cupRegular: number; cupJumbo: number };
}

const badgeStyles: Record<string, { bg: string; text: string; label: string }> = {
  'new': { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'text-white', label: 'Baru' },
  'best-seller': { bg: 'bg-amber-900/90 backdrop-blur-sm', text: 'text-amber-100', label: 'Best Seller' },
  'sold-out': { bg: 'bg-stone-500', text: 'text-white', label: 'Habis' },
};

export function ProductCard({ product, onAddClick, index, packagingStock }: ProductCardProps) {
  const {
    displayPrice,
    originalPrice,
    promo,
    isRegularOut,
    sizeNotice,
    isSoldOut,
  } = getEffectiveProductDisplay(product, packagingStock);

  const isFood = useMemo(() => {
    const catLower = (product.category || '').toLowerCase();
    return (
      isFoodItem(product.name) ||
      (product.modifiers as any)?.productType === 'makanan' ||
      catLower.includes('makan') ||
      catLower.includes('food') ||
      catLower.includes('snack') ||
      catLower.includes('roti') ||
      catLower.includes('pastry') ||
      catLower.includes('cemilan')
    );
  }, [product]);

  const badge = product.badge ? badgeStyles[product.badge] : null;
  const discountAmount = originalPrice && originalPrice > displayPrice ? originalPrice - displayPrice : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onClick={() => {
        onAddClick(product);
      }}
      className={cn(
        'group relative flex flex-col bg-white rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(148,111,72,0.05)]',
        'border border-amber-100/80 hover:border-orange-400/70 hover:shadow-[0_12px_28px_rgba(234,88,12,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer'
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-amber-50/60">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-transform duration-500 ease-out group-hover:scale-105',
              isSoldOut && 'grayscale opacity-60'
            )}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-amber-300">
            {isFood ? <UtensilsCrossed className="w-10 h-10" /> : <Coffee className="w-10 h-10" />}
          </div>
        )}

        {/* Promo Timer Overlay */}
        {promo && !isSoldOut && (
          <div className="absolute top-2.5 right-2.5 z-20">
            <PromoCountdown endDate={promo.endDate} compact />
          </div>
        )}

        {/* Size Notice Badge if Regular is Out (Drinks only) */}
        {isRegularOut && !isFood && !isSoldOut && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase bg-amber-500 text-white shadow-md flex items-center gap-1"
          >
            <CupSoda className="w-2.5 h-2.5" />
            <span>{sizeNotice}</span>
          </motion.span>
        )}

        {/* Top-Left Badge */}
        {badge && !promo && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase shadow-sm flex items-center gap-1',
              badge.bg,
              badge.text
            )}
          >
            {product.badge === 'new' && <Sparkles className="w-2.5 h-2.5" />}
            {product.badge === 'best-seller' && <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
            <span>{badge.label}</span>
          </motion.span>
        )}

        {/* Promo Badge if has active promo */}
        {promo && !isSoldOut && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase bg-rose-600 text-white shadow-md flex items-center gap-1"
          >
            <Flame className="w-2.5 h-2.5 fill-white" />
            <span>Hemat {formatRupiah(discountAmount)}</span>
          </motion.span>
        )}

        {/* Food vs Beverage Category Pill at Bottom-Left of Image */}
        <span
          className={cn(
            'absolute bottom-2 left-2.5 z-10 px-2 py-0.5 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-xs flex items-center gap-1 border',
            isFood
              ? 'bg-amber-950/75 text-amber-100 border-amber-400/30'
              : 'bg-white/90 text-orange-800 border-amber-200/60'
          )}
        >
          {isFood ? (
            <>
              <UtensilsCrossed className="w-2.5 h-2.5 text-amber-300" />
              <span>Makanan</span>
            </>
          ) : (
            <>
              <Coffee className="w-2.5 h-2.5 text-orange-600" />
              <span>Minuman</span>
            </>
          )}
        </span>

        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] z-20">
            <span className="px-4 py-1.5 bg-black/75 text-white text-xs font-extrabold rounded-full tracking-wider uppercase">
              Habis
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-3.5 pt-3 text-left">
        <h3 className="font-serif font-bold text-xs sm:text-sm leading-snug text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="mt-1 text-[11px] text-stone-500 line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        {/* Transparent Discount Breakdown (Rule 8) */}
        {discountAmount > 0 && originalPrice && (
          <div className="mt-2 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-700 leading-tight">
            {formatRupiah(originalPrice)} - {formatRupiah(discountAmount)} = {formatRupiah(displayPrice)}
          </div>
        )}

        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-amber-100/70">
          <div className="flex flex-col text-left">
            {originalPrice && originalPrice > displayPrice && (
              <span className="text-[10px] text-stone-400 line-through leading-none mb-0.5">
                {formatRupiah(originalPrice)}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="font-sans font-extrabold text-xs sm:text-sm text-orange-600">
                {formatRupiah(displayPrice)}
              </span>
              {isRegularOut && !isFood && (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                  Jumbo
                </span>
              )}
            </div>
          </div>

          {isSoldOut ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick(product);
              }}
              className="text-[10px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/70 transition-colors px-2.5 py-1.5 rounded-xl flex items-center gap-1"
            >
              <Bell className="w-3 h-3" />
              <span>Ingatkan</span>
            </button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onAddClick(product);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-2xl transition-all shadow-sm touch-target bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-md hover:shadow-orange-500/20 active:scale-95"
              aria-label={`Tambah ${product.name} ke keranjang`}
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
