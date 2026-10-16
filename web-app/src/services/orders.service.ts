"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveClientAction } from "@/app/actions/client.actions"
import { getOrderItemEffectivePrice } from "@/lib/pricing"
import { validateInvoiceDate } from "@/lib/date"

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
  invoice_date?: string | null
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
  picked_qty?: number | null
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

export async function getOrders({ page = 1, limit = 20, search = '', status = '' }) {
  const supabase = await getClient()
  let query = supabase.from('orders').select(`
    *,
    store:stores(name),
    order_items(
      qty,
      picked_qty,
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
        const effectivePrice = Number(item.price || getOrderItemEffectivePrice(item))
        const effectiveQty = item.picked_qty != null ? Number(item.picked_qty) : Number(item.qty || 0)
        return sum + (effectiveQty * effectivePrice)
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
  `).eq('order_id', orderId).order('created_at', { ascending: true })
  
  if (error) {
    console.error('getOrderDetails error:', error)
    return { data: [], error: error.message }
  }
  
  return { data, error: null }
}

export interface UpdateOrderItemInput {
  id: string
  qty: number
  uom: string
  price: number
}

export interface NewOrderItemInput {
  item_id?: string | null
  custom_item_name?: string | null
  qty: number
  uom: string
  price: number
}

export interface UpdateOrderPayload {
  orderId: string
  orderDate?: string
  /** undefined: 변경 없음 / null: NULL로 초기화 / "YYYY-MM-DD": 설정 (TRD 6.3) */
  invoiceDate?: string | null
  itemsToUpdate?: UpdateOrderItemInput[]
  itemsToAdd?: NewOrderItemInput[]
  itemIdsToDelete?: string[]
}

export async function updateOrder(payload: UpdateOrderPayload) {
  const supabase = await getClient()
  const { orderId, orderDate, invoiceDate, itemsToUpdate, itemsToAdd, itemIdsToDelete } = payload
  const isInvoiceDateChanged = invoiceDate !== undefined

  // 1. Update order header (order_date / invoice_date) if provided
  if (orderDate || isInvoiceDateChanged) {
    // 1-1. 모든 쓰기 이전에 날짜 규칙 검증 (invoice_date >= order_date, NY 기준 날짜)
    const { data: current, error: currentErr } = await (supabase as any)
      .from('orders')
      .select('order_date, created_at, invoice_date')
      .eq('id', orderId)
      .maybeSingle()

    if (currentErr || !current) {
      console.error('updateOrder fetch header error:', currentErr)
      return { success: false, error: currentErr?.message || 'Order not found' }
    }

    const effectiveOrderDate: string | null = orderDate || current.order_date || current.created_at
    const effectiveInvoiceDate: string | null = isInvoiceDateChanged
      ? invoiceDate || null
      : current.invoice_date

    const validationError = validateInvoiceDate(effectiveInvoiceDate, effectiveOrderDate)
    if (validationError) {
      return { success: false, error: validationError }
    }

    const headerUpdate: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    }
    if (orderDate) headerUpdate.order_date = orderDate
    if (isInvoiceDateChanged) headerUpdate.invoice_date = invoiceDate || null

    const { error: orderUpdateErr } = await (supabase as any)
      .from('orders')
      .update(headerUpdate)
      .eq('id', orderId)

    if (orderUpdateErr) {
      console.error('updateOrder header error:', orderUpdateErr)
      return { success: false, error: orderUpdateErr.message }
    }
  }

  // 2. Delete items if any
  if (itemIdsToDelete && itemIdsToDelete.length > 0) {
    const { error: deleteErr } = await supabase
      .from('order_items')
      .delete()
      .in('id', itemIdsToDelete)
      .eq('order_id', orderId)

    if (deleteErr) {
      console.error('updateOrder delete items error:', deleteErr)
      return { success: false, error: deleteErr.message }
    }
  }

  // 3. Update existing items
  if (itemsToUpdate && itemsToUpdate.length > 0) {
    for (const item of itemsToUpdate) {
      const invoiceAmount = Number(item.qty || 0) * Number(item.price || 0)
      const updatePayload: Record<string, any> = {
        picked_qty: item.qty,
        uom: item.uom,
        price: item.price,
        invoice_amount: invoiceAmount,
        updated_at: new Date().toISOString()
      }

      // DB의 qty 컬럼은 CHECK (qty > 0) 제약이 있으므로,
      // 0(결품/미출고)인 경우 qty를 덮어쓰지 않고 picked_qty만 0으로 업데이트
      if (Number(item.qty) > 0) {
        updatePayload.qty = Number(item.qty)
      }

      const { error: itemUpdateErr } = await (supabase as any)
        .from('order_items')
        .update(updatePayload)
        .eq('id', item.id)
        .eq('order_id', orderId)

      if (itemUpdateErr) {
        console.error('updateOrder item update error:', itemUpdateErr)
        return { success: false, error: itemUpdateErr.message }
      }
    }
  }

  // 4. Insert new items
  if (itemsToAdd && itemsToAdd.length > 0) {
    const insertPayload = itemsToAdd.map(item => ({
      order_id: orderId,
      item_id: item.item_id || null,
      custom_item_name: item.custom_item_name || null,
      qty: Number(item.qty || 1),
      uom: item.uom || 'EA',
      price: Number(item.price || 0),
      invoice_amount: Number(item.qty || 1) * Number(item.price || 0),
      is_taxable: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: insertErr } = await (supabase as any)
      .from('order_items')
      .insert(insertPayload)

    if (insertErr) {
      console.error('updateOrder insert items error:', insertErr)
      return { success: false, error: insertErr.message }
    }
  }

  return { success: true, error: null }
}

export interface MasterItemSearchResult {
  id: string
  sku: string
  name_en: string
  desc_en?: string | null
  uom: string
  unit_price: number
  box_price: number
  pack_price: number
  category?: string | null
}

export async function searchMasterItemsForOrder(search: string): Promise<MasterItemSearchResult[]> {
  if (!search || search.trim().length === 0) return []
  const supabase = await getClient()
  const cleanSearch = search.trim()

  const { data, error } = await supabase
    .from('items')
    .select('id, sku, name_en, desc_en, uom, unit_price, box_price, pack_price, category')
    .or(`sku.ilike.%${cleanSearch}%,name_en.ilike.%${cleanSearch}%`)
    .eq('is_active', true)
    .limit(15)

  if (error) {
    console.error('searchMasterItemsForOrder error:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    sku: item.sku,
    name_en: item.name_en,
    desc_en: item.desc_en,
    uom: item.uom || 'EA',
    unit_price: Number(item.unit_price || 0),
    box_price: Number(item.box_price || 0),
    pack_price: Number(item.pack_price || 0),
    category: item.category,
  }))
}

