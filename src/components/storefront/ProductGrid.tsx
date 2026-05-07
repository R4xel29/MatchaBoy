'use client';

import { useMemo } from 'react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  activeCategory: string;
  onProductClick: (product: Product) => void;
}

export function ProductGrid({
  products,
  activeCategory,
  onProductClick,
}: ProductGridProps) {
  const filtered = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-matcha-50 flex items-center justify-center mb-4">
          <span className="text-3xl">🍵</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Belum ada menu di kategori ini.
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
        />
      ))}
    </div>
  );
}
