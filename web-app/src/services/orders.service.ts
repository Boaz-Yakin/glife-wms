import { createClient } from '@/lib/supabase/server'

export interface GetOrdersParams {
  page?: number
  limit?: number
  status?: string
}

export async function getOrdersList({ page = 1, limit = 20, status = 'ALL' }: GetOrdersParams) {
  const supabase = await createClient()
  
  let query = (supabase as any).from('orders').select(`
    id,
    status,
    created_at,
    updated_at
  `, { count: 'exact' })
  
  if (status && status !== 'ALL') {
    query = query.eq('status', status)
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
  
  if (error) {
    console.error('getOrdersList error:', error)
    return { data: [], count: 0, error: error.message }
  }
  
  // In a real app we might fetch order_items count or details here, 
  // or use a joined view to keep pagination accurate.
  
  return { data, count: count || 0, error: null }
}
