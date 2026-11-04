"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { hardwareScanner, type ScannerHardwareType, type DataWedgeScanEvent } from '@/lib/hardware-scanner/datawedge';
import { feedback } from '@/lib/feedback';

export type BarcodeType = 'LOCATION' | 'ITEM' | 'COMMAND' | 'USER' | 'ORDER' | 'UNKNOWN';

export interface ParsedBarcode {
  raw: string;
  type: BarcodeType;
  prefix: string;
  value: string;
  source: 'DATAWEDGE' | 'HID' | 'MANUAL';
  symbology?: string;
}

export interface UseHardwareScannerProps {
  onScan?: (result: ParsedBarcode) => void;
  onCommand?: (command: 'CMD-SKIP' | 'CMD-UNDO' | 'CMD-DONE' | string) => void;
  onLocation?: (locationCode: string) => void;
  onItem?: (skuOrUpc: string) => void;
  onError?: (raw: string) => void;
  timeoutMs?: number; // Keystroke threshold for HID scanners (default 50ms)
  disabled?: boolean;
}

export function parseBarcodeString(raw: string, source: ParsedBarcode['source'] = 'HID', symbology?: string): ParsedBarcode {
  const clean = (raw || '').trim();
  let type: BarcodeType = 'UNKNOWN';
  let prefix = '';
  let value = clean;

  if (clean.startsWith('LOC-')) {
    type = 'LOCATION';
    prefix = 'LOC-';
    value = clean.substring(4);
  } else if (clean.startsWith('CMD-')) {
    type = 'COMMAND';
    prefix = 'CMD-';
    value = clean.substring(4);
  } else if (clean.startsWith('USR-')) {
    type = 'USER';
    prefix = 'USR-';
    value = clean.substring(4);
  } else if (clean.startsWith('ORD-')) {
    type = 'ORDER';
    prefix = 'ORD-';
    value = clean.substring(4);
  } else if (clean.startsWith('SKU-') || /^\d{12,14}$/.test(clean)) {
    type = 'ITEM';
    if (clean.startsWith('SKU-')) {
      prefix = 'SKU-';
      value = clean.substring(4);
    }
  }

  return {
    raw: clean,
    type,
    prefix,
    value,
    source,
    symbology,
  };
}

/**
 * 전역 산업용 하드웨어 스캐너 & 키보드 웨지 통합 훅
 * Zebra DataWedge, Honeywell, PointMobile Intent 브로드캐스트와
 * 핑거 링 스캐너 HID 입력을 단일 API로 통합 지원합니다.
 */
export function useHardwareScanner({
  onScan,
  onCommand,
  onLocation,
  onItem,
  onError,
  timeoutMs = 50,
  disabled = false,
}: UseHardwareScannerProps = {}) {
  const [scannerType, setScannerType] = useState<ScannerHardwareType>('HID_KEYBOARD');
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const processBarcode = useCallback(
    (raw: string, source: ParsedBarcode['source'], symbology?: string) => {
      if (disabled || !raw || raw.length < 2) return;

      const parsed = parseBarcodeString(raw, source, symbology);
      if (onScan) onScan(parsed);

      switch (parsed.type) {
        case 'COMMAND':
          feedback.command();
          if (onCommand) onCommand(parsed.raw);
          break;
        case 'LOCATION':
          feedback.normal();
          if (onLocation) onLocation(parsed.raw);
          break;
        case 'ITEM':
          feedback.normal();
          if (onItem) onItem(parsed.value);
          break;
        case 'USER':
        case 'ORDER':
          feedback.normal();
          break;
        default:
          feedback.error();
          if (onError) onError(parsed.raw);
          break;
      }
    },
    [disabled, onScan, onCommand, onLocation, onItem, onError]
  );

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    // 1. Initialize Hardware SDK
    hardwareScanner.init();
    setScannerType(hardwareScanner.getScannerType());

    // 2. Subscribe to Zebra DataWedge / PDA events
    const unsubscribe = hardwareScanner.subscribe((event: DataWedgeScanEvent) => {
      processBarcode(event.data, 'DATAWEDGE', event.symbology);
    });

    // 3. Fallback: Keyboard Wedge (Ring scanner / USB HID)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.isComposing
      ) {
        return;
      }

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 2) {
          e.preventDefault();
          processBarcode(bufferRef.current, 'HID');
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > timeoutMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }
        bufferRef.current += e.key;
        lastKeyTimeRef.current = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [disabled, timeoutMs, processBarcode]);

  const triggerSoftScan = useCallback(() => {
    hardwareScanner.triggerSoftScan();
  }, []);

  return {
    scannerType,
    isHardwareConnected: scannerType === 'ZEBRA_DATAWEDGE' || scannerType === 'POINTMOBILE' || scannerType === 'HONEYWELL',
    triggerSoftScan,
  };
}
