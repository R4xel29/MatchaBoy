'use client';

import { Flame } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { TopProduct } from './types';

interface Props {
  topProducts: TopProduct[];
}

export function TopProductsRankTable({ topProducts }: Props) {
  return (
    <div className="lg:col-span-6 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" /> 5 Menu Terlaris (Best Seller)
        </h3>
        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-150">
          Paling Populer
        </span>
      </div>

      <div className="space-y-2.5">
        {topProducts.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8 font-medium">Belum ada data penjualan produk</p>
        ) : (
          topProducts.map((prod, index) => (
            <div key={prod.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-orange-50/50 hover:border-orange-200/80 transition-all duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
                  index === 0 
                    ? 'bg-amber-500 text-white' 
                    : index === 1 
                    ? 'bg-slate-300 text-slate-800' 
                    : index === 2 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{prod.categoryName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-extrabold text-orange-600">{prod.qty} Cups</p>
                <p className="text-[10px] text-slate-500 font-medium">{formatRupiah(prod.revenue)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
