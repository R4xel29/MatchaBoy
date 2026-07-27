"use client";

import { useEffect, useRef } from "react";

export function AutoUpdateProvider() {
  const initialVersionRef = useRef<string | null>(null);
  const isReloadingRef = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      if (isReloadingRef.current) return;
      try {
        const res = await fetch("/api/version", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) return;

        const data = await res.json();
        const serverVersion = data.version;

        if (!serverVersion || serverVersion === "development") return;

        if (!initialVersionRef.current) {
          initialVersionRef.current = serverVersion;
          return;
        }

        if (serverVersion !== initialVersionRef.current) {
          console.log("[AutoUpdate] Versi baru terdeteksi di Vercel. Memperbarui halaman...");
          isReloadingRef.current = true;
          window.location.reload();
        }
      } catch (error) {
        console.error("[AutoUpdate] Error checking version:", error);
      }
    };

    // Initial check
    checkVersion();

    // Poll every 45 seconds
    const interval = setInterval(checkVersion, 45000);

    // Also check when tab regains focus
    const handleFocus = () => checkVersion();
    window.addEventListener("focus", handleFocus);

    // Catch chunk loading errors when Vercel deploys a new build while page is active
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && /loading chunk|failed to fetch dynamically imported module/i.test(event.message)) {
        if (!isReloadingRef.current) {
          console.warn("[AutoUpdate] Chunk error detected due to deployment update. Reloading...");
          isReloadingRef.current = true;
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleGlobalError);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("error", handleGlobalError);
    };
  }, []);

  return null;
}
