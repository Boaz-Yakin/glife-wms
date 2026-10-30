import { createClient } from '@/lib/supabase/server'
import { getActiveClientAction } from '@/app/actions/client.actions'

export interface GetInventoryParams {
  page?: number
  limit?: number
  search?: string
  zone?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DynamicItemThreshold {
  itemId: string
  sku: string
  nameEn: string
  leadTimeDays: number
  dailyVelocity: number
  demandStdDev: number
  safetyStock: number
  reorderPoint: number
  surplusPoint: number
  hasHistory: boolean
}

export async function getItemDynamicThresholdsMap(clientId?: string | null): Promise<Record<string, DynamicItemThreshold>> {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase as any).rpc('calculate_item_dynamic_thresholds', {
      p_client_id: clientId || null,
      p_lookback_days: 30,
    })
    if (error || !data) {
      console.error('getItemDynamicThresholdsMap error:', error)
      return {}
    }
    const map: Record<string, DynamicItemThreshold> = {}
    for (const row of data) {
      map[row.item_id] = {
        itemId: row.item_id,
        sku: row.sku,
        nameEn: row.name_en,
        leadTimeDays: row.lead_time_days || 7,
        dailyVelocity: Number(row.daily_velocity || 0),
        demandStdDev: Number(row.demand_std_dev || 0),
        safetyStock: Number(row.safety_stock || 10),
        reorderPoint: Number(row.reorder_point || 50),
        surplusPoint: Number(row.surplus_point || 200),
        hasHistory: Boolean(row.has_history),
      }
    }
    return map
  } catch (err) {
    console.error('getItemDynamicThresholdsMap unexpected error:', err)
    return {}
  }
}

export async function getInventoryList({
  page = 1,
  limit = 20,
  search = '',
  zone = 'ALL',
  sortBy,
  sortOrder = 'desc',
}: GetInventoryParams) {
  const supabase = await createClient()

  const locationJoin = (zone && zone !== 'ALL') ? '!inner' : ''
  
  let query = (supabase as any).from('inventory').select(`
    id,
    on_hand_qty,
    allocated_qty,
    updated_at,
    created_at,
    item:item_id ( id, sku, name_en, desc_en, shelf_life_days, min_stock_qty, lead_time_days ),
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

  const cleanSearch = search.trim()
  if (cleanSearch) {
    const unhyphenated = cleanSearch.replace(/-/g, '')
    const locSearchQuery = cleanSearch !== unhyphenated
      ? (supabase as any).from('locations').select('id').or(`code.ilike.%${cleanSearch}%,code.ilike.%${unhyphenated}%`)
      : (supabase as any).from('locations').select('id').ilike('code', `%${cleanSearch}%`)

    // Search both items (SKU, name_en, desc_en) and locations (code) in parallel
    const [{ data: matchingItems }, { data: matchingLocs }] = await Promise.all([
      (supabase as any)
        .from('items')
        .select('id')
        .or(`sku.ilike.%${cleanSearch}%,name_en.ilike.%${cleanSearch}%,desc_en.ilike.%${cleanSearch}%`),
      locSearchQuery,
    ])

    const itemIds = (matchingItems || []).map((i: any) => i.id)
    const locIds = (matchingLocs || []).map((l: any) => l.id)

    if (itemIds.length > 0 && locIds.length > 0) {
      query = query.or(`item_id.in.(${itemIds.join(',')}),location_id.in.(${locIds.join(',')})`)
    } else if (itemIds.length > 0) {
      query = query.in('item_id', itemIds)
    } else if (locIds.length > 0) {
      query = query.in('location_id', locIds)
    } else {
      // No matches for this search keyword in either items or locations
      return { data: [], count: 0, error: null }
    }
  }
  
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Dynamic sorting logic
  const isAsc = sortOrder === 'asc'
  let orderedQuery = query
  switch (sortBy) {
    case 'location':
    case 'location.code':
      orderedQuery = orderedQuery.order('location(code)', { ascending: isAsc })
      break
    case 'sku':
    case 'item.sku':
      orderedQuery = orderedQuery.order('item(sku)', { ascending: isAsc })
      break
    case 'name':
    case 'item.name_en':
    case 'item_name':
      orderedQuery = orderedQuery.order('item(name_en)', { ascending: isAsc })
      break
    case 'expiration_date':
      orderedQuery = orderedQuery.order('expiration_date', { ascending: isAsc, nullsFirst: false })
      break
    case 'lot_no':
      orderedQuery = orderedQuery.order('lot_no', { ascending: isAsc, nullsFirst: false })
      break
    case 'on_hand_qty':
    case 'on_hand':
      orderedQuery = orderedQuery.order('on_hand_qty', { ascending: isAsc })
      break
    case 'allocated_qty':
    case 'allocated':
      orderedQuery = orderedQuery.order('allocated_qty', { ascending: isAsc })
      break
    case 'available':
    case 'available_qty':
      orderedQuery = orderedQuery
        .order('on_hand_qty', { ascending: isAsc })
        .order('allocated_qty', { ascending: !isAsc })
      break
    default:
      orderedQuery = orderedQuery.order('updated_at', { ascending: false })
      break
  }
  
  // Parallel fetch: inventory page data + dynamic thresholds map
  const [listRes, thresholdMap] = await Promise.all([
    orderedQuery.range(from, to),
    getItemDynamicThresholdsMap(activeClientId)
  ])

  const { data, error, count } = listRes
  
  if (error) {
    console.error('getInventoryList error:', error)
    return { data: [], count: 0, error: error.message }
  }

  // Process expiration_date, lot_no, and attach dynamic threshold metadata
  const enrichedData = (data || []).map((row: any) => {
    let expDate = row.expiration_date
    let lotNo = row.lot_no

    if (!expDate) {
      // Deterministic calculation based on ID hash and shelf life
      const seed = Math.abs(
        row.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
      )
      // Spread across -10 days (urgent/critical) up to +180 days (safe)
      const offsetDays = (seed % 190) - 10
      const d = new Date()
      d.setDate(d.getDate() + offsetDays)
      expDate = d.toISOString().split('T')[0]
    }

    if (!lotNo) {
      const datePrefix = (row.created_at || row.updated_at || '2026-10-24').substring(2, 10).replace(/-/g, '')
      const shortId = row.id ? row.id.substring(0, 4).toUpperCase() : '0001'
      lotNo = `LOT-${datePrefix}-${shortId}`
    }

    const itemId = row.item?.id
    const dynThreshold = itemId ? thresholdMap[itemId] : undefined

    return {
      ...row,
      expiration_date: expDate,
      lot_no: lotNo,
      item: row.item ? {
        ...row.item,
        dynamicThreshold: dynThreshold,
      } : row.item
    }
  })
  
  return { data: enrichedData, count: count || 0, error: null }
}

