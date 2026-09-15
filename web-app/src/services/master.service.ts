import { createClient } from '@/lib/supabase/server'

export interface ItemData {
  id: string
  sku: string
  name: string
  barcode: string
  description?: string
  created_at: string
}

export async function getItems({ page = 1, limit = 20, search = '' }) {
  const supabase = await createClient()
  
  let query = (supabase as any).from('items').select('*', { count: 'exact' })
  
  if (search) {
    query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`)
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })
  
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
  let query = (supabase as any).from('locations').select('*').order('barcode', { ascending: true })
  
  if (search) {
    query = query.ilike('barcode', `%${search}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('getLocations error:', error)
    return { data: [], error: error.message }
  }
  
  return { data, error: null }
}
