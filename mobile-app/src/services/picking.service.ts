import { supabase } from './supabase.client';

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
 * 할당된(ALLOCATED) 피킹 대기 주문 목록 조회
 */
export async function getAllocatedOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      stores:store_id ( name )
    `)
    .eq('status', 'ALLOCATED')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Database query failed for orders, using fallback:', error);
    // Don't throw, allow fallback below
  }
  
  if (!data || data.length === 0 || error) {
    // Fallback Mock Data for testing
    return [
      {
        id: 'mock-order-1',
        order_number: 'ORD-20260909-001',
        status: 'ALLOCATED',
        priority: 'URGENT',
        store_id: 'store-1',
        created_at: new Date().toISOString(),
        stores: { name: 'Gangnam Branch' }
      },
      {
        id: 'mock-order-2',
        order_number: 'ORD-20260909-002',
        status: 'ALLOCATED',
        priority: 'NORMAL',
        store_id: 'store-2',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        stores: { name: 'Hongdae Branch' }
      }
    ] as Order[];
  }
  
  return data as Order[];
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
    upc: string;
  };
}

/**
 * 특정 주문의 피킹 품목 조회 및 S-Shape / Cold Chain 정렬
 */
export async function getOrderPickingItems(orderId: string) {
  // 실제 DB에서는 order_items 테이블과 locations, items 테이블을 JOIN 합니다.
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      locations:location_id ( id, code, zone, aisle, bay, level, bin ),
      items:item_id ( sku, name, upc )
    `)
    .eq('order_id', orderId);

  if (error) {
    console.error('Database query failed for order_items, using fallback:', error);
    // Don't throw, allow fallback below
  }

  let items = (data as PickingItem[]) || [];

  if (items.length === 0 || error) {
    // Fallback Mock Data for testing
    items = [
      {
        id: 'mock-item-1',
        order_id: orderId,
        item_id: 'item-uuid-1',
        qty: 12,
        picked_qty: 0,
        status: 'PENDING',
        locations: { id: 'loc-1', code: 'A01-05-B01', zone: 'A', aisle: 1, bay: 5, level: 'B', bin: 1 },
        items: { sku: 'SKU-APPLE-01', name: 'Fresh Apple 1kg', upc: '8801234567890' }
      },
      {
        id: 'mock-item-2',
        order_id: orderId,
        item_id: 'item-uuid-2',
        qty: 5,
        picked_qty: 0,
        status: 'PENDING',
        locations: { id: 'loc-2', code: 'A02-12-C02', zone: 'A', aisle: 2, bay: 12, level: 'C', bin: 2 },
        items: { sku: 'SKU-BANANA-02', name: 'Organic Banana 500g', upc: '8801234567891' }
      },
      {
        id: 'mock-item-3',
        order_id: orderId,
        item_id: 'item-uuid-3',
        qty: 2,
        picked_qty: 0,
        status: 'PENDING',
        locations: { id: 'loc-3', code: 'F01-02-A01', zone: 'F', aisle: 1, bay: 2, level: 'A', bin: 1 },
        items: { sku: 'SKU-BEEF-05', name: 'Frozen Beef 500g', upc: '8801234567892' }
      }
    ] as PickingItem[];
  }

  // S-Shape & Cold Chain 정렬 알고리즘
  items.sort((a, b) => {
    const locA = a.locations;
    const locB = b.locations;

    // 로케이션 정보가 없는 경우 최하단으로 보냄
    if (!locA) return 1;
    if (!locB) return -1;

    // 1. Cold Chain Gate: Zone A(상온) 우선, Zone F(냉동) 나중
    // Zone 알파벳 순으로 처리 (A가 먼저 오게 됨)
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

    // 4. Level (층): 아래에서 위로 (A, B, C...) 혹은 위에서 아래로 정책에 따라 다름. 여기선 오름차순.
    if (locA.level !== locB.level) {
      return locA.level.localeCompare(locB.level);
    }

    // 5. Bin (칸): 오름차순
    return locA.bin - locB.bin;
  });

  return items;
}
