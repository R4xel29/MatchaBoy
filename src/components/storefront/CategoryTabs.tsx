'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(
      `[data-category-id="${activeCategory}"]`
    );
    if (activeBtn) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const scrollLeft =
        activeBtn.offsetLeft -
        containerRect.width / 2 +
        btnRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div
      id="category-tabs"
      className="sticky top-[60px] z-40 bg-[#FFFBF5]/95 backdrop-blur-md border-b border-amber-100 pt-safe"
    >
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto scrollbar-hide max-w-6xl mx-auto w-full"
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              data-category-id={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'relative shrink-0 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors touch-target whitespace-nowrap cursor-pointer',
                isActive
                  ? 'text-white'
                  : 'text-stone-600 bg-white border border-amber-100 hover:text-orange-600 hover:border-orange-300'
              )}
            >
              {/* Animated pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-md shadow-orange-500/20"
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}
              <span className="relative z-10">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
