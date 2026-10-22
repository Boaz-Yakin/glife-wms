import { createClient } from '@/lib/supabase/server'
import { getActiveClientAction } from '@/app/actions/client.actions'

export interface GetInventoryParams {
  page?: number
  limit?: number
  search?: string
  zone?: string
}

export async function getInventoryList({ page = 1, limit = 20, search = '', zone = 'ALL' }: GetInventoryParams) {
  const supabase = await createClient()

  const locationJoin = (zone && zone !== 'ALL') ? '!inner' : ''
  const itemJoin = search ? '!inner' : ''
  
  let query = (supabase as any).from('inventory').select(`
    id,
    on_hand_qty,
    allocated_qty,
    updated_at,
    item:item_id${itemJoin} ( sku, name_en ),
    location:location_id${locationJoin} ( code, zone_type )
  `, { count: 'exact' })
  
  const activeClientId = await getActiveClientAction()
  if (activeClientId) {
    query = query.or(`client_id.eq.${activeClientId},client_id.is.null`)
  }

  // Only display active inventory slots (on-hand > 0 or allocated > 0)
  query = query.or('on_hand_qty.gt.0,allocated_qty.gt.0')

  if (zone && zone !== 'ALL') {
    query = query.eq('location.zone_type', zone)
  }

  if (search) {
    query = query.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%`, { foreignTable: 'item' })
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await query.range(from, to).order('updated_at', { ascending: false })
  
  if (error) {
    console.error('getInventoryList error:', error)
    return { data: [], count: 0, error: error.message }
  }
  
  return { data, count: count || 0, error: null }
}

