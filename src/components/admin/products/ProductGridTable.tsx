'use client';

import { useState } from 'react';
import {
  Edit2,
  Trash2,
  Copy,
  ChefHat,
  DollarSign,
  Package,
  Power,
  PowerOff,
  Archive,
  ArchiveRestore,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Percent,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import type { ProductItem, IngredientItem, ModifiersData } from './types';

interface ProductGridTableProps {
  products: ProductItem[];
  ingredients: IngredientItem[];
  viewMode: 'table' | 'grid';
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (product: ProductItem) => void;
  onQuickPrice: (product: ProductItem) => void;
  onDuplicate: (product: ProductItem) => void;
  onOpenRecipe: (product: ProductItem) => void;
  onToggleAvailability: (product: ProductItem) => void;
  onToggleArchive: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
}

export function ProductGridTable({
  products,
  ingredients,
  viewMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onQuickPrice,
  onDuplicate,
  onOpenRecipe,
  onToggleAvailability,
  onToggleArchive,
  onDelete,
}: ProductGridTableProps) {
  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.includes(p.id));

  // Helper to get HPP & Margin
  const getProductHppInfo = (product: ProductItem) => {
    const recipes = product.productIngredients || [];
    if (recipes.length === 0) {
      return { hasRecipe: false, totalHpp: 0, marginPercent: 0 };
    }
    let hpp = 0;
    recipes.forEach((r) => {
      const ing = r.ingredient || ingredients.find((i) => i.id === r.ingredientId);
      if (ing) {
        hpp += r.quantity * ing.costPerUnit;
      }
    });

    const profit = product.price - hpp;
    const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
    return {
      hasRecipe: true,
      totalHpp: Math.round(hpp),
      marginPercent: Math.round(margin),
    };
  };

  const getProductType = (product: ProductItem) => {
    if (!product.modifiers) return 'Minuman';
    try {
      const parsed: ModifiersData = JSON.parse(product.modifiers);
      if (parsed.isBundle) return 'Paket Combo';
      if (parsed.productType === 'makanan') return 'Makanan';
      return 'Minuman';
    } catch {
      return 'Minuman';
    }
  };

  if (products.length === 0) {
    return (
      <div className="py-16 text-center rounded-3xl border-2 border-dashed border-stone-200 bg-white shadow-sm">
        <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <h4 className="font-heading font-bold text-sm text-stone-700">Tidak ada produk ditemukan</h4>
        <p className="text-xs text-stone-400 mt-1">
          Coba sesuaikan kata kunci pencarian atau filter kategori di atas.
        </p>
      </div>
    );
  }

  // ── TABLE VIEW ──
  if (viewMode === 'table') {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded text-orange-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-3 text-left">Menu Produk</th>
                <th className="py-4 px-3 text-left">Kategori & Tipe</th>
                <th className="py-4 px-3 text-left">Harga Jual</th>
                <th className="py-4 px-3 text-left">Estimasi HPP & Margin</th>
                <th className="py-4 px-3 text-left">Status Stok</th>
                <th className="py-4 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {products.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isArchived = p.badge === 'archived';
                const isSoldOut = p.badge === 'sold-out';
                const type = getProductType(p);
                const hppInfo = getProductHppInfo(p);

                let mods: ModifiersData = {};
                try {
                  if (p.modifiers) mods = JSON.parse(p.modifiers);
                } catch {}

                const hasActivePromo = mods.promo?.isActive && mods.promo?.promoPrice;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-stone-50/80 transition-colors ${
                      isSelected ? 'bg-orange-50/40' : ''
                    } ${isArchived ? 'opacity-60 bg-stone-50/40' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(p.id)}
                        className="rounded text-orange-500 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Product Info */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 aspect-square">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className={`w-full h-full object-cover ${
                                isSoldOut ? 'grayscale opacity-70' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          {hasActivePromo && (
                            <span className="absolute bottom-0 inset-x-0 bg-rose-600 text-white text-[8px] font-black text-center py-0.5">
                              PROMO
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[200px] sm:max-w-[240px]">
                          <p className="font-bold text-stone-900 text-xs truncate hover:text-orange-600 transition-colors">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                            {p.description || 'Tidak ada deskripsi'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category & Type */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-bold text-[10px]">
                        {p.category.name}
                      </span>
                      <span className="block text-[10px] text-stone-400 mt-1 font-semibold">
                        {type}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      {hasActivePromo ? (
                        <div>
                          <span className="text-[10px] text-stone-400 line-through block">
                            {formatRupiah(p.price)}
                          </span>
                          <span className="font-bold text-xs text-rose-600">
                            {formatRupiah(mods.promo!.promoPrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-xs text-stone-900">
                          {formatRupiah(p.price)}
                        </span>
                      )}
                    </td>

                    {/* HPP & Margin */}
                    <td className="py-3 px-3">
                      {hppInfo.hasRecipe ? (
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-700">
                            <Coins className="w-3 h-3 text-amber-500" />
                            HPP: {formatRupiah(hppInfo.totalHpp)}
                          </div>
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-black mt-1 ${
                              hppInfo.marginPercent >= 60
                                ? 'bg-emerald-100 text-emerald-800'
                                : hppInfo.marginPercent >= 40
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <Percent className="w-2.5 h-2.5" /> Margin {hppInfo.marginPercent}%
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenRecipe(p)}
                          className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold flex items-center gap-1 border border-amber-200 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Belum Ada Resep
                        </button>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {isArchived ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                          Diarsipkan
                        </span>
                      ) : isSoldOut ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Habis (Sold Out)
                        </span>
                      ) : p.badge === 'best-seller' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          ⭐ Best Seller
                        </span>
                      ) : p.badge === 'new' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                          ✨ Baru
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tersedia
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Price */}
                        <button
                          type="button"
                          title="Ubah Harga / Promo Cepat"
                          onClick={() => onQuickPrice(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>

                        {/* Recipe Modal */}
                        <button
                          type="button"
                          title="Resep & HPP"
                          onClick={() => onOpenRecipe(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <ChefHat className="w-4 h-4" />
                        </button>

                        {/* 1-Click Duplicate */}
                        <button
                          type="button"
                          title="Duplikasi Produk (1-Klik)"
                          onClick={() => onDuplicate(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Full Edit */}
                        <button
                          type="button"
                          title="Edit Lengkap"
                          onClick={() => onEdit(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Archive / Restore */}
                        <button
                          type="button"
                          title={isArchived ? 'Pulihkan Produk' : 'Arsipkan Produk'}
                          onClick={() => onToggleArchive(p)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          {isArchived ? (
                            <ArchiveRestore className="w-4 h-4" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          title="Hapus Produk"
                          onClick={() => onDelete(p)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── GRID CARD VIEW ──
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
      {products.map((p) => {
        const isSelected = selectedIds.includes(p.id);
        const isArchived = p.badge === 'archived';
        const isSoldOut = p.badge === 'sold-out';
        const type = getProductType(p);
        const hppInfo = getProductHppInfo(p);

        let mods: ModifiersData = {};
        try {
          if (p.modifiers) mods = JSON.parse(p.modifiers);
        } catch {}

        const hasActivePromo = mods.promo?.isActive && mods.promo?.promoPrice;

        return (
          <div
            key={p.id}
            className={`bg-white rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
              isSelected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-stone-200'
            } ${isArchived ? 'opacity-60 bg-stone-50/40' : ''}`}
          >
            <div>
              {/* Card Image Header (aspect-square 1:1) */}
              <div className="relative w-full aspect-square bg-stone-100 overflow-hidden">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className={`w-full h-full object-cover ${
                      isSoldOut ? 'grayscale opacity-70' : ''
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Package className="w-12 h-12" />
                  </div>
                )}

                {/* Checkbox overlay */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(p.id)}
                    className="rounded text-orange-500 w-5 h-5 cursor-pointer bg-white/90 shadow-sm"
                  />
                </div>

                {/* Badges Overlay */}
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end z-10">
                  {hasActivePromo && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-600 text-white shadow-sm flex items-center gap-0.5">
                      <Flame className="w-3 h-3" /> Promo
                    </span>
                  )}
                  {p.badge === 'best-seller' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500 text-white shadow-sm">
                      Best Seller
                    </span>
                  )}
                  {p.badge === 'new' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-500 text-white shadow-sm">
                      Baru
                    </span>
                  )}
                  {isSoldOut && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-stone-600 text-white shadow-sm">
                      Habis
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-bold text-[10px]">
                    {p.category.name}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">{type}</span>
                </div>

                <h4 className="font-bold text-sm text-stone-900 line-clamp-1">{p.name}</h4>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  {p.description || 'Tidak ada deskripsi'}
                </p>

                {/* Pricing */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    {hasActivePromo && (
                      <span className="text-[10px] text-stone-400 line-through block">
                        {formatRupiah(p.price)}
                      </span>
                    )}
                    <span className="font-extrabold text-sm text-orange-600">
                      {formatRupiah(hasActivePromo ? mods.promo!.promoPrice : p.price)}
                    </span>
                  </div>

                  {hppInfo.hasRecipe ? (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        hppInfo.marginPercent >= 60
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Margin {hppInfo.marginPercent}%
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenRecipe(p)}
                      className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                    >
                      No Resep
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="p-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onQuickPrice(p)}
                className="text-xs font-bold text-stone-600 hover:text-orange-600 flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5" /> Edit Harga
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Duplikasi Menu"
                  onClick={() => onDuplicate(p)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Resep & HPP"
                  onClick={() => onOpenRecipe(p)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-white transition-colors"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Edit Lengkap"
                  onClick={() => onEdit(p)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-white transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Hapus"
                  onClick={() => onDelete(p)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
