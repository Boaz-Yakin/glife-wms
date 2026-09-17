"use server"

import { createClient } from "@/lib/supabase/server"
import { getActiveClientAction } from "@/app/actions/client.actions"

export interface OrderData {
  id: string
  invoice_number: string | null
  store_id: number | null
  client_id: string | null
  order_date: string
  status: string
  invoice_amount: number
  note: string | null
  created_at: string
  
  // joined fields
  store?: { name: string } | null
}

export interface OrderItemData {
  id: string
  order_id: string
  item_id: string
  location_id: string | null
  uom: string
  price: number
  qty: number
  picked_qty: number
  picker_id: string | null
  picked_at: string | null
  status: string
  
  // joined fields
  item?: { name_en: string; sku: string } | null
  picker?: { email: string } | null
}

export async function getOrders({ page = 1, limit = 20, search = '', status = '' }) {
  const supabase = await createClient()
  let query = supabase.from('orders').select(`
    *,
    store:stores(name)
  `, { count: 'exact' })
  
  const activeClientId = await getActiveClientAction()
  if (activeClientId) {
    query = query.eq('client_id', activeClientId)
  }

  if (search) {
    query = query.or(`id.ilike.%${search}%,invoice_number.ilike.%${search}%`)
  }
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })
  
  if (error) {
    console.error('getOrders error:', error)
    return { data: [], count: 0, error: error.message }
  }
  
  return { data, count: count || 0, error: null }
}

export async function getOrderDetails(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('order_items').select(`
    *,
    item:items(name_en, sku),
    picker:users!picker_id(email)
  `).eq('order_id', orderId)
  
  if (error) {
    console.error('getOrderDetails error:', error)
    return { data: [], error: error.message }
  }
  
  return { data, error: null }
}
