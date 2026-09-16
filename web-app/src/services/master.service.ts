import { createClient } from '@/lib/supabase/server'

export interface ItemData {
  id: string
  sku: string
  name_en: string
  name_kr?: string | null
  category?: string | null
  upc: string | null
  uom: string
  units_per_box: number
  unit_price: number
  pack_price: number
  box_price: number
  zone_type: 'A' | 'F' | 'R'
  manufacturer_id?: string | null
  supplier_id?: string | null
  manufacturer?: { name: string } | null
  min_stock_qty: number
  item_volume?: number | null
  shelf_life_days?: number | null
  note?: string | null
  is_active: boolean
  created_at: string
}

export async function getItems({ page = 1, limit = 20, search = '' }) {
  const supabase = await createClient()
  let query = supabase.from('items').select(`
    *,
    manufacturer:manufacturer_id(name)
  `, { count: 'exact' })
  if (search) {
    query = query.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%`)
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false }).order('sku', { ascending: true })
  
  if (error) {
    console.error('getItems error:', error)
    return { data: [], count: 0, error: error.message }
  }
  
  return { data, count: count || 0, error: null }
}

export async function createItem(item: Partial<ItemData>) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).from('items').insert([item]).select().single()
  return { data, error }
}

export async function getPartners() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('partners').select('*').order('name', { ascending: true })
  
  if (error) {
    console.error('getPartners error:', error)
    return { data: [], error: error.message }
  }
  
  return { data, error: null }
}

export interface LocationData {
  id: string
  barcode: string
  zone: string
  aisle: string
  section: string
  tier: string
}

export async function getLocations({ search = '' }) {
  const supabase = await createClient()
  let query = supabase.from('locations').select('*').order('code', { ascending: true })
  
  if (search) {
    query = query.ilike('code', `%${search}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('getLocations error:', error)
    return { data: [], error: error.message }
  }
  
  return { data, error: null }
}
