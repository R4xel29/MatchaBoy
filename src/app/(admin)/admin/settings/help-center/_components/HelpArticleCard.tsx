'use client';

import React from 'react';
import { Edit, Trash2, ArrowUpDown, EyeOff, CheckCircle2 } from 'lucide-react';
import { HelpArticle } from './types';

interface HelpArticleCardProps {
  article: HelpArticle;
  onEdit: (article: HelpArticle) => void;
  onDelete: (id: string) => void;
}

export function HelpArticleCard({ article, onEdit, onDelete }: HelpArticleCardProps) {
  return (
    <div className="p-4 sm:p-5 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap bg-white hover:bg-slate-50/70 transition-colors">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-sm text-slate-900 truncate block">
            {article.title}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[9px] font-black uppercase tracking-wider">
            {article.category || 'Umum'}
          </span>
          {!article.isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
              <EyeOff className="w-3 h-3 text-amber-600" />
              <span>Draf / Nonaktif</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Aktif</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {article.content}
        </p>

        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
          <span className="font-semibold flex items-center gap-1 text-orange-700">
            <ArrowUpDown className="w-3 h-3 text-orange-500" />
            Urutan: {article.order}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
        <button
          type="button"
          onClick={() => onEdit(article)}
          className="p-2 hover:bg-orange-50 text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-200 rounded-xl transition-colors cursor-pointer"
          title="Edit Artikel"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(article.id)}
          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
          title="Hapus Artikel"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
