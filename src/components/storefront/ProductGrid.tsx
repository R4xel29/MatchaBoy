'use client';

import { useMemo } from 'react';
import { Coffee } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  activeCategory: string;
  onProductClick: (product: Product) => void;
  packagingStock?: { cupRegular: number; cupJumbo: number };
}

export function ProductGrid({
  products,
  activeCategory,
  onProductClick,
  packagingStock,
}: ProductGridProps) {
  const filtered = useMemo(() => {
    if (activeCategory === 'bundle') {
      return products.filter((p) => p.modifiers?.isBundle === true);
    }
    if (activeCategory === 'all') {
      return products.filter((p) => p.modifiers?.isBundle !== true);
    }
    return products.filter((p) => p.category === activeCategory && p.modifiers?.isBundle !== true);
  }, [products, activeCategory]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/80 rounded-3xl border border-amber-100">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center mb-4 text-orange-600 shadow-inner">
          <Coffee className="w-7 h-7" />
        </div>
        <p className="text-foreground font-bold text-sm">
          Belum ada menu di kategori ini
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Silakan pilih kategori makanan atau minuman lainnya.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
      {filtered.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddClick={onProductClick}
          index={i}
          packagingStock={packagingStock}
        />
      ))}
    </div>
  );
}
