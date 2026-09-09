'use client';

import { Search } from 'lucide-react';
import { CATEGORIES } from './types';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function ExpenseFilters({
  search,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
}: Props) {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengeluaran atau catatan..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Semua Kategori
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => onSelectCategory(c.value)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === c.value
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
