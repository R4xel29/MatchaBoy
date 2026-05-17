'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '@/types';
import { formatRupiah, cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddClick: (product: Product) => void;
  index: number;
}

const badgeStyles: Record<string, { bg: string; text: string; label: string }> = {
  'new': { bg: 'bg-brand-500', text: 'text-brand-900', label: 'New' },
  'best-seller': { bg: 'bg-gold', text: 'text-white', label: 'Best Seller' },
  'sold-out': { bg: 'bg-gray-400', text: 'text-white', label: 'Sold Out' },
};

export function ProductCard({ product, onAddClick, index }: ProductCardProps) {
  const isSoldOut = product.badge === 'sold-out';
  const badge = product.badge ? badgeStyles[product.badge] : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onClick={() => {
        if (!isSoldOut) onAddClick(product);
      }}
      className={cn(
        "group relative flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm",
        "border border-border/50 hover:shadow-md transition-shadow duration-300 cursor-pointer"
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            "object-cover transition-transform duration-500 ease-out group-hover:scale-105",
            isSoldOut && "grayscale opacity-60"
          )}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />


        {/* Badge */}
        {badge && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.06 }}
            className={cn(
              "absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm",
              badge.bg,
              badge.text
            )}
          >
            {badge.label}
          </motion.span>
        )}

        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="px-4 py-1.5 bg-black/60 text-white text-xs font-bold rounded-full tracking-wider uppercase">
              Habis
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-3 pt-2.5">
        <h3 className="font-heading font-bold text-sm leading-snug text-foreground line-clamp-1">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
          <span className="font-body font-bold text-sm text-brand-700">
            {formatRupiah(product.price)}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isSoldOut) onAddClick(product);
            }}
            disabled={isSoldOut}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-colors shadow-sm touch-target",
              isSoldOut
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800"
            )}
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
