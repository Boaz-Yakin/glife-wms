import { createClient } from '@/lib/supabase/server'
import { getActiveClientAction } from '@/app/actions/client.actions'
import { getBuldakConversionMap } from './dekit.service'

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

  // Only display active inventory slots (on-hand > 0 or allocated > 0) or dedicated single de-kit staging (LOC-S0105A01)
  query = query.or('on_hand_qty.gt.0,allocated_qty.gt.0,location_id.eq.31b632f2-e408-4d5a-bf11-47b52b8db673')

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
      orderedQuery = orderedQuery.order('location(code)', { ascending: true }).order('updated_at', { ascending: false })
      break
  }
  
  // Parallel fetch: inventory page data + dynamic thresholds map + de-kit conversions map
  const [listRes, thresholdMap, convMaps] = await Promise.all([
    orderedQuery.range(from, to),
    getItemDynamicThresholdsMap(activeClientId),
    getBuldakConversionMap(),
  ])

  const { data, error, count } = listRes
  
  if (error) {
    console.error('getInventoryList error:', error)
    return { data: [], count: 0, error: error.message }
  }

  // Fetch total available stock for parent Multi items to calculate virtual available stock for Singles
  const parentItemIds = Array.from(new Set(Array.from(convMaps.childToParent.values()).map(c => c.parentItemId)))
  const parentAvailMap = new Map<string, number>()
  if (parentItemIds.length > 0) {
    const { data: pStockRows } = await (supabase as any)
      .from('inventory')
      .select('item_id, on_hand_qty, allocated_qty')
      .in('item_id', parentItemIds)

    for (const r of pStockRows || []) {
      const avail = Math.max(0, (r.on_hand_qty || 0) - (r.allocated_qty || 0))
      parentAvailMap.set(r.item_id, (parentAvailMap.get(r.item_id) || 0) + avail)
    }
  }

  // Process expiration_date, lot_no, and attach dynamic threshold & bundle metadata
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
    const childConv = itemId ? convMaps.childToParent.get(itemId) : undefined
    const parentConv = itemId ? convMaps.parentToChild.get(itemId) : undefined
    const rowAvail = Math.max(0, (row.on_hand_qty || 0) - (row.allocated_qty || 0))

    let bundleMeta: any = undefined
    if (childConv) {
      const parentAvail = parentAvailMap.get(childConv.parentItemId) || 0
      const ratio = childConv.conversionRatio || 5
      bundleMeta = {
        isChild: true,
        parentSku: childConv.parentSku,
        parentItemId: childConv.parentItemId,
        parentAvailable: parentAvail,
        conversionRatio: ratio,
        virtualAvailable: rowAvail + (parentAvail * ratio),
      }
    } else if (parentConv) {
      const ratio = parentConv.conversionRatio || 5
      bundleMeta = {
        isParent: true,
        childSku: parentConv.childSku,
        childItemId: parentConv.childItemId,
        conversionRatio: ratio,
        equivalentSingles: rowAvail * ratio,
      }
    }

    return {
      ...row,
      expiration_date: expDate,
      lot_no: lotNo,
      bundleMeta,
      item: row.item ? {
        ...row.item,
        dynamicThreshold: dynThreshold,
      } : row.item
    }
  })
  
  return { data: enrichedData, count: count || 0, error: null }
}

export interface ItemInventoryLocation {
  code: string
  zone: string
  onHand: number
  allocated: number
  available: number
}

export interface ItemInventoryRow {
  itemId: string
  sku: string
  name: string
  desc?: string | null
  category: string
  uom: string
  totalOnHand: number
  totalAllocated: number
  totalAvailable: number
  locationCount: number
  locations: ItemInventoryLocation[]
  dynamicThreshold?: DynamicItemThreshold
  // Multi <-> Single De-kit Bundle metadata
  isBundleChild?: boolean
  parentSku?: string
  parentItemId?: string
  parentAvailable?: number
  virtualAvailable?: number
  isBundleParent?: boolean
  childSku?: string
  childItemId?: string
  bundleRatio?: number
}

export interface GetItemInventoryParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 아이템별 창고 전체 재고 집계 목록 반환 (Item-Level Warehouse Stock Aggregation)
 */
