/**
 * Zebra DataWedge & Industrial PDA Scanner SDK
 * 
 * Supports:
 * - Zebra Enterprise Browser / DataWedge Intent API (TC21, TC26, MC3300, TC52, etc.)
 * - PointMobile / Honeywell / Bluebird Android WebView Broadcast Bridges
 * - Window JavaScriptInterface (`window.DataWedgeListener`, `window.AndroidScanner`)
 * - DOM CustomEvents (`datawedge_scan`, `dw_intent`, `pda_barcode_scan`)
 */

export interface DataWedgeScanEvent {
  data: string;
  symbology?: string;
  source: 'ZEBRA' | 'POINTMOBILE' | 'HONEYWELL' | 'HID' | 'MANUAL';
  timestamp: number;
}

export type ScannerHardwareType =
  | 'ZEBRA_DATAWEDGE'
  | 'POINTMOBILE'
  | 'HONEYWELL'
  | 'HID_KEYBOARD'
  | 'GENERIC_PDA';

type ScanListener = (event: DataWedgeScanEvent) => void;

class HardwareScannerService {
  private listeners: Set<ScanListener> = new Set();
  private initialized = false;
  private detectedType: ScannerHardwareType = 'HID_KEYBOARD';

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.detectHardware();
    this.attachIntentListeners();
  }

  getScannerType(): ScannerHardwareType {
    return this.detectedType;
  }

  subscribe(listener: ScanListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcast scanned data to all registered components
   */
  dispatchScan(data: string, symbology?: string, source: DataWedgeScanEvent['source'] = 'ZEBRA'): void {
    const cleanData = (data || '').trim();
    if (!cleanData) return;

    const event: DataWedgeScanEvent = {
      data: cleanData,
      symbology: symbology || 'UNKNOWN',
      source,
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[HardwareScanner] Listener error:', err);
      }
    }
  }

  /**
   * Trigger soft scan (laser trigger) via Zebra DataWedge API
   */
  triggerSoftScan(): void {
    if (typeof window === 'undefined') return;

    // 1. Android WebView JavascriptInterface
    const win = window as any;
    if (win.DataWedgeListener && typeof win.DataWedgeListener.softScan === 'function') {
      win.DataWedgeListener.softScan();
      return;
    }
    if (win.AndroidScanner && typeof win.AndroidScanner.startScan === 'function') {
      win.AndroidScanner.startScan();
      return;
    }

    // 2. Zebra Enterprise Browser API
    if (win.EB && win.EB.Barcode && typeof win.EB.Barcode.start === 'function') {
      win.EB.Barcode.start();
      return;
    }

    // 3. DataWedge Intent broadcast via CustomEvent
    window.dispatchEvent(
      new CustomEvent('com.symbol.datawedge.api.ACTION', {
        detail: {
          'com.symbol.datawedge.api.SOFT_SCAN_TRIGGER': 'TOGGLE_SCANNING',
        },
      })
    );
  }

  private detectHardware(): void {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const ua = navigator.userAgent.toLowerCase();

    if (win.datawedge || win.DataWedgeListener || ua.includes('tc21') || ua.includes('tc26') || ua.includes('zebra')) {
      this.detectedType = 'ZEBRA_DATAWEDGE';
    } else if (win.PointMobile || ua.includes('pm85') || ua.includes('pm90') || ua.includes('pointmobile')) {
      this.detectedType = 'POINTMOBILE';
    } else if (win.Honeywell || ua.includes('eda50') || ua.includes('eda51') || ua.includes('ct40') || ua.includes('honeywell')) {
      this.detectedType = 'HONEYWELL';
    } else if (ua.includes('android')) {
      this.detectedType = 'GENERIC_PDA';
    } else {
      this.detectedType = 'HID_KEYBOARD';
    }
  }

  private attachIntentListeners(): void {
    if (typeof window === 'undefined') return;
    const win = window as any;

    // 1. Injected Javascript Interface callbacks (Android WebView -> Web)
    win.onDataWedgeScan = (data: string, symbology?: string) => {
      this.detectedType = 'ZEBRA_DATAWEDGE';
      this.dispatchScan(data, symbology, 'ZEBRA');
    };

    win.onBarcodeScanned = (data: string, symbology?: string) => {
      this.dispatchScan(data, symbology, 'ZEBRA');
    };

    win.onPointMobileScan = (data: string, symbology?: string) => {
      this.detectedType = 'POINTMOBILE';
      this.dispatchScan(data, symbology, 'POINTMOBILE');
    };

    win.onHoneywellScan = (data: string, symbology?: string) => {
      this.detectedType = 'HONEYWELL';
      this.dispatchScan(data, symbology, 'HONEYWELL');
    };

    // 2. DOM CustomEvents from BroadcastReceivers
    const handleCustomScanEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent.detail;
      if (!detail) return;

      const barcode =
        detail.data ||
        detail.barcode ||
        detail['com.symbol.datawedge.data_string'] ||
        detail['data_string'] ||
        (typeof detail === 'string' ? detail : null);

      const symbology =
        detail.symbology ||
        detail['com.symbol.datawedge.label_type'] ||
        detail['label_type'] ||
        'UNKNOWN';

      if (barcode) {
        this.dispatchScan(barcode, symbology, 'ZEBRA');
      }
    };

    window.addEventListener('datawedge_scan', handleCustomScanEvent);
    window.addEventListener('dw_intent', handleCustomScanEvent);
    window.addEventListener('pda_barcode_scan', handleCustomScanEvent);
    window.addEventListener('com.symbol.datawedge.api.RESULT_ACTION', handleCustomScanEvent);
    document.addEventListener('datawedge_scan', handleCustomScanEvent);
  }
}

export const hardwareScanner = new HardwareScannerService();
