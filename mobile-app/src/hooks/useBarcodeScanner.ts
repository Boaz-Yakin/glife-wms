"use client";

import { useHardwareScanner, type BarcodeType, type ParsedBarcode } from './useHardwareScanner';

export type { BarcodeType };
export type BarcodeResult = ParsedBarcode;

export interface UseBarcodeScannerProps {
  onScan?: (result: BarcodeResult) => void;
  onCommand?: (command: 'CMD-SKIP' | 'CMD-UNDO' | 'CMD-DONE' | string) => void;
  onLocation?: (locationCode: string) => void;
  onItem?: (skuOrUpc: string) => void;
  onError?: (raw: string) => void;
  timeoutMs?: number;
  disabled?: boolean;
}

/**
 * 전역 바코드 스캐너 리스너 훅 (Focus-Free & Industrial Hardware 지원)
 * Zebra DataWedge Broadcast Intent, PointMobile, Honeywell 및
 * 50ms 이내 초고속 HID 키보드 웨지 입력을 완벽하게 동시 지원합니다.
 */
export function useBarcodeScanner(props: UseBarcodeScannerProps) {
  return useHardwareScanner({
    onScan: props.onScan,
    onCommand: props.onCommand,
    onLocation: props.onLocation,
    onItem: props.onItem,
    onError: props.onError,
    timeoutMs: props.timeoutMs,
    disabled: props.disabled,
  });
}
