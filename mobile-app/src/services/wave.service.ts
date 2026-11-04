import type { SupabaseClient } from '@supabase/supabase-js';
import { optimizePickingTour } from '@/lib/routing/tsp-picker';

export interface ToteDistribution {
  tote_no: number;
  tote_barcode: string;
  order_id: string;
  store_name: string;
  qty: number;
}

export interface WaveConsolidatedPickItem {
  id: string;
  item_id: string;
  sku: string;
  name: string;
  upc: string;
  uom: string;
  total_qty: number;
  status: 'PENDING' | 'PICKED' | 'SKIPPED';
  locations?: {
    id: string;
    code: string;
    zone: string;
    aisle: number;
    bay: number;
    level: string;
    bin: number;
    pos_x?: number | null;
    pos_y?: number | null;
    rotation?: number | null;
    temperature_zone?: string | null;
  };
  tote_distributions: ToteDistribution[];
}

export interface MobileWave {
  id: string;
  wave_no: string;
  name: string;
  status: string;
  zone_type: string;
  total_orders: number;
  total_items: number;
  total_qty: number;
  picked_qty: number;
  created_at: string;
  totes?: Array<{
    tote_no: number;
    tote_barcode: string;
    store_name: string;
  }>;
}

/**
 * 현장 피커를 위한 출고 대기 파동 목록 조회
 */
export async function getReleasedWaves(supabase: SupabaseClient): Promise<MobileWave[]> {
  const { data, error } = await supabase
    .from('picking_waves')
    .select(`
      id,
      wave_no,
      name,
      status,
      zone_type,
      total_orders,
      total_items,
      total_qty,
      picked_qty,
      created_at,
      wave_orders (
        tote_no,
        tote_barcode,
        order:orders (
          store:stores (name)
        )
      )
    `)
    .in('status', ['RELEASED', 'PICKING'])
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getReleasedWaves error:', error);
    return [];
  }

  return data.map((w: any) => ({
    id: w.id,
    wave_no: w.wave_no,
    name: w.name,
    status: w.status,
    zone_type: w.zone_type || 'ALL',
    total_orders: w.total_orders || 0,
    total_items: w.total_items || 0,
    total_qty: w.total_qty || 0,
    picked_qty: w.picked_qty || 0,
    created_at: w.created_at,
    totes: (w.wave_orders || []).map((wo: any) => ({
      tote_no: wo.tote_no,
      tote_barcode: wo.tote_barcode,
      store_name: wo.order?.store?.name || `Tote ${wo.tote_no}`,
    })),
  }));
}
