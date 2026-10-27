import { createClient } from "@/lib/supabase/server"
import { getActiveClientAction } from "@/app/actions/client.actions"
import { formatToAtlantaTime } from "@/lib/date"

export interface ItemData {
  id: string
  sku: string
  name_en: string
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
  volume_unit?: string | null
  shelf_life_days?: number | null
  min_outbound_days?: number | null
  desc_en?: string | null
  image_url?: string | null
  note?: string | null
  is_active: boolean
  created_at: string
}

export { getItemEffectivePrice } from "@/lib/pricing"

export async function getItems({
  page = 1,
  limit = 20,
  search = '',
  clientId,
}: {
  page?: number
  limit?: number
  search?: string
  clientId?: string | null
} = {}) {
  const supabase = await createClient()
  let query = supabase.from('items').select(`
    *,
    manufacturer:manufacturer_id(name)
  `, { count: 'exact' })
  
  const activeClientId = clientId !== undefined ? clientId : await getActiveClientAction()
  if (activeClientId) {
    query = query.eq('client_id', activeClientId)
  }

  if (search) {
    query = query.or(`sku.ilike.%${search}%,name_en.ilike.%${search}%,desc_en.ilike.%${search}%`)
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
  code: string
  barcode: string
  zone_type: 'A' | 'F' | 'S'
  zone: string
  aisle: string
  section: string
  bay: string
  tier: string
  level: string
  bin: string
  isGoldenZone: boolean
  storedItemSku?: string
  storedItemName?: string
  onHandQty: number
  createdAtFormatted: string
  updatedAtFormatted: string
}

export async function getLocations({ search = '' }: { search?: string } = {}) {
  const supabase = await createClient()
  let query = supabase.from('locations').select('*').order('code', { ascending: true })
  
  if (search) {
    query = query.ilike('code', `%${search}%`)
  }
  
  const { data: locRows, error } = await query
  
  if (error) {
    console.error('getLocations error:', error)
    return { data: [], error: error.message }
  }

  if (!locRows || locRows.length === 0) {
    return { data: [], error: null }
  }

  // Fetch current inventory ledger mapped to locations
  const { data: invRows } = await (supabase as any)
    .from('inventory')
    .select('location_id, on_hand_qty, item:item_id(sku, name_en)')
    .gt('on_hand_qty', 0)

  const invMap = new Map<string, { onHandQty: number; sku?: string; name?: string }>()
  if (invRows) {
    for (const inv of invRows) {
      invMap.set(inv.location_id, {
        onHandQty: inv.on_hand_qty || 0,
        sku: inv.item?.sku,
        name: inv.item?.name_en,
      })
    }
  }

  const data: LocationData[] = locRows.map((loc: any) => {
    const code = loc.code || ''
    const match = code.match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([A-D])([0-9]{2})$/)
    
    let zoneCode: 'A' | 'F' | 'S' = (loc.zone_type || 'A') as 'A' | 'F'
    let aisleNum = '01'
    let bayNum = '01'
    let levelCode = 'A'
    let binNum = '01'

    if (match) {
      zoneCode = (match[1] as 'A' | 'F' | 'S') || zoneCode
      aisleNum = match[2]
      bayNum = match[3]
      levelCode = match[4]
      binNum = match[5]
    } else if (code.startsWith('LOC-S')) {
      zoneCode = 'S'
    }

    const zoneLabel = zoneCode === 'F'
      ? 'Zone F (Cold Storage)'
      : zoneCode === 'S'
      ? 'Zone S (Staging Floor)'
      : 'Zone A (Ambient)'
    const isGolden = levelCode === 'A'
    const invInfo = invMap.get(loc.id)

    return {
      id: loc.id,
      code,
      barcode: code,
      zone_type: zoneCode,
      zone: zoneLabel,
      aisle: `Aisle ${aisleNum}`,
      section: `Bay ${bayNum}`,
      bay: `Bay ${bayNum}`,
      tier: `Level ${levelCode}`,
      level: `Level ${levelCode}${isGolden ? ' (Golden Zone)' : ''}`,
      bin: `Bin ${binNum}`,
      isGoldenZone: isGolden,
      storedItemSku: invInfo?.sku,
      storedItemName: invInfo?.name,
      onHandQty: invInfo?.onHandQty || 0,
      createdAtFormatted: formatToAtlantaTime(loc.created_at),
      updatedAtFormatted: formatToAtlantaTime(loc.updated_at),
    }
  })
  
  return { data, error: null }
}


export interface ClientData {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at?: string
  item_count?: number
  store_count?: number
  order_count?: number
}

export async function getClients(options: { withStats?: boolean } = {}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*').order('name')
  if (error || !data) {
    return { data: [], error: error?.message || null }
  }

  if (options.withStats) {
    const clientsWithStats: ClientData[] = await Promise.all(
      data.map(async (c: any) => {
        const [
          { count: itemCount },
          { count: storeCount },
          { count: orderCount },
        ] = await Promise.all([
          supabase.from('items').select('*', { count: 'exact', head: true }).eq('client_id', c.id),
          supabase.from('stores').select('*', { count: 'exact', head: true }).eq('client_id', c.id),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('client_id', c.id),
        ])
        return {
          ...c,
          item_count: itemCount || 0,
          store_count: storeCount || 0,
          order_count: orderCount || 0,
        }
      })
    )
    return { data: clientsWithStats, error: null }
  }

  return { data, error: null }
}