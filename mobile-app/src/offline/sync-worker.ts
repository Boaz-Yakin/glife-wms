import { offlineDb, PendingAction, OfflineActionType } from './db';

type StatusListener = (isOnline: boolean, pendingCount: number) => void;

export class SyncWorker {
  private static isProcessing = false;
  private static listeners: Set<StatusListener> = new Set();
  private static initialized = false;

  static init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    window.addEventListener('online', () => {
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.notifyListeners();
    });

    // Initial check
    this.processQueue();
  }

  static subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Initial notification
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  static async getPendingCount(): Promise<number> {
    if (!offlineDb || typeof window === 'undefined') return 0;
    return await offlineDb.pendingActions.where('synced').equals(0).count();
  }

  static isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  private static async notifyListeners(): Promise<void> {
    const online = this.isOnline();
    const count = await this.getPendingCount();
    for (const listener of this.listeners) {
      listener(online, count);
    }
  }

  /**
   * 오프라인 트랜잭션 큐에 작업 적재
   */
  static async enqueueAction(
    actionType: OfflineActionType,
    endpoint: string,
    payload: Record<string, any>,
    tenantId: string = 'glife'
  ): Promise<number> {
    if (!offlineDb || typeof window === 'undefined') return -1;

    const action: PendingAction = {
      actionType,
      endpoint,
      payload,
      tenantId,
      timestamp: Date.now(),
      synced: 0,
      retryCount: 0,
      lastError: null,
    };

    const id = await offlineDb.pendingActions.add(action);
    await this.notifyListeners();

    // 온라인이면 즉시 동기화 시도
    if (this.isOnline()) {
      this.processQueue();
    }

    return id as number;
  }

  /**
   * 대기 중인 모든 트랜잭션을 FIFO 순서로 서버에 전송
   */
  static async processQueue(): Promise<{ synced: number; failed: number }> {
    if (!offlineDb || typeof window === 'undefined') return { synced: 0, failed: 0 };
    if (this.isProcessing || !this.isOnline()) return { synced: 0, failed: 0 };

    this.isProcessing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pending = await offlineDb.pendingActions
        .where('synced')
        .equals(0)
        .sortBy('timestamp');

      for (const item of pending) {
        if (!this.isOnline()) break; // Wi-Fi 다시 끊김

        try {
          const res = await fetch(item.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-offline-replay': 'true',
              'x-offline-timestamp': String(item.timestamp),
            },
            body: JSON.stringify(item.payload),
          });

          if (res.ok) {
            // 성공 시 큐에서 제거
            if (item.id !== undefined) {
              await offlineDb.pendingActions.delete(item.id);
            }
            synced++;
          } else {
            const errBody = await res.json().catch(() => ({}));
            const errMsg = errBody.error || `HTTP ${res.status}`;

            if (item.id !== undefined) {
              await offlineDb.pendingActions.update(item.id, {
                retryCount: (item.retryCount || 0) + 1,
                lastError: errMsg,
              });
            }
            failed++;
          }
        } catch (netErr: any) {
          // 네트워크 단절 예외
          failed++;
          break; // 다음 온라인 이벤트까지 중단
        }
      }
    } finally {
      this.isProcessing = false;
      await this.notifyListeners();
    }

    return { synced, failed };
  }

  /**
   * 작업자 수동 동기화 트리거
   */
  static async syncNow(): Promise<{ synced: number; failed: number }> {
    return await this.processQueue();
  }
}
