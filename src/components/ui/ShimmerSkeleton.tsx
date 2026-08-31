'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Coffee, Sparkles, CloudSun, Star, ShoppingBag, Clock, User, QrCode } from 'lucide-react';

export interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'custom';
  count?: number;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

/**
 * Reusable Arum Seduh warm Amber/Orange Shimmer Skeleton component
 */
export function ShimmerSkeleton({
  className,
  variant = 'custom',
  count = 1,
  width,
  height,
  rounded,
  style,
  ...props
}: ShimmerSkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full rounded-md bg-amber-100/60';
      case 'avatar':
        return 'h-10 w-10 rounded-full bg-amber-100/60 shrink-0';
      case 'button':
        return 'h-11 w-full rounded-2xl bg-amber-100/60';
      case 'card':
        return 'rounded-3xl border border-amber-100/60 bg-amber-50/40 p-5';
      case 'custom':
      default:
        return 'bg-amber-100/60 rounded-xl';
    }
  };

  const customStyle: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(rounded !== undefined ? { borderRadius: rounded } : {}),
    ...style,
  };

  if (count > 1) {
    return (
      <div className="space-y-2.5 w-full">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className={cn('shimmer relative overflow-hidden', getVariantStyles(), className)}
            style={customStyle}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('shimmer relative overflow-hidden', getVariantStyles(), className)}
      style={customStyle}
      {...props}
    />
  );
}

/**
 * Prebuilt Skeleton: Storefront Weather Widget (~200px height with location pill & product placeholders)
 */
