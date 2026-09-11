"use client";

import { useEffect } from "react";
import { flushScanQueue } from "@/lib/scan-queue";

/**
 * PWA Service Worker 등록 및 오프라인 큐 자동 플러시 훅
 * 루트 레이아웃에 마운트하여 전체 앱에서 동작합니다.
 */
export function usePWA() {
  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.info("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // Flush IndexedDB queue when network comes back online
    const handleOnline = async () => {
      console.info("[PWA] Network restored — flushing scan queue...");
      try {
        const result = await flushScanQueue();
        if (result.sent > 0) {
          console.info(`[PWA] Flushed ${result.sent} queued scan(s).`);
        }
      } catch (err) {
        console.warn("[PWA] Queue flush failed:", err);
      }
    };

    window.addEventListener("online", handleOnline);

    // Also flush on mount in case we reconnected while app was closed
    if (navigator.onLine) {
      flushScanQueue().catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
