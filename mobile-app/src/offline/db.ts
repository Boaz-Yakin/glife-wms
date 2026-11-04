import Dexie, { type Table } from 'dexie';

export type OfflineActionType = 'PICK' | 'PUTAWAY' | 'TRANSFER' | 'COUNT';

export interface PendingAction {
  id?: number;
  tenantId: string;
  actionType: OfflineActionType;
  endpoint: string;
  payload: Record<string, any>;
  timestamp: number;
  synced: number; // 0: pending, 1: synced
  retryCount: number;
  lastError: string | null;
}

export interface CachedItem {
  id: string;
  sku: string;
  name_en: string;
  upc: string | null;
  box_barcode: string | null;
  zone_type: string;
  shelf_life_days: number | null;
  min_outbound_days: number | null;
  cached_at: number;
}

export interface CachedLocation {
  code: string;
  zone_type: string;
  pos_x?: number | null;
  pos_y?: number | null;
  temperature_zone?: string | null;
  cached_at: number;
}

export interface CachedInventory {
  id: string;
  location_code: string;
  item_id: string;
  sku: string;
  on_hand_qty: number;
  allocated_qty: number;
  expiration_date: string | null;
  lot_no: string | null;
  updated_at: number;
}

export class OfflineWarehouseDB extends Dexie {
  pendingActions!: Table<PendingAction, number>;
  cachedItems!: Table<CachedItem, string>;
  cachedLocations!: Table<CachedLocation, string>;
  cachedInventory!: Table<CachedInventory, string>;

  constructor() {
    super('GlifeOfflineWarehouseDB');

    this.version(1).stores({
      pendingActions: '++id, tenantId, actionType, timestamp, synced',
      cachedItems: 'id, sku, upc, box_barcode',
      cachedLocations: 'code, zone_type',
      cachedInventory: 'id, location_code, item_id, sku',
    });
  }
}

// Singleton browser instance
export const offlineDb = typeof window !== 'undefined' ? new OfflineWarehouseDB() : (null as any);
