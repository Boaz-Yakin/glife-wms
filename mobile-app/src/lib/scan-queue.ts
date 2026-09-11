/**
 * WMS Offline Scan Queue (IndexedDB)
 * 
 * 현장에서 네트워크 음영 구역 발생 시, 스캔 이벤트를 
 * IndexedDB에 임시 저장 후 네트워크 복구 시 자동 전송합니다.
 */

const DB_NAME = "wms-scan-queue";
const DB_VERSION = 1;
const STORE_NAME = "scan_queue";

let db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

export interface ScanQueueItem {
  id?: number;
  endpoint: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

/**
 * 스캔 이벤트를 IndexedDB 큐에 저장합니다 (오프라인 버퍼링)
 */
export async function enqueueScan(endpoint: string, payload: Record<string, unknown>): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const item: ScanQueueItem = {
      endpoint,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    const req = store.add(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 큐에 쌓인 모든 항목을 서버로 전송합니다 (네트워크 복구 시 호출)
 */
export async function flushScanQueue(): Promise<{ sent: number; failed: number }> {
  const database = await getDB();
  const items: ScanQueueItem[] = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        await deleteQueueItem(database, item.id!);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * 큐의 미전송 항목 수를 반환합니다
 */
export async function getPendingQueueCount(): Promise<number> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteQueueItem(database: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
