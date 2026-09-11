/**
 * WMS PWA Service Worker
 * 
 * 전략:
 * - App Shell (HTML/JS/CSS): Network First with Cache Fallback
 * - Static Assets (_next/static): Cache First (immutable)
 * - API Routes (/api/*): Network Only (real-time data, no cache)
 * - Scan queue: IndexedDB 버퍼 (오프라인 시 스캔 이벤트 임시 저장)
 */

const CACHE_NAME = "wms-app-shell-v1";
const STATIC_CACHE = "wms-static-v1";

const APP_SHELL_URLS = [
  "/",
  "/picking",
  "/inventory",
  "/inventory/queue",
  "/inventory/lookup",
];

// ──────────────────────────────────────────────────────────────
// Install: Cache App Shell
// ──────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_URLS).catch((err) => {
        console.warn("[SW] App shell pre-cache failed (non-fatal):", err);
      });
    })
  );
  self.skipWaiting();
});

// ──────────────────────────────────────────────────────────────
// Activate: Clean up old caches
// ──────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ──────────────────────────────────────────────────────────────
// Fetch: Routing strategy
// ──────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 1. Static immutable assets: Cache First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // 2. API routes: Network Only (always fresh)
  if (url.pathname.startsWith("/api/")) return;

  // 3. App pages: Network First with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((fresh) => {
        if (fresh.ok) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return fresh;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            new Response(
              '<html><body style="background:#000;color:#fff;font-family:monospace;display:flex;height:100vh;align-items:center;justify-content:center;"><div><h1>📵 Offline</h1><p>네트워크 연결을 확인해 주세요.</p></div></body></html>',
              { headers: { "Content-Type": "text/html" } }
            )
        )
      )
  );
});

// ──────────────────────────────────────────────────────────────
// Background Sync: Flush IndexedDB scan queue when back online
// ──────────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "wms-scan-queue-sync") {
    event.waitUntil(flushScanQueue());
  }
});

async function flushScanQueue() {
  const db = await openScanQueueDB();
  const tx = db.transaction("scan_queue", "readwrite");
  const store = tx.objectStore("scan_queue");
  const all = await store.getAll();

  for (const item of all) {
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        await store.delete(item.id);
      }
    } catch {
      // Will retry on next sync
    }
  }
}

function openScanQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("wms-scan-queue", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("scan_queue")) {
        const store = db.createObjectStore("scan_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
