'use client';

import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#FFFBF5] dark:bg-[#1C1610] noise transition-colors duration-300">
      {/* Dynamic Gold Backdrop Glow Aura */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-brand-500/5 dark:bg-brand-500/2 blur-3xl pointer-events-none" />
      
      <LoadingScreen isSplash={false} />
    </div>
  );
}
