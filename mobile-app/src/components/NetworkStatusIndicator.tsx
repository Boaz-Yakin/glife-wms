'use client';

import React, { useEffect, useState } from 'react';
import { SyncWorker } from '@/offline/sync-worker';
import { CacheManager } from '@/offline/cache-manager';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';

export function NetworkStatusIndicator() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [justSynced, setJustSynced] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // 1. Initialize Sync Worker
    SyncWorker.init();

    // 2. Prefetch Master Data in background
    CacheManager.prefetchMasterData().catch(() => {});

    // 3. Subscribe to network status & pending queue count
    const unsubscribe = SyncWorker.subscribe((online, count) => {
      setIsOnline(online);
      setPendingCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!mounted) return null;

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await SyncWorker.syncNow();
      if (res.synced > 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and nothing pending, show subtle status badge
  if (isOnline && pendingCount === 0) {
    if (justSynced) {
      return (
        <div className="bg-emerald-500/20 text-emerald-300 text-[11px] px-3 py-1 flex items-center justify-center gap-1.5 border-b border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          오프라인 작업 동기화 완료!
        </div>
      );
    }
    return null;
  }

  // If offline
  if (!isOnline) {
    return (
      <div className="bg-amber-500/20 border-b border-amber-500/40 px-3 py-1.5 flex items-center justify-between text-amber-300 text-xs shadow-xs animate-in slide-in-from-top-2">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <div className="leading-tight">
            <span className="font-semibold">오프라인 모드</span>
            <span className="text-[11px] text-amber-200/80 ml-1.5">
              (미전송: {pendingCount}건 로컬 저장됨)
            </span>
          </div>
        </div>
        <span className="text-[10px] bg-amber-500/30 px-2 py-0.5 rounded-full font-mono">
          IndexedDB Active
        </span>
      </div>
    );
  }

  // If online but has pending unsynced queue
  return (
    <div className="bg-blue-500/20 border-b border-blue-500/40 px-3 py-1.5 flex items-center justify-between text-blue-300 text-xs shadow-xs animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <CloudUpload className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="leading-tight">
          <span className="font-semibold">오프라인 작업 전송 대기</span>
          <span className="text-[11px] text-blue-200/80 ml-1.5">({pendingCount}건)</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isSyncing}
        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? '전송 중...' : '지금 동기화'}
      </button>
    </div>
  );
}
