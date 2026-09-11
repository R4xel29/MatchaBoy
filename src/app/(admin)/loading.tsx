export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Memuat data Arum Seduh...">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
          <div className="h-9 w-32 bg-orange-100/60 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                <div className="w-4 h-4 bg-orange-200 rounded-md" />
              </div>
            </div>
            <div className="h-7 w-32 bg-slate-200 rounded-md" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-slate-100 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Table Skeleton */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-slate-200 rounded-md" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>

          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center px-4 justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                    <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right / Secondary Panel Skeleton */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="h-5 w-28 bg-slate-200 rounded-md" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-slate-50/70 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="h-3 w-12 bg-orange-100 rounded" />
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
