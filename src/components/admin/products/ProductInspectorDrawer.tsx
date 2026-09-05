'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  X,
  Pin,
  Edit2,
  Copy,
  ChefHat,
  TrendingUp,
  Coins,
  Package,
  AlertTriangle,
  Flame,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { formatRupiah, getActivePromo } from '@/lib/utils';
import type {
  ProductItem,
  IngredientItem,
  ModifiersData,
  ProductRealtimeStats,
} from './types';

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

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  } catch {
    return 'Baru saja';
  }
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
  // Realtime Stats State
  const [stats, setStats] = useState<ProductRealtimeStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');

  // Fetch realtime statistics from backend
  const fetchStats = useCallback(
    async (showRefreshing = false) => {
      if (!product?.id) return;
      if (showRefreshing) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/admin/products/${product.id}/stats`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data: ProductRealtimeStats = await res.json();
          setStats(data);
          const d = new Date(data.updatedAt);
          setLastFetchTime(
            d.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      } catch (err) {
        console.error('Error fetching realtime stats for inspector:', err);
      } finally {
        setLoadingStats(false);
        setIsRefreshing(false);
      }
    },
    [product?.id]
  );

  // Fetch on product change
  useEffect(() => {
    setLoadingStats(true);
    fetchStats(false);
  }, [fetchStats]);

  // Periodic polling for realtime updates (every 15s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

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

  // Realtime 7-day sparkline bar scaling
  const maxDayQty = useMemo(() => {
    if (!stats?.last7Days?.days) return 1;
    return Math.max(...stats.last7Days.days.map((d) => d.qty), 1);
  }, [stats]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-elevated p-5 sm:p-6 space-y-5 relative overflow-hidden text-left transition-all">
      {/* Header with Live Realtime Status */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Quick Inspector
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-orange-100 text-orange-800 tracking-wider">
              REALTIME
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50 cursor-pointer"
            title={lastFetchTime ? `Diperbarui: ${lastFetchTime}. Klik untuk segarkan` : 'Segarkan Data'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
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
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
          className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-orange-500 transition-colors shadow-xs cursor-pointer"
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
          onClick={async () => {
            await onToggleAvailability(product);
            setTimeout(() => fetchStats(false), 500);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer ${
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

      {/* Realtime Sales & Performance (7 Hari Terakhir & Hari Ini) */}
      <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/60 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            Penjualan 7 Hari Terakhir
          </span>

          {loadingStats && !stats ? (
            <span className="w-16 h-4 rounded bg-slate-200 animate-pulse" />
          ) : stats && stats.last7Days.growthPercent !== null ? (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                stats.last7Days.growthPercent > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : stats.last7Days.growthPercent < 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {stats.last7Days.growthPercent > 0 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              ) : stats.last7Days.growthPercent < 0 ? (
                <ArrowDownRight className="w-3 h-3 text-rose-600" />
              ) : null}
              {stats.last7Days.growthPercent > 0
                ? `+${stats.last7Days.growthPercent}%`
                : `${stats.last7Days.growthPercent}%`}{' '}
              volume
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-semibold">Realtime</span>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-xl font-black text-slate-900">
            {loadingStats && !stats
              ? '...'
              : `${stats?.last7Days.totalQty ?? 0} Porsi Terjual`}
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">
            {loadingStats && !stats
              ? 'Memuat...'
              : `Omset ${formatRupiah(stats?.last7Days.totalRevenue ?? 0)}`}
          </span>
        </div>

        {/* Realtime Sparkline Bar Chart */}
        <div className="flex items-end gap-1.5 h-14 pt-2">
          {loadingStats && !stats
            ? Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-200 rounded-t animate-pulse"
                  style={{ height: `${20 + i * 10}%` }}
                />
              ))
            : stats?.last7Days.days.map((d, i) => {
                const heightPercent =
                  d.qty === 0
                    ? 14
                    : Math.max(18, Math.min(100, Math.round((d.qty / maxDayQty) * 100)));
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all relative group cursor-pointer ${
                      d.isToday
                        ? 'bg-gradient-to-t from-orange-500 to-amber-400 shadow-xs'
                        : d.qty > 0
                        ? 'bg-orange-300 hover:bg-orange-400'
                        : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                    title={`${d.dayLabel} (${d.date}): ${d.qty} porsi — ${formatRupiah(
                      d.revenue
                    )}${d.isToday ? ' (Hari Ini)' : ''}`}
                  />
                );
              })}
        </div>

        <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase pt-0.5">
          {(stats?.last7Days.days || [
            { dayLabel: 'Sen' },
            { dayLabel: 'Sel' },
            { dayLabel: 'Rab' },
            { dayLabel: 'Kam' },
            { dayLabel: 'Jum' },
            { dayLabel: 'Sab' },
            { dayLabel: 'Min' },
          ]).map((d, i) => (
            <span key={i} className={(d as any).isToday ? 'text-orange-600 font-extrabold' : ''}>
              {d.dayLabel}
            </span>
          ))}
        </div>

        {/* Realtime Today's Pulse */}
        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 font-medium">
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-500" />
            Hari ini:
          </span>
          <span className="font-bold text-slate-800">
            {stats ? `${stats.today.qty} porsi (${formatRupiah(stats.today.revenue)})` : '...'}
          </span>
        </div>
      </div>

      {/* Realtime Inventory Portion Capacity (Kapasitas Sisa Porsi dari Bahan Baku) */}
      {stats?.inventory.hasRecipe && (
        <div
          className={`p-3.5 rounded-2xl border ${
            (stats.inventory.maxPortions ?? 0) === 0
              ? 'bg-rose-50/90 border-rose-200 text-rose-950'
              : (stats.inventory.maxPortions ?? 0) < 10
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-orange-50/70 border-orange-200/70 text-orange-950'
          } space-y-1.5 transition-all`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5 text-slate-800">
              <Package className="w-3.5 h-3.5 text-orange-600" />
              Estimasi Kapasitas Saji
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                (stats.inventory.maxPortions ?? 0) === 0
                  ? 'bg-rose-100 text-rose-800'
                  : (stats.inventory.maxPortions ?? 0) < 10
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {(stats.inventory.maxPortions ?? 0) === 0
                ? 'Stok Kosong'
                : (stats.inventory.maxPortions ?? 0) < 10
                ? 'Stok Menipis'
                : 'Stok Cukup'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black tracking-tight text-slate-900">
              ~{stats.inventory.maxPortions ?? 0} Porsi
            </span>
            {stats.inventory.bottleneck && (
              <span className="text-[11px] text-slate-600">
                Pembatas: <strong className="text-slate-800">{stats.inventory.bottleneck.name}</strong> ({stats.inventory.bottleneck.stock} {stats.inventory.bottleneck.unit})
              </span>
            )}
          </div>
        </div>
      )}

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

      {/* Breakdown Komposisi Resep Bahan & Realtime Ingredient Stock */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Resep & Stok Bahan Baku
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
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {product.productIngredients.map((r, idx) => {
              const ing = r.ingredient || ingredients.find((i) => i.id === r.ingredientId);
              const realIng = stats?.inventory.ingredients.find((item) => item.id === r.ingredientId);
              const stock = realIng ? realIng.stock : ing?.stock ?? 0;
              const unit = ing?.unit || 'unit';
              const possiblePortions = realIng?.possiblePortions;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          realIng?.isEmpty
                            ? 'bg-rose-500'
                            : realIng?.isLow
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-bold text-slate-800 truncate">
                        {ing?.name || 'Bahan Baku'}
                      </span>
                      {ing?.isPackaging && (
                        <span className="text-[9px] font-semibold bg-slate-200 text-slate-600 px-1 rounded">
                          Kemasan
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>Stok riil: <strong className="text-slate-700">{stock} {unit}</strong></span>
                      {possiblePortions !== undefined && (
                        <span>(~{possiblePortions} porsi)</span>
                      )}
                    </div>
                  </div>

                  <span className="text-slate-700 font-mono text-[11px] shrink-0 font-bold bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                    {r.quantity} {unit}
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
              Hubungkan bahan baku untuk memantau stok dan menghitung HPP otomatis saat transaksi kasir.
            </p>
          </div>
        )}
      </div>

      {/* Realtime Recent Orders History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            Pesanan Terkini
          </span>
          {stats?.recentOrders && stats.recentOrders.length > 0 && (
            <span className="text-[10px] font-semibold text-slate-400">
              {stats.recentOrders.length} Transaksi Terakhir
            </span>
          )}
        </div>

        {loadingStats && !stats ? (
          <div className="space-y-1.5">
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {stats.recentOrders.map((order, idx) => (
              <div
                key={order.orderId || idx}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-orange-50/40 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 truncate">
                      {order.customerName || 'Pelanggan Kasir'}
                    </span>
                    {order.queueNumber && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">
                        #{order.queueNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    <span>{formatTimeAgo(order.createdAt)}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-500 uppercase">{order.source}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 block">
                    {order.qty} cup
                  </span>
                  <span
                    className={`text-[9px] font-extrabold uppercase ${
                      order.status === 'COMPLETED'
                        ? 'text-emerald-600'
                        : order.status === 'PREPARING'
                        ? 'text-amber-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {order.status === 'COMPLETED'
                      ? 'Selesai'
                      : order.status === 'PREPARING'
                      ? 'Dimasak'
                      : order.status === 'READY'
                      ? 'Siap'
                      : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
            Belum ada pesanan masuk untuk menu ini.
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
