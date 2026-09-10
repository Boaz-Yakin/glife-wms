import { supabase } from './supabase.client';

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
  items?: { sku: string; name: string };
}

/**
 * 재고 및 로케이션 정보 조회
 */
export async function getInventoryLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('*');
    
  if (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
  return data as Location[];
}

/**
 * 실사(Inspection) 또는 조정 시 재고 수량 변경 RPC 호출
 */
export async function adjustInventoryStock(
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
    p_reason: reason
  });
  
  if (error) {
    console.error('Error adjusting inventory stock:', error);
    throw error;
  }

  // If a request ID is provided, mark it as completed
  if (requestId) {
    const { error: reqError } = await supabase
      .from('cycle_count_requests')
      .update({
        status: 'COMPLETED',
        completed_by: userId,
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId);
      
    if (reqError) {
      console.error('Error completing cycle count request:', reqError);
      // We don't throw here to avoid failing the stock adjustment if the request update fails
    }
  }

  return true;
}

/**
 * 대기 중인 실사 큐 목록 반환
 */
export async function getPendingCycleCountQueue(status: string = 'PENDING') {
  const { data, error } = await supabase
    .from('cycle_count_requests')
    .select(`
      *,
      locations:location_id ( code ),
      items:item_id ( sku, name )
    `)
    .eq('status', status)
    .order('priority', { ascending: false }) // URGENT first
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cycle count queue:', error);
    throw error;
  }
  return data as CycleCountRequest[];
}

/**
 * 피킹 중 결품(CMD-SKIP) 발생 시 긴급 실사 요청 생성
 */
export async function reportPickingShortage(locationId: string, itemId: string, userId: string) {
  const { data, error } = await supabase
    .from('cycle_count_requests')
    .insert([
      {
        location_id: locationId,
        item_id: itemId,
        priority: 'URGENT',
        status: 'PENDING',
        reported_by: userId
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error reporting picking shortage:', error);
    throw error;
  }
  return data;
}
