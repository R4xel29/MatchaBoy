export default function StorefrontLoading() {
  return (
    <div className="min-h-dvh bg-background animate-pulse">
      {/* Hero Skeleton */}
      <div className="w-full h-[70vh] min-h-[420px] max-h-[600px] rounded-b-3xl shimmer" />

      {/* Category Tabs Skeleton */}
      <div className="flex gap-2 px-4 py-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-full shimmer shrink-0"
            style={{ width: `${60 + Math.random() * 40}px` }}
          />
        ))}
      </div>

      {/* Section title skeleton */}
      <div className="px-4 pt-4 mb-5 max-w-2xl mx-auto">
        <div className="h-7 w-32 shimmer rounded-lg" />
        <div className="h-4 w-52 shimmer rounded-lg mt-2" />
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3 px-4 max-w-2xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden border border-border/50"
          >
            <div className="aspect-[4/3] shimmer" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 shimmer rounded" />
              <div className="h-3 w-full shimmer rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 w-20 shimmer rounded" />
                <div className="w-8 h-8 shimmer rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
