'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs transition-opacity">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-brand-500/25 border-t-brand-500 animate-spin" />
        <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Memuat...</p>
      </div>
    </div>
  );
}
