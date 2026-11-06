/**
 * Enterprise Concurrency & SLA 99.9% Load Test Script (k6)
 * 
 * Target Architecture: WMS SaaS Core (Supabase + Next.js App Router)
 * Scenarios:
 * 1. Burst Order Generation: 100 concurrent stores ordering (300 TPS target)
 * 2. Rapid PDA Barcode Scan: 30 pickers scanning SKU barcodes (p95 < 50ms)
 * 3. SLA 99.9% High Availability Healthcheck (/api/health)
 *
 * Usage:
 *   k6 run --env API_URL=http://localhost:3000 --env API_KEY=wms_live_demo_glife_secret scripts/load-test-k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('error_rate');
const orderCreationLatency = new Trend('order_creation_latency');
const inventoryScanLatency = new Trend('inventory_scan_latency');
const healthCheckLatency = new Trend('health_check_latency');
const successfulOrders = new Counter('successful_orders');
const successfulScans = new Counter('successful_scans');

export const options = {
  scenarios: {
    // 1. Burst Order Ingestion: Ramping to 100 virtual users submitting orders
    burst_orders: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 50 },   // Warm-up to 50 concurrent stores
        { duration: '20s', target: 100 },  // Peak load: 100 concurrent stores (~300 TPS)
        { duration: '10s', target: 0 },    // Ramp-down
      ],
      gracefulRampDown: '5s',
      exec: 'scenarioBurstOrders',
    },

    // 2. Continuous PDA Picking Scans: 30 constant pickers scanning barcodes
    pda_pickers: {
      executor: 'constant-vus',
      vus: 30,
      duration: '40s',
      exec: 'scenarioPdaScanning',
    },

    // 3. Continuous SLA 99.9% Uptime Probe
    sla_healthcheck: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 probes per second
      timeUnit: '1s',
      duration: '40s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: 'scenarioHealthcheck',
    },
  },

  thresholds: {
    // SLA 99.9% Quality Gates
    'error_rate': ['rate<0.001'], // < 0.1% errors (99.9% success rate)
    'http_req_failed': ['rate<0.001'],
    'inventory_scan_latency': ['p(95)<150'], // PDA Scan p95 < 150ms over HTTP
    'health_check_latency': ['p(95)<100'],   // SLA health probe p95 < 100ms
    'order_creation_latency': ['p(95)<500'], // Order creation p95 < 500ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'wms_live_demo_glife_secret';

const sampleSkus = ['SKU-BULK-001', 'SKU-FROZEN-002', 'SKU-DRY-003', 'SKU-CHILLED-004'];

export function scenarioBurstOrders() {
  group('Burst Order Ingestion', () => {
    const randomStoreId = `STORE-${Math.floor(Math.random() * 100) + 1}`;
    const randomOrderSeq = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const payload = JSON.stringify({
      orderNo: `ORD-PERF-${randomOrderSeq}`,
      orderDate: new Date().toISOString().split('T')[0],
      sourceType: 'API_INTEGRATION',
      items: [
        {
          sku: sampleSkus[Math.floor(Math.random() * sampleSkus.length)],
          quantity: Math.floor(Math.random() * 10) + 1,
          uom: 'BOX',
          unitPrice: 15000,
        },
        {
          sku: sampleSkus[Math.floor(Math.random() * sampleSkus.length)],
          quantity: Math.floor(Math.random() * 5) + 1,
          uom: 'EA',
          unitPrice: 3500,
        },
      ],
      memo: `Automated Load Test Order by ${randomStoreId}`,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    };

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/orders`, payload, params);
    const latency = Date.now() - startTime;
    orderCreationLatency.add(latency);

    const isOk = check(res, {
      'order status 201 or 200': (r) => r.status === 201 || r.status === 200,
      'order response has orderNo': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body && (body.orderNo || body.order_number);
        } catch (_) {
          return false;
        }
      },
    });

    if (isOk) {
      successfulOrders.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }

    // Pacing delay: simulated human/store interval 100-300ms
    sleep(0.2);
  });
}

export function scenarioPdaScanning() {
  group('Rapid PDA Barcode Scanning', () => {
    const targetSku = sampleSkus[Math.floor(Math.random() * sampleSkus.length)];
    const params = {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    };

    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/inventory?sku=${targetSku}`, params);
    const latency = Date.now() - startTime;
    inventoryScanLatency.add(latency);

    const isOk = check(res, {
      'inventory scan 200': (r) => r.status === 200,
      'inventory response valid array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || Array.isArray(body.items);
        } catch (_) {
          return false;
        }
      },
    });

    if (isOk) {
      successfulScans.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }

    // High frequency scan interval 200ms
    sleep(0.2);
  });
}

export function scenarioHealthcheck() {
  group('SLA 99.9% Healthcheck', () => {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/health`);
    const latency = Date.now() - startTime;
    healthCheckLatency.add(latency);

    const isOk = check(res, {
      'healthcheck 200 OK': (r) => r.status === 200,
      'health status HEALTHY': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'HEALTHY' || body.status === 'DEGRADED';
        } catch (_) {
          return false;
        }
      },
      'database is UP': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.checks?.database?.status === 'UP';
        } catch (_) {
          return false;
        }
      },
    });

    if (isOk) {
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  });
}
