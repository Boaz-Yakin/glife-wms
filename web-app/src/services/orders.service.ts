"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveClientAction } from "@/app/actions/client.actions"

const getClient = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceKey && supabaseUrl) {
    return createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return await createServerClient()
}

export interface OrderData {
  id: string
  order_no?: string | null
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
  location_id?: string | null
  uom: string
  price: number
  qty: number
  discount_rate?: number
  is_taxable?: boolean
  created_at?: string
  
  // joined fields
  item?: {
    name_en: string
    desc_en?: string | null
    sku: string
    uom?: string | null
    unit_price?: number | null
    box_price?: number | null
    pack_price?: number | null
  } | null
}

/**
 * Calculates the effective unit price for an order line item based on its UOM.
 * - BOX: uses item.box_price (fallback: item.unit_price)
 * - PACK: uses item.pack_price || item.box_price (fallback: item.unit_price)
 * - EA: uses item.unit_price (fallback: orderItem.price)
 */
export function getOrderItemEffectivePrice(orderItem: {
  uom?: string | null
  price?: number | null
  item?: {
    uom?: string | null
    unit_price?: number | null
    box_price?: number | null
    pack_price?: number | null
  } | null
}): number {
  const itemData = orderItem.item
  const uom = (itemData?.uom || orderItem.uom || '').trim().toUpperCase()

  if (uom === 'BOX') {
    const boxPrice = Number(itemData?.box_price ?? 0)
    if (boxPrice > 0) return boxPrice
  } else if (uom === 'PACK') {
    const packPrice = Number(itemData?.pack_price ?? 0) || Number(itemData?.box_price ?? 0)
    if (packPrice > 0) return packPrice
  } else if (uom === 'EA') {
    const unitPrice = Number(itemData?.unit_price ?? 0)
    if (unitPrice > 0) return unitPrice
  }

  // Fallback if specific UOM price wasn't matched or is 0
  if (itemData?.unit_price && Number(itemData.unit_price) > 0) {
    return Number(itemData.unit_price)
  }
  return Number(orderItem.price || 0)
}

export async function getOrders({ page = 1, limit = 20, search = '', status = '' }) {
  const supabase = await getClient()
  let query = supabase.from('orders').select(`
    *,
    store:stores(name),
    order_items(
      qty,
      price,
      uom,
      item:items(uom, unit_price, box_price, pack_price)
    )
  `, { count: 'exact' })
  
  const activeClientId = await getActiveClientAction()
  if (activeClientId) {
    query = query.eq('client_id', activeClientId)
  }

  if (search) {
    query = query.or(`id.ilike.%${search}%,order_no.ilike.%${search}%,shipping_address.ilike.%${search}%`)
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

  const formattedData = (data || []).map((order: any) => {
    const itemsTotal = (order.order_items || []).reduce(
      (sum: number, item: any) => {
        const effectivePrice = getOrderItemEffectivePrice(item)
        return sum + (Number(item.qty || 0) * effectivePrice)
      },
      0
    )
    const tax = Number(order.tax_amount || 0)
    const discount = Number(order.discount_amount || 0)
    const total = Math.max(0, itemsTotal + tax - discount)
    return {
      ...order,
      invoice_amount: total,
    }
  })
  
  return { data: formattedData, count: count || 0, error: null }
}

export async function getOrderDetails(orderId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('order_items').select(`
    *,
    item:items(name_en, desc_en, sku, uom, unit_price, box_price, pack_price)
  `).eq('order_id', orderId)
  
  if (error) {
    console.error('getOrderDetails error:', error)
    return { data: [], error: error.message }
  }
  
  return { data, error: null }
}

