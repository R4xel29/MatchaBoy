'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpCategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  totalArticles: number;
}

export function HelpCategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  totalArticles,
}: HelpCategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
      <button
        type="button"
        onClick={() => onSelectCategory('ALL')}
        className={cn(
          'px-4 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
          selectedCategory === 'ALL'
            ? 'border-orange-500 bg-orange-50 text-orange-700 font-extrabold shadow-2xs'
            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        )}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Semua Kategori ({totalArticles})</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelectCategory(cat)}
          className={cn(
            'px-4 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap',
            selectedCategory === cat
              ? 'border-orange-500 bg-orange-50 text-orange-700 font-extrabold shadow-2xs'
              : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
