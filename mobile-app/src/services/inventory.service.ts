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

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Robust location finder supporting:
 * - Direct UUID
 * - Exact code: 'LOC-A0105A01'
 * - Without LOC- prefix: 'A0105A01'
 * - Human-readable format: 'A01-05-A01'
 * - Case-insensitive trimmed input
 */
export async function findLocationRecord(
  supabase: SupabaseClient,
  codeOrId: string
): Promise<{ id: string; code: string; zone_type: string } | null> {
  const clean = codeOrId.trim().toUpperCase();
  if (!clean) return null;

  if (isUUID(clean)) {
    const { data } = await supabase
      .from('locations')
      .select('id, code, zone_type')
      .eq('id', clean)
      .maybeSingle();
    return data;
  }

  const variants = new Set<string>();
  variants.add(clean);
  if (clean.startsWith('LOC-')) {
    variants.add(clean.replace(/^LOC-/, ''));
  } else {
    variants.add(`LOC-${clean}`);
  }

  // Handle unhyphenated vs hyphenated: A01-05-A01 <-> A0105A01
  const unhyphenated = clean.replace(/-/g, '');
  variants.add(unhyphenated);
  variants.add(`LOC-${unhyphenated.replace(/^LOC/, '')}`);

  const { data, error } = await supabase
    .from('locations')
    .select('id, code, zone_type')
    .in('code', Array.from(variants))
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0];
}

/**
 * Robust item finder supporting:
 * - Direct UUID
 * - Exact UPC match
 * - Case-insensitive SKU match (exact or partial)
 */
export async function findItemRecord(
  supabase: SupabaseClient,
  skuOrUpcOrId: string
): Promise<{ id: string; sku: string; name_en: string; upc: string; uom: string; category?: string } | null> {
  const clean = skuOrUpcOrId.trim();
  if (!clean) return null;

  if (isUUID(clean)) {
    const { data } = await supabase
      .from('items')
      .select('id, sku, name_en, upc, uom, category')
      .eq('id', clean)
      .maybeSingle();
    return data;
  }

  // 1. Try exact UPC match
  const { data: byUpc } = await supabase
    .from('items')
    .select('id, sku, name_en, upc, uom, category')
    .eq('upc', clean)
    .maybeSingle();
  if (byUpc) return byUpc;

  // 2. Try exact or case-insensitive SKU match
  const { data: bySku } = await supabase
    .from('items')
    .select('id, sku, name_en, upc, uom, category')
    .ilike('sku', clean)
    .maybeSingle();
  if (bySku) return bySku;

  return null;
}

/**
 * 로케이션 바코드/ID 기반 실데이터 재고 조회 (Real Database)
 */
export async function lookupByLocation(
  supabase: SupabaseClient,
  locationCodeOrId: string
): Promise<LocationLookupResult | null> {
  const loc = await findLocationRecord(supabase, locationCodeOrId);
  if (!loc) {
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
  const it = await findItemRecord(supabase, skuOrUpcOrId);
  if (!it) {
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

export interface PutAwayParams {
  locationCodeOrId: string;
  itemCodeOrId: string;
  qty: number;
  operatorId: string;
  reason?: string;
}

export interface PutAwayResult {
  inventoryId: string;
  locationId: string;
  locationCode: string;
  itemId: string;
  sku: string;
  name: string;
  uom: string;
  previousQty: number;
  newQty: number;
  allocatedQty: number;
}

/**
 * 간이 입고 적치 및 초기 재고 설정 (Put-away & Initial Stock In)
 */
export async function putAwayStock(
  supabase: SupabaseClient,
  params: PutAwayParams
): Promise<PutAwayResult> {
  const { locationCodeOrId, itemCodeOrId, qty, operatorId, reason } = params;

  if (qty <= 0) {
    throw new Error('Quantity to put away must be greater than zero.');
  }

  // 1. Validate location
  const loc = await findLocationRecord(supabase, locationCodeOrId);
  if (!loc) {
    throw new Error(`Location not found: "${locationCodeOrId}"`);
  }

  // 2. Validate item
  const itm = await findItemRecord(supabase, itemCodeOrId);
  if (!itm) {
    throw new Error(`Item not found: "${itemCodeOrId}"`);
  }

  // 3. Find or create inventory row
  const { data: existingInv } = await supabase
    .from('inventory')
    .select('id, on_hand_qty, allocated_qty')
    .eq('location_id', loc.id)
    .eq('item_id', itm.id)
    .maybeSingle();

  let inventoryId: string;
  let previousQty = 0;
  let allocatedQty = 0;
  let newQty = qty;

  if (existingInv) {
    inventoryId = existingInv.id;
    previousQty = existingInv.on_hand_qty || 0;
    allocatedQty = existingInv.allocated_qty || 0;
    newQty = previousQty + qty;

    const { error: updErr } = await supabase
      .from('inventory')
      .update({ on_hand_qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', inventoryId);

    if (updErr) throw new Error(updErr.message || 'Failed to update inventory quantity');
  } else {
    previousQty = 0;
    allocatedQty = 0;
    newQty = qty;

    const { data: newInv, error: insErr } = await supabase
      .from('inventory')
      .insert({
        location_id: loc.id,
        item_id: itm.id,
        on_hand_qty: newQty,
        allocated_qty: 0,
      })
      .select('id')
      .single();

    if (insErr) throw new Error(insErr.message || 'Failed to insert inventory record');
    if (!newInv) throw new Error('Failed to insert inventory record: no record returned');
    inventoryId = newInv.id;
  }

  // 4. Log adjustment
  const { error: adjErr } = await supabase.from('inventory_adjustments').insert([
    {
      inventory_id: inventoryId,
      adjusted_by: operatorId,
      previous_qty: previousQty,
      new_qty: newQty,
      reason: reason || `PUT_AWAY: Stored ${qty} ${itm.uom || 'units'} into ${loc.code}`,
    },
  ]);
  if (adjErr) {
    console.warn('Inventory adjustment log notice:', adjErr.message);
  }

  return {
    inventoryId,
    locationId: loc.id,
    locationCode: loc.code,
    itemId: itm.id,
    sku: itm.sku,
    name: itm.name_en,
    uom: itm.uom || 'BOX',
    previousQty,
    newQty,
    allocatedQty,
  };
}