export function WeatherWidgetSkeleton() {
  return (
    <section className="bg-white rounded-[2rem] border border-amber-100/60 p-6 shadow-sm overflow-hidden text-left relative min-h-[220px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-amber-100/40 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 shimmer shrink-0 flex items-center justify-center">
              <CloudSun className="w-3.5 h-3.5 text-amber-500/50" />
            </div>
            <div className="h-5 w-48 rounded-lg bg-amber-100 shimmer" />
          </div>
          <div className="h-3 w-64 rounded-md bg-amber-50 shimmer" />
        </div>

        {/* Weather details pill placeholder */}
        <div className="flex items-center gap-2.5 bg-amber-50/60 border border-amber-200/40 px-3.5 py-1.5 rounded-2xl shrink-0 self-start sm:self-auto shadow-inner">
          <div className="h-4 w-20 rounded-md bg-amber-100 shimmer" />
          <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-ping" />
          <div className="h-4 w-12 rounded-md bg-amber-200 shimmer" />
        </div>
      </div>

      {/* Tagline placeholder box */}
      <div className="h-11 rounded-2xl bg-amber-50/60 border border-amber-100/60 mb-5 p-3 flex items-center">
        <div className="h-3.5 w-3/4 rounded-md bg-amber-100 shimmer" />
      </div>

      {/* Recommended Items horizontal scrolls */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="w-[135px] md:w-[155px] shrink-0 bg-white/80 border border-amber-100/60 rounded-2xl p-2.5 shadow-xs space-y-2"
          >
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-amber-50 shimmer border border-amber-100/30" />
            <div className="h-3.5 w-4/5 rounded-md bg-amber-100 shimmer" />
            <div className="h-3 w-1/2 rounded-md bg-orange-100 shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Prebuilt Skeleton: Storefront Featured Reviews (Horizontal cards with avatar, rating stars, and text placeholders)
 */
export function FeaturedReviewsSkeleton() {
  return (
    <section className="bg-gradient-to-b from-amber-50/30 to-white rounded-[2rem] border border-amber-100/50 p-6 shadow-sm overflow-hidden text-left relative space-y-5">
      <div className="flex items-center justify-between border-b border-amber-100/40 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500/60" />
            <div className="h-5 w-44 rounded-lg bg-amber-100 shimmer" />
          </div>
          <div className="h-3 w-56 rounded-md bg-amber-50 shimmer" />
        </div>
        <div className="h-7 w-24 rounded-full bg-amber-100 shimmer" />
      </div>

      {/* Review cards carousel */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="w-[280px] md:w-[320px] shrink-0 rounded-3xl p-5 border border-amber-100/60 bg-white/90 shadow-sm space-y-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 shimmer shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-28 rounded-md bg-amber-100 shimmer" />
                <div className="h-2.5 w-16 rounded-md bg-amber-50 shimmer" />
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, sIdx) => (
                  <Star key={sIdx} className="w-3 h-3 fill-amber-200 text-amber-200" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded-md bg-amber-50 shimmer" />
              <div className="h-3 w-4/5 rounded-md bg-amber-50 shimmer" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Prebuilt Skeleton: Storefront Arus Poin & Wallet Overview
 */
export function ArusPoinWalletSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-[#2A1F16] to-[#1C1610] rounded-[2rem] p-6 text-white border border-[#D4A574]/20 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[190px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 shimmer flex items-center justify-center">
              <Coffee className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
              Arum Seduh Wallet
            </span>
          </div>
          <div className="h-5 w-24 rounded-full bg-amber-500/20 shimmer" />
        </div>

        <div className="my-3 space-y-1.5 text-left">
          <div className="h-2.5 w-20 rounded bg-amber-200/20 shimmer" />
          <div className="h-8 w-44 rounded-xl bg-amber-200/30 shimmer" />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <div className="flex-1 h-10 rounded-xl bg-amber-400/20 shimmer" />
          <div className="h-10 w-24 rounded-xl bg-white/10 shimmer" />
        </div>
      </div>

      {/* Loyalty Poin Card */}
      <div className="bg-gradient-to-br from-[#2A1F16] to-[#1C1610] rounded-[2rem] p-6 text-white border border-[#D4A574]/20 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[190px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 shimmer flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-200/80">
              Arus Poin & Member
            </span>
          </div>
          <div className="h-5 w-20 rounded-full bg-orange-500/20 shimmer" />
        </div>

        <div className="my-3 space-y-1.5 text-left">
          <div className="h-2.5 w-24 rounded bg-orange-200/20 shimmer" />
          <div className="h-8 w-36 rounded-xl bg-orange-200/30 shimmer" />
        </div>

        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-orange-400 to-amber-400 shimmer" />
          </div>
          <div className="flex justify-between">
            <div className="h-2.5 w-16 rounded bg-white/10 shimmer" />
            <div className="h-2.5 w-20 rounded bg-white/10 shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Prebuilt Skeleton: Search Overlay (2-column instant search result grid placeholder)
 */
export function SearchOverlaySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-[#EADFC9]/50 rounded-2xl p-2.5 relative overflow-hidden flex flex-col justify-between shadow-xs space-y-2.5"
        >
          <div className="space-y-2">
            {/* Image Placeholder */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-amber-50/80 shimmer border border-[#EADFC9]/30">
              <div className="absolute top-1.5 right-1.5 h-4 w-10 rounded-md bg-white/90 shimmer" />
              <div className="absolute bottom-1.5 left-1.5 h-4 w-12 rounded-md bg-amber-200/80 shimmer" />
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <div className="h-3.5 w-4/5 rounded-md bg-amber-100 shimmer" />
              <div className="h-2.5 w-3/5 rounded-md bg-amber-50 shimmer" />
            </div>
          </div>

          {/* Price + Button */}
          <div className="pt-2 border-t border-[#EADFC9]/30 flex items-center justify-between">
            <div className="h-4 w-16 rounded-md bg-orange-100 shimmer" />
            <div className="w-6 h-6 rounded-full bg-[#946F48]/20 shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Prebuilt Skeleton: Checkout Summary (Order items, fee breakdown, payment options)
 */
export function CheckoutSummarySkeleton() {
  return (
    <div className="min-h-dvh bg-[#FFFBF5] px-4 py-6 max-w-2xl mx-auto space-y-4">
      {/* Header bar placeholder */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-100/50">
        <div className="h-6 w-32 rounded-lg bg-amber-100 shimmer" />
        <div className="h-8 w-28 rounded-full bg-amber-100 shimmer" />
      </div>

      {/* Order Items Card */}
      <div className="bg-white rounded-3xl border border-amber-100/60 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-amber-100 shimmer" />
          <div className="h-3 w-16 rounded bg-amber-50 shimmer" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="flex gap-3 items-center pb-3 border-b border-amber-50 last:border-0 last:pb-0">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 shimmer border border-amber-100/40 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-amber-100 shimmer" />
                <div className="h-2.5 w-1/2 rounded bg-amber-50 shimmer" />
              </div>
              <div className="h-4 w-16 rounded bg-orange-100 shimmer shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Delivery / Pickup Details Card */}
      <div className="bg-white rounded-3xl border border-amber-100/60 p-5 shadow-xs space-y-3">
        <div className="h-4 w-36 rounded bg-amber-100 shimmer" />
        <div className="h-10 w-full rounded-2xl bg-amber-50/60 shimmer" />
        <div className="h-10 w-full rounded-2xl bg-amber-50/60 shimmer" />
      </div>

      {/* Payment Options Card */}
      <div className="bg-white rounded-3xl border border-amber-100/60 p-5 shadow-xs space-y-3">
        <div className="h-4 w-32 rounded bg-amber-100 shimmer" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-14 rounded-2xl bg-amber-50/70 shimmer border border-amber-100/40" />
          ))}
        </div>
      </div>

      {/* Total & Checkout Button */}
      <div className="bg-white rounded-3xl border border-amber-100/60 p-5 shadow-xs space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded bg-amber-50 shimmer" />
            <div className="h-3 w-20 rounded bg-amber-50 shimmer" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-20 rounded bg-amber-100 shimmer" />
            <div className="h-5 w-24 rounded bg-orange-100 shimmer" />
          </div>
        </div>
        <div className="h-13 w-full rounded-2xl bg-gradient-to-r from-orange-500/40 to-amber-500/40 shimmer" />
      </div>
    </div>
  );
}

/**
 * Prebuilt Skeleton: Live Queue Monitor (Preparing & Ready order ticket cards for /antrian)
 */
export function LiveQueueSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 p-8 gap-8 w-full">
      {/* Left Column: Sedang Disiapkan */}
      <div className="flex flex-col bg-[#1C140E]/80 rounded-3xl border border-orange-950/40 p-6 backdrop-blur-sm overflow-hidden flex-1 min-h-[450px]">
        <div className="flex items-center justify-between pb-4 border-b border-orange-950/50 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <div className="h-5 w-36 rounded-lg bg-amber-900/30 shimmer" />
          </div>
          <div className="h-6 w-20 rounded-full bg-amber-950/50 shimmer border border-amber-900/30" />
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-2xl flex flex-col gap-2 shadow-sm"
            >
              <div className="h-8 w-20 rounded-lg bg-amber-500/20 shimmer" />
              <div className="h-3.5 w-24 rounded bg-amber-200/20 shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Siap Diambil */}
      <div className="flex flex-col bg-[#2A1E16]/80 rounded-3xl border border-orange-900/40 p-6 backdrop-blur-sm overflow-hidden flex-1 min-h-[450px]">
        <div className="flex items-center justify-between pb-4 border-b border-orange-900/40 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
            <div className="h-5 w-32 rounded-lg bg-orange-900/30 shimmer" />
          </div>
          <div className="h-6 w-20 rounded-full bg-orange-950/50 shimmer border border-orange-500/30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="p-5 bg-gradient-to-br from-[#3D2818] to-[#25170F] border-2 border-orange-500/30 rounded-3xl flex flex-col justify-center items-center text-center gap-2 shadow-md"
            >
              <div className="h-10 w-24 rounded-xl bg-orange-400/20 shimmer" />
              <div className="h-4 w-32 rounded bg-amber-200/20 shimmer" />
              <div className="h-5 w-20 rounded-full bg-orange-500/30 shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Prebuilt Skeleton: Admin POS Product Catalog Grid
 */
export function AdminCatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-xs space-y-2 text-left"
        >
          <div className="relative aspect-square bg-amber-50/60 shimmer border-b border-border/30" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 w-4/5 rounded bg-amber-100 shimmer" />
            <div className="h-2.5 w-1/2 rounded bg-amber-50 shimmer" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-4 w-16 rounded bg-orange-100 shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Prebuilt Skeleton: Admin Orders Table / Card List
 */
export function AdminOrdersSkeleton() {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-border/40 p-4 sm:p-5 shadow-xs space-y-3"
        >
          {/* Top Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-4 w-20 rounded bg-amber-100 shimmer" />
              <div className="h-5 w-24 rounded-full bg-orange-100 shimmer" />
              <div className="h-5 w-16 rounded-full bg-amber-50 shimmer" />
            </div>
            <div className="h-3.5 w-16 rounded bg-amber-50 shimmer" />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-amber-50 shimmer" />
              <div className="h-4 w-36 rounded bg-amber-100 shimmer" />
              <div className="h-3 w-48 rounded bg-amber-50 shimmer" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-amber-50 shimmer" />
              <div className="h-3.5 w-40 rounded bg-amber-100 shimmer" />
              <div className="h-3.5 w-32 rounded bg-amber-50 shimmer" />
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="h-3 w-28 rounded bg-amber-50 shimmer" />
            <div className="h-4 w-20 rounded bg-orange-100 shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
