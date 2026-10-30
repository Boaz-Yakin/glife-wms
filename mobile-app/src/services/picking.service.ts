import type { SupabaseClient } from '@supabase/supabase-js';
import { formatItemNameWithDesc } from './inventory.service';

export interface Order {
  id: string;
  order_number: string;
  status: 'PENDING' | 'ALLOCATED' | 'PICKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  priority: 'URGENT' | 'NORMAL';
  store_id: string;
  created_at: string;
  stores?: {
    name: string;
  };
}

/**
 * 피킹 대기/진행 중인 활성 주문 목록 조회 (Real Database)
 */
export async function getAllocatedOrders(supabase: SupabaseClient): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_no,
      status,
      created_at,
      store_id,
      stores:store_id ( name )
    `)
    .in('status', ['PENDING', 'PICKING', 'ALLOCATED'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database query error for active orders:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((o: any) => ({
    id: o.id,
    order_number: o.order_no || 'ORD-UNKNOWN',
    status: o.status,
    priority: 'NORMAL',
    store_id: o.store_id,
    created_at: o.created_at,
    stores: o.stores ? { name: o.stores.name } : undefined,
  })) as Order[];
}

export interface PickingItem {
  id: string;
  order_id: string;
  item_id: string;
  qty: number;
  picked_qty: number;
  status: 'PENDING' | 'PICKED' | 'SKIPPED';
  locations?: {
    id: string;
    code: string;
    zone: string;
    aisle: number;
    bay: number;
    level: string;
    bin: number;
  };
  items?: {
    sku: string;
    name: string;
    desc?: string;
    upc: string;
  };
}

/**
 * 표준 로케이션 바코드(LOC-A0105B01)를 파싱하여 좌표 객체로 반환
 */
function parseLocationCoordinates(locId: string, code: string, zoneType?: string) {
  // Pattern: LOC-Zone(1)Aisle(2)Bay(2)Level(1)Bin(2) e.g. LOC-A0105B01
  const match = code.match(/^LOC-([A-Z])(\d{2})(\d{2})([A-Z])(\d{2})$/i);
  if (match) {
    return {
      id: locId,
      code,
      zone: match[1].toUpperCase(),
      aisle: parseInt(match[2], 10),
      bay: parseInt(match[3], 10),
      level: match[4].toUpperCase(),
      bin: parseInt(match[5], 10),
    };
  }
  return {
    id: locId,
    code,
    zone: zoneType || 'A',
    aisle: 1,
    bay: 1,
    level: 'A',
    bin: 1,
  };
}

/**
 * 특정 주문의 피킹 품목 조회 및 S-Shape / Cold Chain 정렬 (Real Database)
 */
export async function getOrderPickingItems(supabase: SupabaseClient, orderId: string): Promise<PickingItem[]> {
  // 1. Fetch real order_items
  const { data: rawItems, error } = await supabase
    .from('order_items')
    .select(`
      id,
      order_id,
      item_id,
      qty,
      picked_qty,
      items:item_id ( id, sku, name_en, desc_en, upc, category, zone_type )
    `)
    .eq('order_id', orderId);

  if (error || !rawItems || rawItems.length === 0) {
    if (error) console.error('Database query failed for order_items:', error);
    return [];
  }

  // 2. Fetch inventory locations for the items in this order
  const itemIds = rawItems.map((ri: any) => ri.item_id).filter(Boolean);
  const { data: invRows } = await supabase
    .from('inventory')
    .select(`
      item_id,
      location_id,
      on_hand_qty,
      locations:location_id ( id, code, zone_type )
    `)
    .in('item_id', itemIds);

  // Map of item_id -> first available location with stock
  const locByItem = new Map<string, any>();
  if (invRows) {
    for (const inv of invRows) {
      if (inv.locations && (!locByItem.has(inv.item_id) || inv.on_hand_qty > 0)) {
        locByItem.set(inv.item_id, inv.locations);
      }
    }
  }

  // 3. Build PickingItem objects
  const items: PickingItem[] = rawItems.map((row: any) => {
    const itemData = row.items;
    const locData = locByItem.get(row.item_id);

    return {
      id: row.id,
      order_id: row.order_id,
      item_id: row.item_id,
      qty: row.qty || 1,
      picked_qty: row.picked_qty || 0,
      status: row.picked_qty && row.picked_qty >= row.qty ? 'PICKED' : 'PENDING',
      locations: locData
        ? parseLocationCoordinates(locData.id, locData.code, locData.zone_type)
        : {
            id: 'unassigned',
            code: 'LOC-A0101A01',
            zone: itemData?.zone_type || 'A',
            aisle: 1,
            bay: 1,
            level: 'A',
            bin: 1,
          },
      items: itemData
        ? {
            sku: itemData.sku || 'SKU-UNKNOWN',
            name: formatItemNameWithDesc(itemData.name_en, itemData.desc_en),
            desc: itemData.desc_en || '',
            upc: itemData.upc || '',
          }
        : { sku: 'SKU-UNKNOWN', name: 'Unknown Item', upc: '' },
    };
  });

  // 4. S-Shape & Cold Chain 정렬 알고리즘
  items.sort((a, b) => {
    const locA = a.locations;
    const locB = b.locations;

    if (!locA) return 1;
    if (!locB) return -1;

    // 1. Cold Chain Gate: Zone A(상온) 우선, Zone F(냉동) 나중
    if (locA.zone !== locB.zone) {
      return locA.zone.localeCompare(locB.zone);
    }

    // 2. Aisle (통로): 오름차순
    if (locA.aisle !== locB.aisle) {
      return locA.aisle - locB.aisle;
    }

    // 3. S-Shape (Bay): 통로가 홀수면 오름차순, 짝수면 내림차순
    if (locA.bay !== locB.bay) {
      const isOddAisle = locA.aisle % 2 !== 0;
      return isOddAisle ? locA.bay - locB.bay : locB.bay - locA.bay;
    }

    // 4. Level (단): 오름차순
    if (locA.level !== locB.level) {
      return locA.level.localeCompare(locB.level);
    }

    // 5. Bin (칸): 오름차순
    return locA.bin - locB.bin;
  });

  return items;
}

/**
 * 피킹 완료 확정 및 상태 갱신 (Real Database)
 */
export async function completeOrderPicking(
  supabase: SupabaseClient,
  orderId: string,
  pickerId: string,
  targetStatus: 'PACKED' | 'SHIPPED' = 'PACKED'
): Promise<{ success: boolean; orderId: string; status: string }> {
  // 1. Mark all pending order_items as fully picked
  const { data: items } = await supabase
    .from('order_items')
    .select('id, qty, picked_qty')
    .eq('order_id', orderId);

  if (items && items.length > 0) {
    for (const it of items) {
      if ((it.picked_qty || 0) < it.qty) {
        await supabase
          .from('order_items')
          .update({ picked_qty: it.qty, updated_at: new Date().toISOString() })
          .eq('id', it.id);
      }
    }
  }

  // 2. Update order status to targetStatus (PACKED / SHIPPED)
  const { error: orderErr } = await supabase
    .from('orders')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (orderErr) {
    throw new Error(orderErr.message || 'Failed to update order status');
  }

  return { success: true, orderId, status: targetStatus };
}
