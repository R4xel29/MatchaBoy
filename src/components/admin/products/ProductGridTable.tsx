'use client';

import React from 'react';
import {
  Edit2,
  Trash2,
  Copy,
  ChefHat,
  DollarSign,
  Package,
  Eye,
  Archive,
  ArchiveRestore,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Percent,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import type { ProductItem, IngredientItem, ModifiersData } from './types';

interface ProductGridTableProps {
  products: ProductItem[];
  ingredients: IngredientItem[];
  viewMode: 'table' | 'grid';
  selectedIds: string[];
  inspectedProductId?: string | null;
  onInspectProduct?: (product: ProductItem) => void;
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
  inspectedProductId,
  onInspectProduct,
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

    const activePromo = getActivePromo(product);
    const effectivePrice = activePromo ? activePromo.promoPrice : product.price;
    const profit = effectivePrice - hpp;
    const margin = effectivePrice > 0 ? (profit / effectivePrice) * 100 : 0;
    return {
      hasRecipe: true,
      totalHpp: Math.round(hpp),
      marginPercent: Math.round(margin),
    };
  };

  const getProductType = (product: ProductItem) => {
    if (!product.modifiers) return 'Minuman';
    try {
      const parsed: ModifiersData =
        typeof product.modifiers === 'string'
          ? JSON.parse(product.modifiers)
          : product.modifiers;
      if (parsed.isBundle) return 'Paket Combo';
      if (parsed.productType === 'makanan') return 'Makanan';
      return 'Minuman';
    } catch {
      return 'Minuman';
    }
  };

  const getIngredientsPreview = (product: ProductItem) => {
    if (product.productIngredients && product.productIngredients.length > 0) {
      const names = product.productIngredients
        .map((r) => r.ingredient?.name || ingredients.find((i) => i.id === r.ingredientId)?.name)
        .filter(Boolean);
      if (names.length > 0) {
        return `Bahan: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
      }
    }
    return product.description ? product.description : 'Resep belum terhubung';
  };

  const getVariantsPreview = (product: ProductItem): string[] => {
    if (!product.modifiers) return [];
    try {
      const parsed =
        typeof product.modifiers === 'string'
          ? JSON.parse(product.modifiers)
          : product.modifiers;
      if (parsed.sizes && Array.isArray(parsed.sizes) && parsed.sizes.length > 0) {
        return parsed.sizes.map((s: any) => s.name);
      }
    } catch {}
    return [];
  };

  if (products.length === 0) {
    return (
      <div className="py-16 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-xs">
        <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h4 className="font-bold text-sm text-slate-800">Tidak ada produk ditemukan</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Coba sesuaikan kata kunci pencarian atau bersihkan filter di atas untuk melihat menu lainnya.
        </p>
      </div>
    );
  }

  // ── TABLE VIEW (Matriks Tabel) ──
  if (viewMode === 'table') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded text-orange-500 w-4 h-4 cursor-pointer focus:ring-orange-400"
                  />
                </th>
                <th className="py-3.5 px-3 text-left">Menu Produk</th>
                <th className="py-3.5 px-3 text-left">Kategori & Tipe</th>
                <th className="py-3.5 px-3 text-left">Harga Jual</th>
                <th className="py-3.5 px-3 text-left">Estimasi HPP & Margin</th>
                <th className="py-3.5 px-3 text-left">Status & Ketersediaan</th>
                <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {products.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isInspected = inspectedProductId === p.id;
                const isArchived = p.badge === 'archived';
                const isSoldOut = p.badge === 'sold-out';
                const type = getProductType(p);
                const hppInfo = getProductHppInfo(p);
                const activePromo = getActivePromo(p);
                const currentPrice = activePromo ? activePromo.promoPrice : p.price;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isInspected
                        ? 'bg-orange-50/60'
                        : isSelected
                        ? 'bg-orange-50/30'
                        : 'hover:bg-slate-50/80'
                    } ${isArchived ? 'opacity-60 bg-slate-50/40' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(p.id)}
                        className="rounded text-orange-500 w-4 h-4 cursor-pointer focus:ring-orange-400"
                      />
                    </td>

                    {/* Product Name & Image */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => onInspectProduct?.(p)}
                          className="relative w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 cursor-pointer group"
                          title="Klik untuk inspeksi di panel samping"
                        >
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                                isSoldOut ? 'grayscale opacity-70' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 max-w-xs">
                          <button
                            type="button"
                            onClick={() => onInspectProduct?.(p)}
                            className="font-bold text-slate-900 hover:text-orange-600 truncate block text-left transition-colors"
                          >
                            {p.name}
                          </button>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            SKU: {p.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Type */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1 font-semibold">
                        {type}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      {activePromo ? (
                        <div>
                          <span className="text-[10px] text-slate-400 line-through block">
                            {formatRupiah(p.price)}
                          </span>
                          <span className="font-extrabold text-xs text-rose-600">
                            {formatRupiah(currentPrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-extrabold text-xs text-slate-900">
                          {formatRupiah(p.price)}
                        </span>
                      )}
                    </td>

                    {/* HPP & Margin */}
                    <td className="py-3 px-3">
                      {hppInfo.hasRecipe ? (
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
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
                          className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold flex items-center gap-1 border border-amber-200 transition-colors cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Resep Belum Ada
                        </button>
                      )}
                    </td>

                    {/* Live Availability Toggle Switch */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onToggleAvailability(p)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                            !isSoldOut && !isArchived ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={!isSoldOut ? 'Klik untuk set Habis' : 'Klik untuk set Tersedia'}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                              !isSoldOut && !isArchived ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[11px] font-bold ${
                            isArchived
                              ? 'text-slate-400'
                              : isSoldOut
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {isArchived ? 'Arsip' : isSoldOut ? 'Habis' : 'Tersedia'}
                        </span>
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Inspector */}
                        <button
                          type="button"
                          title="Inspeksi Cepat di Panel Samping"
                          onClick={() => onInspectProduct?.(p)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isInspected
                              ? 'bg-orange-500 text-white'
                              : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Quick Price */}
                        <button
                          type="button"
                          title="Ubah Harga / Promo Cepat"
                          onClick={() => onQuickPrice(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>

                        {/* Recipe Modal */}
                        <button
                          type="button"
                          title="Resep & HPP"
                          onClick={() => onOpenRecipe(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <ChefHat className="w-4 h-4" />
                        </button>

                        {/* 1-Click Duplicate */}
                        <button
                          type="button"
                          title="Duplikasi Produk (1-Klik)"
                          onClick={() => onDuplicate(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Full Edit */}
                        <button
                          type="button"
                          title="Edit Lengkap"
                          onClick={() => onEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Archive / Restore */}
                        <button
                          type="button"
                          title={isArchived ? 'Pulihkan Produk' : 'Arsipkan Produk'}
                          onClick={() => onToggleArchive(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

  // ── VISUAL BENTO CARD VIEW (Modern Bento Cards from Stitch) ──
  return (
    <div className="space-y-3.5 text-left">
      {products.map((p) => {
        const isSelected = selectedIds.includes(p.id);
        const isInspected = inspectedProductId === p.id;
        const isArchived = p.badge === 'archived';
        const isSoldOut = p.badge === 'sold-out';
        const type = getProductType(p);
        const hppInfo = getProductHppInfo(p);
        const activePromo = getActivePromo(p);
        const currentPrice = activePromo ? activePromo.promoPrice : p.price;
        const ingredientsText = getIngredientsPreview(p);
        const variants = getVariantsPreview(p);

        return (
          <div
            key={p.id}
            className={`group bg-white rounded-2xl border transition-all duration-200 p-4 relative overflow-hidden shadow-xs hover:shadow-elevated ${
              isInspected
                ? 'border-orange-500/90 ring-4 ring-orange-500/10 shadow-md'
                : isSelected
                ? 'border-orange-400 bg-orange-50/20'
                : 'border-slate-200/80 hover:border-slate-300'
            } ${isArchived ? 'opacity-65 bg-slate-50/50' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Details */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(p.id)}
                  className="w-4 h-4 mt-1 sm:mt-0 rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer shrink-0"
                />

                {/* Image */}
                <div
                  onClick={() => onInspectProduct?.(p)}
                  className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 cursor-pointer group/img"
                  title="Klik untuk pratinjau inspector"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className={`w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 ${
                        isSoldOut ? 'grayscale opacity-70' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-md text-[8px] sm:text-[9px] font-extrabold text-white uppercase tracking-wider">
                    {p.category.name}
                  </span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      onClick={() => onInspectProduct?.(p)}
                      className="font-bold text-slate-900 text-sm sm:text-base truncate hover:text-orange-600 cursor-pointer transition-colors"
                    >
                      {p.name}
                    </h3>

                    {/* Status Badges */}
                    {p.badge === 'best-seller' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Best Seller
                      </span>
                    )}
                    {p.badge === 'new' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        Baru
                      </span>
                    )}
                    {activePromo && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-rose-500" /> Flash Sale
                      </span>
                    )}
                    {isSoldOut && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Habis
                      </span>
                    )}
                  </div>

                  {/* SKU & Ingredients */}
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                    SKU: {p.id.slice(0, 8).toUpperCase()} • {ingredientsText}
                  </div>

                  {/* Pricing, Variants & Margin */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    {variants.length > 0 ? (
                      variants.map((v, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          {v}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {type}
                      </span>
                    )}

                    <span className="text-slate-300">•</span>

                    {/* Price */}
                    <div className="flex items-center gap-1.5">
                      {activePromo && (
                        <span className="text-[11px] text-slate-400 line-through">
                          {formatRupiah(p.price)}
                        </span>
                      )}
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatRupiah(currentPrice)}
                      </span>
                    </div>

                    {/* Margin */}
                    {hppInfo.hasRecipe ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          hppInfo.marginPercent >= 60
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : hppInfo.marginPercent >= 40
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        Margin {hppInfo.marginPercent}%
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenRecipe(p)}
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        Atur Resep
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Live Stock Switch & Quick Controls */}
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                {/* Instant Availability Toggle Switch */}
                <div className="flex flex-col items-start md:items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold ${
                        isSoldOut ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isSoldOut ? 'Habis' : 'Tersedia'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleAvailability(p)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        !isSoldOut && !isArchived ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={!isSoldOut ? 'Klik untuk set Habis' : 'Klik untuk set Tersedia'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                          !isSoldOut && !isArchived ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isSoldOut ? 'Katalog nonaktif' : 'Siap dipesan kasir'}
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onInspectProduct?.(p)}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isInspected
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    }`}
                    title="Lihat di Quick Inspector"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickPrice(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Ubah Harga / Promo"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenRecipe(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Resep & HPP"
                  >
                    <ChefHat className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Duplikasi Menu (1-Klik)"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Edit Lengkap"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Hapus / Arsipkan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
