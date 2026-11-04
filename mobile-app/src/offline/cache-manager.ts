import { offlineDb, CachedItem, CachedLocation, CachedInventory } from './db';
import { createClient } from '@/lib/supabase/client';

export class CacheManager {
  private static CACHE_EXPIRY_MS = 1000 * 60 * 60 * 12; // 12 hours

  /**
   * 서버로부터 마스터 데이터(품목, 로케이션, 기초재고)를 프리패치하여 IndexedDB에 동기화
   */
  static async prefetchMasterData(): Promise<{ itemsCount: number; locationsCount: number }> {
    if (!offlineDb || typeof window === 'undefined') {
      return { itemsCount: 0, locationsCount: 0 };
    }

    try {
      const supabase = createClient();
      const now = Date.now();

      // 1. Fetch Items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, sku, name_en, upc, box_barcode, zone_type, shelf_life_days, min_outbound_days')
        .eq('is_active', true);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const cachedItems: CachedItem[] = items.map((it: any) => ({
          id: it.id,
          sku: it.sku,
          name_en: it.name_en,
          upc: it.upc,
          box_barcode: it.box_barcode,
          zone_type: it.zone_type,
          shelf_life_days: it.shelf_life_days,
          min_outbound_days: it.min_outbound_days,
          cached_at: now,
        }));
        await offlineDb.cachedItems.bulkPut(cachedItems);
      }

      // 2. Fetch Locations
      const { data: locations, error: locsError } = await supabase
        .from('locations')
        .select('code, zone_type, pos_x, pos_y, temperature_zone');

      if (locsError) throw locsError;

      if (locations && locations.length > 0) {
        const cachedLocations: CachedLocation[] = locations.map((loc: any) => ({
          code: loc.code,
          zone_type: loc.zone_type,
          pos_x: loc.pos_x,
          pos_y: loc.pos_y,
          temperature_zone: loc.temperature_zone,
          cached_at: now,
        }));
        await offlineDb.cachedLocations.bulkPut(cachedLocations);
      }

      return {
        itemsCount: items?.length || 0,
        locationsCount: locations?.length || 0,
      };
    } catch (err) {
      console.warn('[CacheManager] Prefetch failed (offline or network error):', err);
      return { itemsCount: 0, locationsCount: 0 };
    }
  }

  /**
   * 바코드/UPC/SKU 코드로 로컬 캐시 품목 초고속 조회 (0.001초 응답)
   */
  static async findCachedItem(barcodeOrSku: string): Promise<CachedItem | null> {
    if (!offlineDb || typeof window === 'undefined') return null;

    const trimmed = barcodeOrSku.trim();

    // 1순위: UPC 단품 바코드
    let item = await offlineDb.cachedItems.where('upc').equals(trimmed).first();
    if (item) return item;

    // 2순위: Box Barcode 박스 바코드
    item = await offlineDb.cachedItems.where('box_barcode').equals(trimmed).first();
    if (item) return item;

    // 3순위: SKU 코드
    item = await offlineDb.cachedItems.where('sku').equals(trimmed).first();
    if (item) return item;

    // 4순위: 대소문자 무시 SKU
    item = await offlineDb.cachedItems
      .filter((it: CachedItem) => it.sku.toLowerCase() === trimmed.toLowerCase())
      .first();

    return item || null;
  }

  /**
   * 로케이션 코드로 로컬 캐시 조회
   */
  static async findCachedLocation(code: string): Promise<CachedLocation | null> {
    if (!offlineDb || typeof window === 'undefined') return null;
    const normalized = code.trim().toUpperCase();
    const loc = await offlineDb.cachedLocations.get(normalized);
    return loc || null;
  }

  /**
   * 오프라인 작업 시 로컬 가상 재고 즉각 가감 (작업자에게 실시간 잔여량 반영)
   */
  static async adjustLocalInventory(
    locationCode: string,
    itemId: string,
    deltaQty: number
  ): Promise<void> {
    if (!offlineDb || typeof window === 'undefined') return;

    const existing = await offlineDb.cachedInventory
      .where({ location_code: locationCode, item_id: itemId })
      .first();

    if (existing) {
      await offlineDb.cachedInventory.update(existing.id, {
        on_hand_qty: Math.max(0, existing.on_hand_qty + deltaQty),
        available_qty: Math.max(0, existing.available_qty + deltaQty),
        updated_at: Date.now(),
      });
    }
  }
}