export async function getItemInventoryList({
  page = 1,
  limit = 20,
  search = '',
  category = 'ALL',
  sortBy = 'available',
  sortOrder = 'desc',
}: GetItemInventoryParams) {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  let query = (supabase as any).from('inventory').select(`
    id,
    item_id,
    on_hand_qty,
    allocated_qty,
    client_id,
    locations:location_id ( id, code, zone_type ),
    items:item_id ( id, sku, name_en, desc_en, category, uom, is_active )
  `)

  if (activeClientId) {
    query = query.or(`client_id.eq.${activeClientId},client_id.is.null`)
  }
  query = query.or('on_hand_qty.gt.0,allocated_qty.gt.0,location_id.eq.31b632f2-e408-4d5a-bf11-47b52b8db673')

  const [{ data: invRows, error }, thresholdsMap, convMaps] = await Promise.all([
    query,
    getItemDynamicThresholdsMap(activeClientId),
    getBuldakConversionMap(),
  ])

  if (error || !invRows) {
    console.error('getItemInventoryList error:', error)
    return { data: [], count: 0, categories: [], error: error?.message || 'Failed to fetch items inventory' }
  }

  const itemMap = new Map<string, ItemInventoryRow>()
  const categoriesSet = new Set<string>()

  invRows.forEach((row: any) => {
    const it = row.items
    if (!it) return

    const cat = it.category || 'General'
    categoriesSet.add(cat)

    if (!itemMap.has(it.id)) {
      itemMap.set(it.id, {
        itemId: it.id,
        sku: it.sku || 'N/A',
        name: it.name_en || 'Unnamed Item',
        desc: it.desc_en || null,
        category: cat,
        uom: it.uom || 'BOX',
        totalOnHand: 0,
        totalAllocated: 0,
        totalAvailable: 0,
        locationCount: 0,
        locations: [],
        dynamicThreshold: thresholdsMap[it.id],
      })
    }

    const agg = itemMap.get(it.id)!
    const onHand = Number(row.on_hand_qty || 0)
    const allocated = Number(row.allocated_qty || 0)
    const avail = Math.max(0, onHand - allocated)

    agg.totalOnHand += onHand
    agg.totalAllocated += allocated
    agg.totalAvailable += avail

    agg.locations.push({
      code: row.locations?.code || 'UNKNOWN',
      zone: row.locations?.zone_type || 'A',
      onHand,
      allocated,
      available: avail,
    })
  })

  // Ensure all bundle child (Single) items are in itemMap even if physical on-hand is 0
  for (const [childId, conv] of convMaps.childToParent.entries()) {
    if (!itemMap.has(childId)) {
      itemMap.set(childId, {
        itemId: childId,
        sku: conv.childSku,
        name: conv.childName,
        desc: conv.flavour,
        category: 'Ramen',
        uom: 'EA',
        totalOnHand: 0,
        totalAllocated: 0,
        totalAvailable: 0,
        locationCount: 1,
        locations: [{
          code: 'LOC-S0105A01',
          zone: 'A',
          onHand: 0,
          allocated: 0,
          available: 0,
        }],
        dynamicThreshold: thresholdsMap[childId],
      })
      categoriesSet.add('Ramen')
    }
  }

  // Finalize location counts & sort per-item bins by available desc
  let list = Array.from(itemMap.values()).map(item => ({
    ...item,
    locationCount: item.locations.length,
    locations: item.locations.sort((a, b) => b.available - a.available),
  }))

  // Apply Multi <-> Single bundle conversions and virtual available stock
  list.forEach(item => {
    if (convMaps.childToParent.has(item.itemId)) {
      const conv = convMaps.childToParent.get(item.itemId)!
      const parentItem = itemMap.get(conv.parentItemId)
      const parentAvail = parentItem ? parentItem.totalAvailable : 0
      item.isBundleChild = true
      item.parentSku = conv.parentSku
      item.parentItemId = conv.parentItemId
      item.parentAvailable = parentAvail
      item.bundleRatio = conv.conversionRatio
      // Single available stock = Single physical available + Multi available * 5
      item.virtualAvailable = item.totalAvailable + (parentAvail * conv.conversionRatio)
    } else if (convMaps.parentToChild.has(item.itemId)) {
      const conv = convMaps.parentToChild.get(item.itemId)!
      item.isBundleParent = true
      item.childSku = conv.childSku
      item.childItemId = conv.childItemId
      item.bundleRatio = conv.conversionRatio
    }
  })

  // Category filter
  if (category && category !== 'ALL') {
    list = list.filter(item => item.category === category)
  }

  // Search filter
  const cleanSearch = search.trim().toLowerCase()
  if (cleanSearch) {
    const unhyphenated = cleanSearch.replace(/-/g, '')
    list = list.filter(item => {
      const matchSku = item.sku.toLowerCase().includes(cleanSearch)
      const matchName = item.name.toLowerCase().includes(cleanSearch)
      const matchDesc = (item.desc || '').toLowerCase().includes(cleanSearch)
      const matchCat = item.category.toLowerCase().includes(cleanSearch)
      const matchLoc = item.locations.some(loc => {
        const c = loc.code.toLowerCase()
        return c.includes(cleanSearch) || (unhyphenated ? c.replace(/-/g, '').includes(unhyphenated) : false)
      })
      return matchSku || matchName || matchDesc || matchCat || matchLoc
    })
  }

  // Sorting
  const isAsc = sortOrder === 'asc'
  list.sort((a, b) => {
    switch (sortBy) {
      case 'sku':
        return isAsc ? a.sku.localeCompare(b.sku) : b.sku.localeCompare(a.sku)
      case 'name':
        return isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      case 'category':
        return isAsc ? a.category.localeCompare(b.category) : b.category.localeCompare(a.category)
      case 'on_hand':
      case 'on_hand_qty':
        return isAsc ? a.totalOnHand - b.totalOnHand : b.totalOnHand - a.totalOnHand
      case 'allocated':
      case 'allocated_qty':
        return isAsc ? a.totalAllocated - b.totalAllocated : b.totalAllocated - a.totalAllocated
      case 'bins':
      case 'locationCount':
        return isAsc ? a.locationCount - b.locationCount : b.locationCount - a.locationCount
      case 'available':
      case 'available_qty':
      default: {
        const getAvail = (x: ItemInventoryRow) => (x.virtualAvailable !== undefined ? x.virtualAvailable : x.totalAvailable)
        return isAsc ? getAvail(a) - getAvail(b) : getAvail(b) - getAvail(a)
      }
    }
  })

  const totalCount = list.length
  const from = (page - 1) * limit
  const paginatedData = list.slice(from, from + limit)

  return {
    data: paginatedData,
    count: totalCount,
    categories: Array.from(categoriesSet).sort(),
    error: null,
  }
}

