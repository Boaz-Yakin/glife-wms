import { createClient } from '@/lib/supabase/server';

export interface PalletSummarySlot {
  location_id: string;
  location_code: string;
  zone_type: string;
  stored_pallet_count: number;
  slot_status: string;
  batch_list: string | null;
  pallet_list: string | null;
}

export interface PalletItem {
  id: string;
  batch_no: string;
  pallet_no: string;
  status: string;
  operator_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  locations?: {
    code: string;
  } | null;
  clients?: {
    name: string;
    code: string;
  } | null;
}

export interface PalletStorageStats {
  totalSlots: number;
  occupiedSlots: number;
  emptySlots: number;
  occupancyRate: number;
  storedPalletCount: number;
  dailyStorageRate: number;
  monthlyEstimatedBilling: number;
}

export async function getWarehousePalletSummary(aisle?: number): Promise<{ data: PalletSummarySlot[]; error: string | null }> {
  try {
    const supabase = await createClient();
    let q = (supabase as any)
      .from('v_warehouse_summary')
      .select('*')
      .order('location_code', { ascending: true });

    if (aisle) {
      q = q.like('location_code', `${aisle}-%`);
    }

    const { data, error } = await q;
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPalletList(params?: {
  search?: string;
  batch?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PalletItem[]; totalCount: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = (supabase as any)
      .from('pallets')
      .select('id, batch_no, pallet_no, status, operator_name, notes, created_at, updated_at, locations(code), clients(name, code)', { count: 'exact' });

    if (params?.status && params.status !== 'ALL') {
      q = q.eq('status', params.status);
    } else {
      q = q.eq('status', 'STORED');
    }

    if (params?.batch) {
      q = q.ilike('batch_no', `%${params.batch.trim()}%`);
    }

    if (params?.search) {
      const s = params.search.trim();
      q = q.or(`batch_no.ilike.%${s}%,pallet_no.ilike.%${s}%,operator_name.ilike.%${s}%`);
    }

    q = q.order('updated_at', { ascending: false }).range(from, to);

    const { data, count, error } = await q;
    if (error) {
      return { data: [], totalCount: 0, error: error.message };
    }
    return { data: data || [], totalCount: count || 0, error: null };
  } catch (err: unknown) {
    return { data: [], totalCount: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPalletStorageStats(dailyRate = 0.85): Promise<PalletStorageStats> {
  const { data: slots } = await getWarehousePalletSummary();
  const totalSlots = slots.length || 768;
  const occupiedSlots = slots.filter((s) => s.slot_status === '보관중' || s.stored_pallet_count > 0).length;
  const emptySlots = Math.max(0, totalSlots - occupiedSlots);
  const occupancyRate = totalSlots > 0 ? parseFloat(((occupiedSlots / totalSlots) * 100).toFixed(1)) : 0;
  
  // Total actual pallets
  const storedPalletCount = slots.reduce((acc, s) => acc + (Number(s.stored_pallet_count) || 0), 0);
  const monthlyEstimatedBilling = parseFloat((storedPalletCount * dailyRate * 30).toFixed(2));

  return {
    totalSlots,
    occupiedSlots,
    emptySlots,
    occupancyRate,
    storedPalletCount,
    dailyStorageRate: dailyRate,
    monthlyEstimatedBilling,
  };
}
