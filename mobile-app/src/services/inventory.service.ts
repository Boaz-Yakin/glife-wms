import type { SupabaseClient } from '@supabase/supabase-js';

export interface Location {
  id: string;
  code: string;
  zone_type: 'A' | 'F';
}

export interface InventoryRecord {
  id: string;
  item_id: string;
  location_id: string;
  on_hand_qty: number;
  allocated_qty: number;
}

export interface CycleCountRequest {
  id: string;
  location_id: string;
  item_id: string;
  priority: 'URGENT' | 'NORMAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reported_by: string;
  created_at: string;
  locations?: { code: string };
  items?: { sku: string; name_en: string; uom?: string };
}

export interface LocationLookupResult {
  location: {
    id: string;
    code: string;
    zone_type: string;
  };
  items: Array<{
    inventoryId: string;
    itemId: string;
    sku: string;
    name: string;
    upc: string;
    uom: string;
    onHandQty: number;
    allocatedQty: number;
    availableQty: number;
  }>;
}

export interface ItemLookupResult {
  item: {
    id: string;
    sku: string;
    name: string;
    upc: string;
    uom: string;
    category?: string;
  };
  locations: Array<{
    inventoryId: string;
    locationId: string;
    code: string;
    zone_type: string;
    onHandQty: number;
    allocatedQty: number;
    availableQty: number;
  }>;
}

/**
 * 로케이션 바코드/ID 기반 실데이터 재고 조회 (Real Database)
 */
export async function lookupByLocation(
  supabase: SupabaseClient,
  locationCodeOrId: string
): Promise<LocationLookupResult | null> {
  const cleanCode = locationCodeOrId.trim();

  // 1. Find location
  const { data: loc, error: locErr } = await supabase
    .from('locations')
    .select('id, code, zone_type')
    .or(`code.eq.${cleanCode},id.eq.${cleanCode}`)
    .maybeSingle();

  if (locErr || !loc) {
    return null;
  }

  // 2. Find inventory rows for this location
  const { data: invRows, error: invErr } = await supabase
    .from('inventory')
    .select(`
      id,
      item_id,
      on_hand_qty,
      allocated_qty,
      items:item_id ( id, sku, name_en, upc, uom, category )
    `)
    .eq('location_id', loc.id);

  if (invErr) {
    console.error('Error fetching inventory for location:', invErr);
    return {
      location: loc,
      items: [],
    };
  }

  const items = (invRows || []).map((row: any) => {
    const it = row.items || {};
    const onHand = row.on_hand_qty || 0;
    const allocated = row.allocated_qty || 0;
    return {
      inventoryId: row.id,
      itemId: row.item_id,
      sku: it.sku || 'SKU-UNKNOWN',
      name: it.name_en || 'Unnamed Item',
      upc: it.upc || '',
      uom: it.uom || 'BOX',
      onHandQty: onHand,
      allocatedQty: allocated,
      availableQty: Math.max(0, onHand - allocated),
    };
  });

  return {
    location: loc,
    items,
  };
}

/**
 * 상품 바코드/SKU/UPC 기반 실데이터 로케이션 적치 현황 조회 (Real Database)
 */
export async function lookupByItem(
  supabase: SupabaseClient,
  skuOrUpcOrId: string
): Promise<ItemLookupResult | null> {
  const clean = skuOrUpcOrId.trim();

  // 1. Find item by sku, upc, or id
  const { data: it, error: itErr } = await supabase
    .from('items')
    .select('id, sku, name_en, upc, uom, category')
    .or(`sku.ilike.%${clean}%,upc.eq.${clean},id.eq.${clean}`)
    .maybeSingle();

  if (itErr || !it) {
    return null;
  }

  // 2. Find inventory locations storing this item
  const { data: invRows, error: invErr } = await supabase
    .from('inventory')
    .select(`
      id,
      location_id,
      on_hand_qty,
      allocated_qty,
      locations:location_id ( id, code, zone_type )
    `)
    .eq('item_id', it.id);

  if (invErr) {
    console.error('Error fetching locations for item:', invErr);
    return {
      item: {
        id: it.id,
        sku: it.sku,
        name: it.name_en,
        upc: it.upc || '',
        uom: it.uom || 'BOX',
        category: it.category,
      },
      locations: [],
    };
  }

  const locations = (invRows || []).map((row: any) => {
    const loc = row.locations || {};
    const onHand = row.on_hand_qty || 0;
    const allocated = row.allocated_qty || 0;
    return {
      inventoryId: row.id,
      locationId: row.location_id,
      code: loc.code || 'LOC-UNKNOWN',
      zone_type: loc.zone_type || 'A',
      onHandQty: onHand,
      allocatedQty: allocated,
      availableQty: Math.max(0, onHand - allocated),
    };
  });

  return {
    item: {
      id: it.id,
      sku: it.sku,
      name: it.name_en,
      upc: it.upc || '',
      uom: it.uom || 'BOX',
      category: it.category,
    },
    locations,
  };
}

/**
 * 전체 로케이션 목록 반환 (Real Database)
 */
export async function getInventoryLocations(supabase: SupabaseClient): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, code, zone_type')
    .order('code', { ascending: true });

  if (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
  return data as Location[];
}

/**
 * 현장 재고 요약 집계 (Real Database)
 */
