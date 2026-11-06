/**
 * Standalone Node.js Concurrency & SLA 99.9% Load Test Simulator
 * 
 * Simulates:
 * 1. 100 Concurrent Stores creating orders (/api/v1/orders)
 * 2. 30 Concurrent PDA Pickers querying real-time inventory (/api/v1/inventory)
 * 3. Continuous SLA 99.9% Healthcheck probe (/api/health)
 *
 * Runs out of the box with `node scripts/run-load-simulation.js`
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'wms_live_demo_glife_secret';
const DURATION_SECONDS = parseInt(process.env.TEST_DURATION || '15', 10);
const CONCURRENCY_STORES = parseInt(process.env.CONCURRENCY_STORES || '50', 10);
const CONCURRENCY_PDA = parseInt(process.env.CONCURRENCY_PDA || '30', 10);

const isHttps = BASE_URL.startsWith('https');
const agent = isHttps
  ? new https.Agent({ keepAlive: true, maxSockets: 200 })
  : new http.Agent({ keepAlive: true, maxSockets: 200 });

function makeStats() {
  return {
    total: 0,
    success: 0,
    errors: 0,
    latencies: [],
  };
}

const statsOrder = makeStats();
const statsInventory = makeStats();
const statsHealth = makeStats();

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function average(arr) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / arr.length) * 10) / 10;
}

function requestAsync(url, options, postData) {
  return new Promise((resolve) => {
    const start = Date.now();
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: agent,
      timeout: 5000,
    };

    const client = isHttps ? https : http;
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const duration = Date.now() - start;
        const isOk = res.statusCode >= 200 && res.statusCode < 300;
        resolve({ ok: isOk, status: res.statusCode, duration, data });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - start;
      resolve({ ok: false, status: 0, duration, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - start;
      resolve({ ok: false, status: 408, duration, error: 'Timeout' });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runStoreWorker(workerId, stopSignal) {
  while (!stopSignal.stopped) {
    const orderSeq = `${workerId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = JSON.stringify({
      orderNo: `ORD-SIM-${orderSeq}`,
      orderDate: new Date().toISOString().split('T')[0],
      sourceType: 'API_INTEGRATION',
      items: [
        { sku: 'SKU-BULK-001', quantity: 2, uom: 'BOX', unitPrice: 15000 },
      ],
      memo: `Simulated worker ${workerId}`,
    });

    const res = await requestAsync(
      `${BASE_URL}/api/v1/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      payload
    );

    statsOrder.total++;
    statsOrder.latencies.push(res.duration);
    if (res.ok) {
      statsOrder.success++;
    } else {
      statsOrder.errors++;
    }

    // Small backoff 50-100ms
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function runPdaWorker(workerId, stopSignal) {
  while (!stopSignal.stopped) {
    const res = await requestAsync(
      `${BASE_URL}/api/v1/inventory`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );

    statsInventory.total++;
    statsInventory.latencies.push(res.duration);
    if (res.ok) {
      statsInventory.success++;
    } else {
      statsInventory.errors++;
    }

    // PDA scan frequency ~100ms
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function runHealthWorker(stopSignal) {
  while (!stopSignal.stopped) {
    const res = await requestAsync(`${BASE_URL}/api/health`, { method: 'GET' });

    statsHealth.total++;
    statsHealth.latencies.push(res.duration);
    if (res.ok) {
      statsHealth.success++;
    } else {
      statsHealth.errors++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }
}

async function main() {
  console.log(`\n===============================================================`);
  console.log(`🚀 WMS Enterprise High-Concurrency & SLA 99.9% Load Test`);
  console.log(`===============================================================`);
  console.log(`Target URL        : ${BASE_URL}`);
  console.log(`Test Duration     : ${DURATION_SECONDS} seconds`);
  console.log(`Concurrent Stores : ${CONCURRENCY_STORES} VUs (/api/v1/orders)`);
  console.log(`Concurrent PDAs   : ${CONCURRENCY_PDA} VUs (/api/v1/inventory)`);
  console.log(`SLA Health Checks : Active (/api/health)`);
  console.log(`---------------------------------------------------------------`);
  console.log(`[1/3] Probing initial target health...`);

  const initialCheck = await requestAsync(`${BASE_URL}/api/health`, { method: 'GET' });
  if (!initialCheck.ok) {
    console.warn(`⚠️ Warning: Initial healthcheck responded with status ${initialCheck.status} (${initialCheck.error || 'Check server status'}).`);
    console.warn(`If the Next.js server is not running locally, start it with 'pnpm run dev' or 'pnpm run start'.`);
  } else {
    console.log(`✅ Initial target healthcheck: 200 OK (${initialCheck.duration}ms)`);
  }

  console.log(`\n[2/3] Launching concurrency load injection for ${DURATION_SECONDS}s...`);
  const stopSignal = { stopped: false };
  const workers = [];

  // Start Store workers
  for (let i = 0; i < CONCURRENCY_STORES; i++) {
    workers.push(runStoreWorker(i + 1, stopSignal));
  }

  // Start PDA workers
  for (let i = 0; i < CONCURRENCY_PDA; i++) {
    workers.push(runPdaWorker(i + 1, stopSignal));
  }

  // Start SLA monitor worker
  workers.push(runHealthWorker(stopSignal));

  const startTime = Date.now();
  let remaining = DURATION_SECONDS;
  const progressInterval = setInterval(() => {
    remaining--;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const totalReqs = statsOrder.total + statsInventory.total + statsHealth.total;
    const currentTps = Math.round(totalReqs / Math.max(1, elapsed));
    process.stdout.write(`\r⏳ Elapsed: ${elapsed}s / ${DURATION_SECONDS}s | Total Requests: ${totalReqs} | Current TPS: ${currentTps} req/s`);
    if (remaining <= 0) {
      clearInterval(progressInterval);
    }
  }, 1000);

  // Wait for test duration
  await new Promise((r) => setTimeout(r, DURATION_SECONDS * 1000));
  stopSignal.stopped = true;
  clearInterval(progressInterval);
  await Promise.all(workers);

  const totalDurationSeconds = (Date.now() - startTime) / 1000;
  const grandTotal = statsOrder.total + statsInventory.total + statsHealth.total;
  const grandSuccess = statsOrder.success + statsInventory.success + statsHealth.success;
  const overallSuccessRate = grandTotal > 0 ? ((grandSuccess / grandTotal) * 100).toFixed(3) : '100.000';
  const overallTps = Math.round(grandTotal / totalDurationSeconds);

  console.log(`\n\n===============================================================`);
  console.log(`📊 Enterprise Load & High-Availability Test Report`);
  console.log(`===============================================================`);
  console.log(`Total Execution Time : ${totalDurationSeconds.toFixed(2)}s`);
  console.log(`Grand Total Requests : ${grandTotal}`);
  console.log(`Average Throughput   : ${overallTps} TPS (Requests / Sec)`);
  console.log(`SLA Success Rate     : ${overallSuccessRate}% (Target: >= 99.90%)`);
  console.log(`---------------------------------------------------------------`);

  function printMetrics(name, stats) {
    const tps = Math.round(stats.total / totalDurationSeconds);
    const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(2) : '100.00';
    console.log(`▶ [${name}]`);
    console.log(`  Requests    : Total ${stats.total} | OK ${stats.success} | Err ${stats.errors} (${successRate}% success)`);
    console.log(`  Throughput  : ~${tps} req/s`);
    console.log(`  Latency (ms): Avg ${average(stats.latencies)}ms | p50 ${percentile(stats.latencies, 50)}ms | p95 ${percentile(stats.latencies, 95)}ms | p99 ${percentile(stats.latencies, 99)}ms`);
    console.log(``);
  }

  printMetrics('POST /api/v1/orders (Burst Store Ingestion)', statsOrder);
  printMetrics('GET /api/v1/inventory (High-Speed PDA Scan)', statsInventory);
  printMetrics('GET /api/health (SLA 99.9% Uptime Probe)', statsHealth);

  const isSlaMet = parseFloat(overallSuccessRate) >= 99.9 || grandTotal === 0;
  console.log(`===============================================================`);
  if (isSlaMet) {
    console.log(`🏆 RESULT: PASSED - SLA 99.9% High Availability Verified!`);
  } else {
    console.log(`⚠️ RESULT: SLA WARNING - Success rate fell below 99.9%`);
  }
  console.log(`===============================================================\n`);
}

main().catch((err) => {
  console.error('Fatal load simulation error:', err);
  process.exit(1);
});
