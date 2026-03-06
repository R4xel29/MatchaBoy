'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
      className="sticky top-[60px] z-40 bg-cream/95 backdrop-blur-sm border-b border-matcha-100/50 pt-safe"
    >
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide max-w-2xl mx-auto"
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              data-category-id={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`relative shrink-0 px-5 py-2 rounded-full text-sm font-medium 
                transition-colors touch-target whitespace-nowrap
                ${
                  isActive
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-matcha-50'
                }`}
            >
              {/* Animated pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-matcha-700 rounded-full shadow-sm"
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
