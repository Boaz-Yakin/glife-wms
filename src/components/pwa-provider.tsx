"use client";

import { usePWA } from "@/hooks/use-pwa";

/**
 * PWA 등록 + 오프라인 큐 플러시를 전역으로 활성화하는 Provider
 * 루트 레이아웃에 삽입합니다.
 */
export function PWAProvider() {
  usePWA();
  return null;
}
