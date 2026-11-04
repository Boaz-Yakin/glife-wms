import { SyncWorker } from './sync-worker';
import { CacheManager } from './cache-manager';
import { OfflineActionType } from './db';

export interface OfflineExecutionResult<T = any> {
  success: boolean;
  isOffline: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class OfflineActionExecutor {
  /**
   * 오프라인 우선 액션 실행기:
   * 1. 온라인이면 서버 직접 호출 시도
   * 2. 네트워크 단절 또는 장애 발생 시 IndexedDB 큐에 자동 적재 후 성공 처리 (0초 지연)
   */
  static async execute<T = any>(
    actionType: OfflineActionType,
    endpoint: string,
    payload: Record<string, any>,
    options: {
      tenantId?: string;
      optimisticInventoryUpdate?: {
        locationCode: string;
        itemId: string;
        deltaQty: number;
      };
    } = {}
  ): Promise<OfflineExecutionResult<T>> {
    // 1. 이미 오프라인 상태인 경우 바로 큐잉
    if (!SyncWorker.isOnline()) {
      await SyncWorker.enqueueAction(actionType, endpoint, payload, options.tenantId);

      if (options.optimisticInventoryUpdate) {
        await CacheManager.adjustLocalInventory(
          options.optimisticInventoryUpdate.locationCode,
          options.optimisticInventoryUpdate.itemId,
          options.optimisticInventoryUpdate.deltaQty
        );
      }

      return {
        success: true,
        isOffline: true,
        message: '⚡ 오프라인 모드: 작업이 로컬에 저장되었습니다. 연결 복원 시 자동 전송됩니다.',
      };
    }

    // 2. 온라인 상태인 경우 서버 호출 시도
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          isOffline: false,
          data,
        };
      }

      // 서버가 4xx 에러(비즈니스 유효성 검증 실패 등)를 반환한 경우 오프라인 fallback 없이 에러 반환
      if (response.status >= 400 && response.status < 500) {
        const errJson = await response.json().catch(() => ({}));
        return {
          success: false,
          isOffline: false,
          error: errJson.error || `Request failed with status ${response.status}`,
        };
      }

      // 5xx 서버 에러 발생 시 오프라인 큐로 안전하게 fallback
      throw new Error(`Server returned ${response.status}`);
    } catch (netErr: any) {
      console.warn('[OfflineActionExecutor] Network fail, falling back to offline queue:', netErr);

      await SyncWorker.enqueueAction(actionType, endpoint, payload, options.tenantId);

      if (options.optimisticInventoryUpdate) {
        await CacheManager.adjustLocalInventory(
          options.optimisticInventoryUpdate.locationCode,
          options.optimisticInventoryUpdate.itemId,
          options.optimisticInventoryUpdate.deltaQty
        );
      }

      return {
        success: true,
        isOffline: true,
        message: '⚡ 네트워크 불안정: 작업이 로컬 IndexedDB에 안전하게 보관되었습니다.',
      };
    }
  }
}
