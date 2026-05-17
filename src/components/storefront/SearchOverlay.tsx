'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowLeft } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import type { Product, Category } from '@/types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  products: Product[];
  categories: Category[];
}

export function SearchOverlay({ isOpen, onClose, onProductSelect, products, categories }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length > 0
    ? products.filter(
        (p) => {
          const catName = categories.find(c => c.id === p.category)?.name.toLowerCase() || '';
          return (
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.description?.toLowerCase().includes(query.toLowerCase()) ||
            catName.includes(query.toLowerCase())
          );
        }
      )
    : [];

  const popular = products.filter((p) => p.badge === 'best-seller');

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] bg-background"
        >
          {/* Search Header */}
          <div className="sticky top-0 bg-background border-b border-border/50 pt-safe">
            <div className="flex items-center gap-2 px-3 py-2.5 max-w-2xl mx-auto">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full 
                  hover:bg-muted transition-colors touch-target shrink-0"
                aria-label="Close search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari matcha favorit..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border 
                    bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
                    transition-all"
                />
                {query.length > 0 && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 
                      w-5 h-5 rounded-full bg-muted-foreground/20 
                      flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="max-w-2xl mx-auto px-4 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 70px)' }}>
            {query.trim().length === 0 ? (
              /* Popular / Suggestions */
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  🔥 Populer
                </p>
                <div className="space-y-2">
                  {popular.map((product) => (
                    <SearchResultItem
                      key={product.id}
                      product={product}
                      onClick={() => {
                        onProductSelect(product);
                        onClose();
                      }}
                    />
                  ))}
                </div>

                {/* Quick suggestions */}
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
                  Coba cari
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Signature', 'Biscoff', 'Croissant', 'Hidden Menu', 'Less Sugar'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200
                        text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  {results.length} hasil untuk &ldquo;{query}&rdquo;
                </p>
                <div className="space-y-2">
                  {results.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <SearchResultItem
                        product={product}
                        onClick={() => {
                          onProductSelect(product);
                          onClose();
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Tidak ditemukan
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coba kata kunci lain untuk &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SearchResultItem({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const isSoldOut = product.badge === 'sold-out';

  return (
    <button
      onClick={isSoldOut ? undefined : onClick}
      disabled={isSoldOut}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl
        border border-border/50 bg-card
        text-left transition-all touch-target
        ${isSoldOut ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-300 hover:shadow-sm'}`}
    >
      {/* Color dot */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-200 to-brand-300 shrink-0 flex items-center justify-center">
        <span className="text-lg">🍵</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{product.description}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-brand-700">{formatRupiah(product.price)}</p>
        {product.badge && product.badge !== 'sold-out' && (
          <p className="text-[9px] font-bold text-brand-500 uppercase">{product.badge}</p>
        )}
        {isSoldOut && (
          <p className="text-[9px] font-bold text-red-400 uppercase">Habis</p>
        )}
      </div>
    </button>
  );
}
