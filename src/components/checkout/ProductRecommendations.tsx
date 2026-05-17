'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductRecommendationsProps {
  onSelectProduct: (product: Product) => void;
}

export function ProductRecommendations({ onSelectProduct }: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products/random')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setRecommendations(data.products);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="py-2">
      <h3 className="font-heading font-bold text-sm mb-3">Mungkin kamu suka ini...</h3>
      <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
        {recommendations.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="snap-start shrink-0 w-36 bg-card rounded-2xl border border-border overflow-hidden text-left hover:border-brand-400 transition-colors group"
          >
            <div className="w-full aspect-[4/3] relative bg-brand-50">
              <Image
                src={product.image || '/placeholder-matcha.jpg'}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="150px"
              />
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-xs text-foreground line-clamp-2 min-h-[32px]">
                {product.name}
              </h4>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-brand-700 text-xs">
                  {formatRupiah(product.price)}
                </span>
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
