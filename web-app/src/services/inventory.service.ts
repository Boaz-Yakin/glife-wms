import { createClient } from '@/lib/supabase/server'

export interface GetInventoryParams {
  page?: number
  limit?: number
  search?: string
  zone?: string
}

export async function getInventoryList({ page = 1, limit = 20, search = '', zone = 'ALL' }: GetInventoryParams) {
  const supabase = await createClient()
  
  // Note: Adjust the relation names (items/locations) based on your actual Supabase schema constraints
  let query = (supabase as any).from('inventory').select(`
    id,
    on_hand_qty,
    allocated_qty,
    updated_at,
    item:item_id ( sku, name ),
    location:location_id ( barcode, zone_type )
  `, { count: 'exact' })
  
  // Note: Supabase nested filtering might require adjusting the query depending on PostgREST version.
  // We'll perform basic filtering here.
  
  if (zone && zone !== 'ALL') {
    // This is a naive way, might need to filter on the top level if using inner joins in real setup
    query = query.eq('location_id.zone_type', zone) // Example, might need adjustment
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await query.range(from, to).order('updated_at', { ascending: false })
  
  if (error) {
    console.error('getInventoryList error:', error)
    // Return empty mock data on error for UI demonstration purposes
    return { data: [], count: 0, error: error.message }
  }
  
  return { data, count: count || 0, error: null }
}