export async function getInventorySummary(supabase: SupabaseClient) {
  const [urgentRes, pendingRes, completedRes, locRes, itemRes] = await Promise.all([
    supabase.from('cycle_count_requests').select('*', { count: 'exact', head: true }).eq('priority', 'URGENT').eq('status', 'PENDING'),
    supabase.from('cycle_count_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('inventory_adjustments').select('*', { count: 'exact', head: true }),
    supabase.from('locations').select('*', { count: 'exact', head: true }),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  return {
    urgentCount: urgentRes.count || 0,
    pendingCount: pendingRes.count || 0,
    completedCount: completedRes.count || 0,
    totalLocations: locRes.count || 0,
    totalItems: itemRes.count || 0,
  };
}

/**
 * 실사(Inspection) 또는 조정 시 재고 수량 변경 RPC 호출 (Real Database)
 */
export async function adjustInventoryStock(
  supabase: SupabaseClient,
  inventoryId: string,
  newQty: number,
  userId: string,
  reason: string,
  requestId?: string
) {
  const { error } = await supabase.rpc('adjust_inventory_stock', {
    p_inventory_id: inventoryId,
    p_new_qty: newQty,
    p_user_id: userId,
    p_reason: reason,
  });

  if (error) {
    console.error('Error adjusting inventory stock:', error);
    throw error;
  }

  if (requestId) {
    const { error: reqError } = await supabase
      .from('cycle_count_requests')
      .update({
        status: 'COMPLETED',
        completed_by: userId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (reqError) {
      console.error('Error completing cycle count request:', reqError);
    }
  }

  return true;
}

/**
 * 로케이션 간 재고 이동 (Bin-to-Bin Transfer)
 */
export async function transferInventoryStock(
  supabase: SupabaseClient,
  fromLocationId: string,
  toLocationId: string,
  itemId: string,
  qty: number,
  operatorId: string
) {
  // 1. Verify source inventory
  const { data: sourceInv, error: srcErr } = await supabase
    .from('inventory')
    .select('id, on_hand_qty, allocated_qty')
    .eq('location_id', fromLocationId)
    .eq('item_id', itemId)
    .single();

  if (srcErr || !sourceInv) {
    throw new Error('Item does not exist at source location.');
  }

  const available = sourceInv.on_hand_qty - sourceInv.allocated_qty;
  if (qty > available) {
    throw new Error(`Insufficient available stock (Available: ${available}, Requested: ${qty}).`);
  }

  // 2. Reduce source inventory
  const { error: updateSrcErr } = await supabase
    .from('inventory')
    .update({ on_hand_qty: sourceInv.on_hand_qty - qty, updated_at: new Date().toISOString() })
    .eq('id', sourceInv.id);

  if (updateSrcErr) throw updateSrcErr;

  // 3. Increase target inventory (upsert)
  const { data: targetInv } = await supabase
    .from('inventory')
    .select('id, on_hand_qty')
    .eq('location_id', toLocationId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (targetInv) {
    const { error: updateTgtErr } = await supabase
      .from('inventory')
      .update({ on_hand_qty: targetInv.on_hand_qty + qty, updated_at: new Date().toISOString() })
      .eq('id', targetInv.id);
    if (updateTgtErr) throw updateTgtErr;
  } else {
    const { error: insertTgtErr } = await supabase
      .from('inventory')
      .insert({
        location_id: toLocationId,
        item_id: itemId,
        on_hand_qty: qty,
        allocated_qty: 0,
      });
    if (insertTgtErr) throw insertTgtErr;
  }

  // 4. Log transfer into inventory_adjustments
  await supabase.from('inventory_adjustments').insert([
    {
      inventory_id: sourceInv.id,
      adjusted_by: operatorId,
      previous_qty: sourceInv.on_hand_qty,
      new_qty: sourceInv.on_hand_qty - qty,
      reason: `BIN_TRANSFER: Moved ${qty} to location ${toLocationId}`,
    },
  ]);

  return { success: true, movedQty: qty };
}

/**
 * 대기 중인 실사 큐 목록 반환 (Real Database)
 */
export async function getPendingCycleCountQueue(
  supabase: SupabaseClient,
  status: string = 'PENDING'
): Promise<CycleCountRequest[]> {
  const { data, error } = await supabase
    .from('cycle_count_requests')
    .select(`
      id,
      location_id,
      item_id,
      priority,
      status,
      reported_by,
      created_at,
      locations:location_id ( code ),
      items:item_id ( sku, name_en, uom )
    `)
    .eq('status', status)
    .order('priority', { ascending: false }) // URGENT first
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cycle count queue:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    location_id: row.location_id,
    item_id: row.item_id,
    priority: row.priority || 'NORMAL',
    status: row.status,
    reported_by: row.reported_by,
    created_at: row.created_at,
    locations: row.locations ? { code: row.locations.code } : undefined,
    items: row.items
      ? {
          sku: row.items.sku,
          name_en: row.items.name_en,
          uom: row.items.uom,
        }
      : undefined,
  })) as CycleCountRequest[];
}

/**
 * 피킹 중 결품(CMD-SKIP) 발생 시 긴급 실사 요청 생성
 */
export async function reportPickingShortage(
  supabase: SupabaseClient,
  locationId: string,
  itemId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('cycle_count_requests')
    .insert([
      {
        location_id: locationId,
        item_id: itemId,
        priority: 'URGENT',
        status: 'PENDING',
        reported_by: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error reporting picking shortage:', error);
    throw error;
  }
  return data;
}
