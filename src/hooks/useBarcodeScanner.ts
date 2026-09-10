"use client";

import { useEffect, useRef } from 'react';
import { feedback } from '@/lib/feedback';

export type BarcodeType = 'LOCATION' | 'ITEM' | 'COMMAND' | 'USER' | 'ORDER' | 'UNKNOWN';

export interface BarcodeResult {
  raw: string;
  type: BarcodeType;
  prefix: string;
  value: string;
}

interface UseBarcodeScannerProps {
  onScan?: (result: BarcodeResult) => void;
  onCommand?: (command: 'CMD-SKIP' | 'CMD-UNDO' | 'CMD-DONE' | string) => void;
  onLocation?: (locationCode: string) => void;
  onItem?: (skuOrUpc: string) => void;
  onError?: (raw: string) => void;
  // 사람이 직접 타이핑하는 것과 스캐너 입력을 구분하는 임계값 (ms)
  timeoutMs?: number; 
}

/**
 * 전역 키보드 웨지 리스너 훅 (Focus-Free)
 * 어떤 화면에서든 바코드 스캔 발생 시 50ms 이내 초고속 연속 입력을 감지하고
 * 접두사(Prefix) 기반 자동 라우팅 및 3중 피드백을 제공합니다.
 */
export function useBarcodeScanner({
  onScan,
  onCommand,
  onLocation,
  onItem,
  onError,
  timeoutMs = 50,
}: UseBarcodeScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 활성화된 Input 필드 등 사용자가 직접 타이핑 중일 때는 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.isComposing
      ) {
        return;
      }

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      // 엔터 키가 들어오면 버퍼를 확인하여 스캔 완료 처리
      if (e.key === 'Enter') {
        if (bufferRef.current.length > 2) { // 유효한 바코드 최소 길이
          e.preventDefault();
          processBarcode(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }

      // 단일 문자만 버퍼에 추가 (Shift, Alt 등 제어키 무시)
      if (e.key.length === 1) {
        // 입력 간격이 임계값(50ms)보다 길면 사람이 타이핑한 것으로 간주하여 버퍼 리셋
        if (timeDiff > timeoutMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }
        
        bufferRef.current += e.key;
        lastKeyTimeRef.current = currentTime;
      }
    };

    const processBarcode = (raw: string) => {
      let type: BarcodeType = 'UNKNOWN';
      let prefix = '';
      let value = raw;

      if (raw.startsWith('LOC-')) {
        type = 'LOCATION';
        prefix = 'LOC-';
        value = raw.substring(4);
      } else if (raw.startsWith('CMD-')) {
        type = 'COMMAND';
        prefix = 'CMD-';
        value = raw.substring(4);
      } else if (raw.startsWith('USR-')) {
        type = 'USER';
        prefix = 'USR-';
        value = raw.substring(4);
      } else if (raw.startsWith('ORD-')) {
        type = 'ORDER';
        prefix = 'ORD-';
        value = raw.substring(4);
      } else if (raw.startsWith('SKU-') || /^\d{12,14}$/.test(raw)) {
        type = 'ITEM';
        if (raw.startsWith('SKU-')) {
          prefix = 'SKU-';
          value = raw.substring(4);
        }
      }

      const result: BarcodeResult = { raw, type, prefix, value };

      if (onScan) onScan(result);

      // 자동 라우팅 및 기본 피드백 처리
      switch (type) {
        case 'COMMAND':
          feedback.command();
          if (onCommand) onCommand(raw);
          break;
        case 'LOCATION':
          feedback.normal();
          if (onLocation) onLocation(raw);
          break;
        case 'ITEM':
          feedback.normal();
          if (onItem) onItem(value);
          break;
        case 'USER':
        case 'ORDER':
          feedback.normal();
          break;
        default:
          feedback.error();
          if (onError) onError(raw);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onScan, onCommand, onLocation, onItem, onError, timeoutMs]);
}
