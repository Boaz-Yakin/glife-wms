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

    const flushWithCurrentUser = async () => {
      try {
        let currentUserId: string | undefined;
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              currentUserId = data.userId;
            }
          }
        } catch {
          // If offline or unauthenticated, attempt flush without userId match
        }

        const result = await flushScanQueue(currentUserId);
        if (result.sent > 0) {
          console.info(`[PWA] Flushed ${result.sent} queued scan(s).`);
        }
        if (result.suspended > 0) {
          console.warn(
            `[PWA] ${result.suspended} offline scan(s) were recorded by a different worker and kept suspended.`
          );
        }
      } catch (err) {
        console.warn("[PWA] Queue flush failed:", err);
      }
    };

    // Flush IndexedDB queue when network comes back online
    const handleOnline = () => {
      console.info("[PWA] Network restored — flushing scan queue...");
      flushWithCurrentUser();
    };

    window.addEventListener("online", handleOnline);

    // Also flush on mount in case we reconnected while app was closed
    if (navigator.onLine) {
      flushWithCurrentUser();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
