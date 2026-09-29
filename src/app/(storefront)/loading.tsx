import { Coffee, Sparkles } from 'lucide-react';

export default function StorefrontLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat katalog menu Arum Seduh"
      className="min-h-screen bg-gradient-to-b from-[#FFFBF5] via-[#FFF8F0] to-[#FAF8F5] pb-24 relative overflow-hidden select-none"
    >
      {/* Top Indeterminate Shimmer Bar */}
      <div className="fixed top-0 inset-x-0 h-1 bg-orange-100/80 z-50 overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 animate-pulse rounded-full" />
      </div>

      {/* Floating Branded Status Pill */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-orange-200/80 shadow-[0_12px_30px_-6px_rgba(234,88,12,0.22)]">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs">
            <Coffee className="w-3.5 h-3.5 animate-bounce" />
            <span className="absolute -inset-0.5 rounded-full border border-orange-400/50 animate-ping" />
          </div>
          <span className="text-xs font-bold bg-gradient-to-r from-orange-700 to-amber-600 bg-clip-text text-transparent tracking-tight">
            Menyiapkan racikan segar Arum Seduh...
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        </div>
      </div>

      <div className="animate-pulse">
        {/* Mobile Header Skeleton */}
        <div className="md:hidden h-[124px] bg-[#FFFBF5]/90 border-b border-orange-100/70 px-6 py-7 flex items-center justify-between">
          <div className="space-y-2.5">
            <div className="h-3 w-24 bg-gradient-to-r from-orange-200/70 to-amber-100/70 rounded-full" />
            <div className="h-5 w-40 bg-gradient-to-r from-orange-200/80 to-stone-200/70 rounded-lg" />
          </div>
          <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-amber-50 border border-orange-200/50 rounded-2xl" />
        </div>

        {/* Desktop Header Skeleton */}
        <div className="hidden md:block max-w-6xl mx-auto px-6 mt-8 mb-6">
          <div className="flex items-center justify-between border-b border-orange-100/80 pb-6">
            <div className="space-y-2.5">
              <div className="h-3.5 w-28 bg-gradient-to-r from-orange-200/70 to-amber-100/70 rounded-full" />
              <div className="h-8 w-56 bg-gradient-to-r from-orange-200/80 to-stone-200/70 rounded-xl" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-32 bg-orange-100/60 rounded-2xl border border-orange-200/40" />
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-50 border border-orange-200/50 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Hero Banner Skeleton */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-2 md:mt-6">
          <div className="w-full aspect-[2.1/1] md:aspect-[3.6/1] bg-gradient-to-br from-orange-100/90 via-amber-50/80 to-orange-100/60 border border-orange-200/50 rounded-[2rem] overflow-hidden relative shadow-sm">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-orange-300/20 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-orange-950/15 via-transparent to-transparent flex flex-col justify-end p-5 md:p-8 space-y-3">
              <div className="h-4 w-24 bg-orange-300/60 rounded-full" />
              <div className="h-6 w-1/2 bg-orange-200/80 rounded-xl" />
              <div className="h-3.5 w-2/3 bg-orange-200/60 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Category Pills Skeleton */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-24 rounded-full bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-orange-300/40 shrink-0" />
            <div className="h-9 w-28 rounded-full bg-orange-100/60 border border-orange-100 shrink-0" />
            <div className="h-9 w-24 rounded-full bg-orange-100/60 border border-orange-100 shrink-0" />
            <div className="h-9 w-32 rounded-full bg-orange-100/60 border border-orange-100 shrink-0" />
            <div className="h-9 w-24 rounded-full bg-orange-100/60 border border-orange-100 shrink-0" />
          </div>
        </div>

        {/* Content Sections Skeletons */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-7 space-y-8">
          {/* Section 1: Rekomendasi / Paket */}
          <section className="bg-white/90 rounded-[2rem] border border-orange-100/80 shadow-[0_8px_30px_-12px_rgba(234,88,12,0.08)] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-orange-100" />
                <div className="h-5 w-40 bg-orange-100/90 rounded-lg" />
              </div>
              <div className="h-4 w-16 bg-amber-100/80 rounded-full" />
            </div>
            <div className="flex gap-4 overflow-hidden pb-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[148px] md:w-[180px] shrink-0 bg-gradient-to-b from-[#FFFDF9] to-orange-50/30 border border-orange-100/80 rounded-3xl p-3 space-y-3"
                >
                  <div className="w-full aspect-square bg-gradient-to-br from-orange-100/70 via-amber-50/60 to-orange-50/80 rounded-2xl" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-3/4 bg-stone-200/80 rounded-md" />
                    <div className="flex items-center justify-between pt-1">
                      <div className="h-3.5 w-1/2 bg-orange-200/70 rounded-md" />
                      <div className="w-7 h-7 rounded-xl bg-orange-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Menu Pilihan */}
          <section className="bg-white/90 rounded-[2rem] border border-orange-100/80 shadow-[0_8px_30px_-12px_rgba(234,88,12,0.08)] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-100" />
                <div className="h-5 w-36 bg-orange-100/90 rounded-lg" />
              </div>
              <div className="h-4 w-16 bg-amber-100/80 rounded-full" />
            </div>
            <div className="flex gap-4 overflow-hidden pb-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[148px] md:w-[180px] shrink-0 bg-gradient-to-b from-[#FFFDF9] to-orange-50/30 border border-orange-100/80 rounded-3xl p-3 space-y-3"
                >
                  <div className="w-full aspect-square bg-gradient-to-br from-orange-100/70 via-amber-50/60 to-orange-50/80 rounded-2xl" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-3/4 bg-stone-200/80 rounded-md" />
                    <div className="flex items-center justify-between pt-1">
                      <div className="h-3.5 w-1/2 bg-orange-200/70 rounded-md" />
                      <div className="w-7 h-7 rounded-xl bg-orange-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

