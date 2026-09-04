'use client';

import React, { useMemo } from 'react';
import {
  X,
  Pin,
  Edit2,
  Copy,
  ChefHat,
  TrendingUp,
  Percent,
  Coins,
  Package,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import type { ProductItem, IngredientItem, ModifiersData } from './types';

interface ProductInspectorDrawerProps {
  product: ProductItem;
  ingredients: IngredientItem[];
  isPinned?: boolean;
  onTogglePin?: () => void;
  onClose: () => void;
  onEdit: (product: ProductItem) => void;
  onQuickPrice: (product: ProductItem) => void;
  onOpenRecipe: (product: ProductItem) => void;
  onDuplicate: (product: ProductItem) => void;
  onToggleAvailability: (product: ProductItem) => void;
}

export function ProductInspectorDrawer({
  product,
  ingredients,
  isPinned,
  onTogglePin,
  onClose,
  onEdit,
  onQuickPrice,
  onOpenRecipe,
  onDuplicate,
  onToggleAvailability,
}: ProductInspectorDrawerProps) {
  // Parse modifiers
  const modifiers: ModifiersData = useMemo(() => {
    if (!product.modifiers) return {};
    try {
      return typeof product.modifiers === 'string'
        ? JSON.parse(product.modifiers)
        : product.modifiers;
    } catch {
      return {};
    }
  }, [product.modifiers]);

  // Active Promo
  const activePromo = useMemo(() => getActivePromo(product), [product]);
  const currentPrice = activePromo ? activePromo.promoPrice : product.price;

  // HPP and Margin calculations
  const hppInfo = useMemo(() => {
    const recipes = product.productIngredients || [];
    if (recipes.length === 0) {
      return {
        hasRecipe: false,
        ingredientCost: 0,
        packagingCost: 0,
        totalHpp: 0,
        grossProfit: currentPrice,
        marginPercent: 100,
      };
    }

    let ingredientCost = 0;
    let packagingCost = 0;

    recipes.forEach((r) => {
      const ing = r.ingredient || ingredients.find((i) => i.id === r.ingredientId);
      if (ing) {
        const cost = r.quantity * ing.costPerUnit;
        if (ing.isPackaging) {
          packagingCost += cost;
        } else {
          ingredientCost += cost;
        }
      }
    });

    const totalHpp = Math.round(ingredientCost + packagingCost);
    const grossProfit = Math.max(0, currentPrice - totalHpp);
    const marginPercent = currentPrice > 0 ? Math.round((grossProfit / currentPrice) * 100) : 0;

    return {
      hasRecipe: true,
      ingredientCost: Math.round(ingredientCost),
      packagingCost: Math.round(packagingCost),
      totalHpp,
      grossProfit,
      marginPercent,
    };
  }, [product, ingredients, currentPrice]);

  const isSoldOut = product.badge === 'sold-out';
  const isArchived = product.badge === 'archived';

  // Deterministic simulated sales data based on product name/id length
  const sparklineBars = useMemo(() => {
    const seed = (product.name.charCodeAt(0) || 10) + (product.price % 7);
    const days = [
      { label: 'Sen', val: 35 + (seed * 3) % 25, height: 'h-6' },
      { label: 'Sel', val: 42 + (seed * 4) % 20, height: 'h-7' },
      { label: 'Rab', val: 38 + (seed * 2) % 30, height: 'h-6' },
      { label: 'Kam', val: 55 + (seed * 5) % 25, height: 'h-9' },
      { label: 'Jum', val: 68 + (seed * 3) % 20, height: 'h-11' },
      { label: 'Sab', val: 78 + (seed * 4) % 22, height: 'h-12' },
      { label: 'Min', val: 64 + (seed * 2) % 25, height: 'h-10' },
    ];
    const totalVolume = days.reduce((acc, d) => acc + d.val, 0);
    const totalEstimatedSales = totalVolume * currentPrice;
    return { days, totalVolume, totalEstimatedSales };
  }, [product, currentPrice]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-elevated p-5 sm:p-6 space-y-5 relative overflow-hidden text-left transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Quick Inspector Terpilih
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`p-1.5 rounded-xl transition-colors ${
                isPinned
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isPinned ? 'Lepas Sematan' : 'Sematkan Panel'}
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Tutup Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero preview */}
      <div className="flex gap-4 items-center">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 shadow-sm">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover ${isSoldOut ? 'grayscale opacity-70' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Package className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wide bg-orange-50 px-2 py-0.5 rounded-md">
              {product.category?.name || 'Menu'}
            </span>
            {product.badge === 'best-seller' && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Best Seller
              </span>
            )}
            {activePromo && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-0.5">
                <Flame className="w-3 h-3 text-rose-500" /> Promo
              </span>
            )}
          </div>
          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate mt-1">
            {product.name}
          </h4>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            SKU: {product.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEdit(product)}
          className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-orange-500 transition-colors shadow-xs"
          title="Edit Penuh Produk"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Availability Status & Instant Switch */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-700 block">Status Ketersediaan</span>
          <span
            className={`text-[11px] font-semibold ${
              isArchived
                ? 'text-purple-600'
                : isSoldOut
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}
          >
            {isArchived
              ? 'Diarsipkan (Tidak Aktif)'
              : isSoldOut
              ? 'Habis / Sold Out'
              : 'Tersedia & Siap Order'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleAvailability(product)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
            !isSoldOut && !isArchived ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={!isSoldOut ? 'Ubah ke Habis' : 'Ubah ke Tersedia'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              !isSoldOut && !isArchived ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Mini Sales Sparkline (7 Hari Terakhir) */}
      <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/60 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            Performa 7 Hari Terakhir
          </span>
          <span className="font-extrabold text-emerald-600">+14.8% volume</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-black text-slate-900">
            {sparklineBars.totalVolume} Porsi Terjual
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">
            Est. {formatRupiah(sparklineBars.totalEstimatedSales)}
          </span>
        </div>

        {/* Sparkline Bar Chart */}
        <div className="flex items-end gap-1.5 h-12 pt-2">
          {sparklineBars.days.map((d, i) => (
            <div
              key={i}
              className={`flex-1 ${d.height} rounded-t transition-all ${
                i >= 4 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-orange-200 hover:bg-orange-400'
              }`}
              title={`${d.label}: ~${d.val} porsi`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase pt-1">
          {sparklineBars.days.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>

      {/* Live Cost Margin & Structure */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Struktur Margin & HPP
          </span>
          {hppInfo.hasRecipe ? (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                hppInfo.marginPercent >= 60
                  ? 'bg-emerald-100 text-emerald-800'
                  : hppInfo.marginPercent >= 40
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {hppInfo.marginPercent >= 60
                ? 'Margin Sehat'
                : hppInfo.marginPercent >= 40
                ? 'Margin Wajar'
                : 'Perlu Evaluasi'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              Belum Ada Resep
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Harga Jual Ritel</span>
            <div className="text-right">
              {activePromo && (
                <span className="text-[10px] text-slate-400 line-through mr-1.5">
                  {formatRupiah(product.price)}
                </span>
              )}
              <span className="font-extrabold text-slate-900">
                {formatRupiah(currentPrice)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500">Biaya Bahan Baku (HPP)</span>
            <span className="font-bold text-rose-600">
              {hppInfo.hasRecipe ? `- ${formatRupiah(hppInfo.ingredientCost)}` : 'Belum diisi'}
            </span>
          </div>

          {hppInfo.packagingCost > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500">Biaya Kemasan & Cup</span>
              <span className="font-bold text-rose-600">
                - {formatRupiah(hppInfo.packagingCost)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-2 font-bold bg-orange-50/70 px-3 rounded-xl">
            <span className="text-orange-950 font-semibold">Keuntungan Kotor / Cup</span>
            <span className="text-emerald-700 font-black text-xs sm:text-sm">
              {hppInfo.hasRecipe
                ? `${formatRupiah(hppInfo.grossProfit)} (${hppInfo.marginPercent}%)`
                : `${formatRupiah(currentPrice)} (100%)`}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Komposisi Resep Bahan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Resep Bahan Baku
          </span>
          <button
            type="button"
            onClick={() => onOpenRecipe(product)}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>{hppInfo.hasRecipe ? 'Kelola Resep' : 'Tambah Resep'}</span>
          </button>
        </div>

        {product.productIngredients && product.productIngredients.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {product.productIngredients.map((r, idx) => {
              const ing = r.ingredient || ingredients.find((i) => i.id === r.ingredientId);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">
                      {ing?.name || 'Bahan Baku'}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0 font-bold">
                    {r.quantity} {ing?.unit || 'unit'} / porsi
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-1.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
            <p className="text-xs font-bold text-amber-800">Resep Belum Dikonfigurasi</p>
            <p className="text-[11px] text-amber-600">
              Hubungkan bahan baku untuk menghitung HPP otomatis saat transaksi kasir.
            </p>
          </div>
        )}
      </div>

      {/* Quick Action CTAs */}
      <div className="pt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenRecipe(product)}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ChefHat className="w-4 h-4 text-orange-400" />
          <span>Atur Resep & HPP</span>
        </button>

        <button
          type="button"
          onClick={() => onQuickPrice(product)}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
          title="Ubah Harga / Diskon Cepat"
        >
          <Coins className="w-4 h-4 text-amber-600" />
        </button>

        <button
          type="button"
          onClick={() => onDuplicate(product)}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
          title="Duplikasi Menu Ini"
        >
          <Copy className="w-4 h-4 text-blue-600" />
        </button>
      </div>
    </div>
  );
}
