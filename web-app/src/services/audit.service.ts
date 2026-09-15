import { createClient } from '@/lib/supabase/server'

export interface GetAuditParams {
  page?: number
  limit?: number
  reason?: string
}

export async function getInventoryAudit({ page = 1, limit = 20, reason = '' }: GetAuditParams) {
  const supabase = await createClient()
  
  let query = (supabase as any).from('inventory_adjustments').select(`
    id,
    previous_qty,
    new_qty,
    reason,
    created_at,
    adjusted_by,
    inventory:inventory_id (
      item:item_id (sku, name),
      location:location_id (barcode)
    )
  `, { count: 'exact' })
  
  if (reason && reason !== 'ALL') {
    query = query.eq('reason', reason)
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
  
  if (error) {
    console.error('getInventoryAudit error:', error)
    return { data: [], count: 0, error: error.message }
  }
  
  return { data, count: count || 0, error: null }
}
