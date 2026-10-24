import { createClient } from '@/lib/supabase/server'
import { getActiveClientAction } from '@/app/actions/client.actions'
import { getItemDynamicThresholdsMap, DynamicItemThreshold } from './inventory.service'

export function formatItemDisplayName(nameEn?: string | null, descEn?: string | null): string {
  const name = nameEn?.trim() || 'N/A'
  const desc = descEn?.trim()
  return desc ? `${name} (${desc})` : name
}

export interface ReorderItemReport {
  itemId: string
  sku: string
  nameEn: string
  descEn?: string | null
  locationCode: string
  zoneType: string
  available: number
  onHand: number
  allocated: number
  safetyStock: number
  reorderPoint: number
  deficitQty: number
  recommendedRoq: number
  dailyVelocity: number
  leadTimeDays: number
  urgency: 'CRITICAL' | 'HIGH' | 'NORMAL'
}

export interface StockoutRiskReport {
  itemId: string
  sku: string
  nameEn: string
  locationCode: string
  zoneType: string
  available: number
  dailyVelocity: number
  daysOfSupply: number
  leadTimeDays: number
  riskLevel: 'URGENT' | 'WARNING' | 'WATCH'
}

export interface ExpiryReport {
  id: string
  itemId: string
  sku: string
  nameEn: string
  locationCode: string
  zoneType: string
  lotNo: string
  expirationDate: string
  daysRemaining: number
  onHandQty: number
  allocatedQty: number
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'WATCH'
}

export interface SurplusReport {
  itemId: string
  sku: string
  nameEn: string
  locationCode: string
  zoneType: string
  available: number
  onHandQty: number
  dailyVelocity: number
  surplusPoint: number
  classification: 'DEAD_STOCK' | 'SURPLUS'
}

export interface InventoryReportsData {
  kpis: {
    totalSkus: number
    totalOnHandQty: number
    reorderCount: number
    criticalReorderCount: number
    stockoutRiskCount: number
    urgentStockoutCount: number
    expiryWatchCount: number
    expiredCount: number
    surplusCount: number
    deadStockCount: number
  }
  reorderItems: ReorderItemReport[]
  stockoutRiskItems: StockoutRiskReport[]
  expiryItems: ExpiryReport[]
  surplusItems: SurplusReport[]
}

export async function getInventoryReportsData(): Promise<InventoryReportsData> {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  // 1. Fetch dynamic statistical thresholds map
  const thresholdsMap = await getItemDynamicThresholdsMap(activeClientId)

  // 2. Fetch all active inventory rows
  let query = (supabase as any).from('inventory').select(`
    id,
    on_hand_qty,
    allocated_qty,
    expiration_date,
    lot_no,
    updated_at,
    item:item_id ( id, sku, name_en, desc_en, shelf_life_days, min_stock_qty, lead_time_days ),
    location:location_id ( code, zone_type )
  `)

  if (activeClientId) {
    query = query.or(`client_id.eq.${activeClientId},client_id.is.null`)
  }
  query = query.or('on_hand_qty.gt.0,allocated_qty.gt.0')

  const { data: invRows, error } = await query

  if (error || !invRows) {
    console.error('getInventoryReportsData error:', error)
    return {
      kpis: {
        totalSkus: 0,
        totalOnHandQty: 0,
        reorderCount: 0,
        criticalReorderCount: 0,
        stockoutRiskCount: 0,
        urgentStockoutCount: 0,
        expiryWatchCount: 0,
        expiredCount: 0,
        surplusCount: 0,
        deadStockCount: 0,
      },
      reorderItems: [],
      stockoutRiskItems: [],
      expiryItems: [],
      surplusItems: []
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Distinct SKUs & total On-Hand
  const skuSet = new Set<string>()
  let totalOnHandQty = 0

  const reorderItems: ReorderItemReport[] = []
  const stockoutRiskItems: StockoutRiskReport[] = []
  const expiryItems: ExpiryReport[] = []
  const surplusItems: SurplusReport[] = []

  // Group by item to calculate item-level totals for reorder & stockout risk
  interface ItemAggregate {
    item: any
    locations: string[]
    zones: string[]
    totalOnHand: number
    totalAllocated: number
    totalAvailable: number
  }
  const itemAggMap: Record<string, ItemAggregate> = {}

  for (const row of invRows) {
    const item = row.item
    if (!item) continue

    const itemId = item.id
    skuSet.add(itemId)
    totalOnHandQty += Number(row.on_hand_qty || 0)

    const onHand = Number(row.on_hand_qty || 0)
    const allocated = Number(row.allocated_qty || 0)
    const available = onHand - allocated
    const locCode = row.location?.code || 'N/A'
    const zone = row.location?.zone_type || 'N/A'

    if (!itemAggMap[itemId]) {
      itemAggMap[itemId] = {
        item,
        locations: [locCode],
        zones: [zone],
        totalOnHand: onHand,
        totalAllocated: allocated,
        totalAvailable: available
      }
    } else {
      itemAggMap[itemId].totalOnHand += onHand
      itemAggMap[itemId].totalAllocated += allocated
      itemAggMap[itemId].totalAvailable += available
      if (!itemAggMap[itemId].locations.includes(locCode)) {
        itemAggMap[itemId].locations.push(locCode)
      }
      if (!itemAggMap[itemId].zones.includes(zone)) {
        itemAggMap[itemId].zones.push(zone)
      }
    }

    // Expiry evaluation (row level)
    if (row.expiration_date) {
      const expDate = new Date(row.expiration_date)
      expDate.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays <= 90) {
        let status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'WATCH' = 'WATCH'
        if (diffDays <= 0) status = 'EXPIRED'
        else if (diffDays <= 14) status = 'CRITICAL'
        else if (diffDays <= 45) status = 'WARNING'

        expiryItems.push({
          id: row.id,
          itemId: item.id,
          sku: item.sku,
          nameEn: formatItemDisplayName(item.name_en, item.desc_en),
          locationCode: locCode,
          zoneType: zone,
          lotNo: row.lot_no || 'N/A',
          expirationDate: row.expiration_date,
          daysRemaining: diffDays,
          onHandQty: onHand,
          allocatedQty: allocated,
          status,
        })
      }
    }
  }

  // Evaluate aggregated items for Reorder, Stockout Risk, and Surplus
  for (const itemId of Object.keys(itemAggMap)) {
    const agg = itemAggMap[itemId]
    const threshold: DynamicItemThreshold | undefined = thresholdsMap[itemId]

    const leadTime = threshold?.leadTimeDays ?? agg.item.lead_time_days ?? 7
    const safetyStock = threshold?.safetyStock ?? agg.item.min_stock_qty ?? 10
    const reorderPoint = threshold?.reorderPoint ?? 50
    const surplusPoint = threshold?.surplusPoint ?? 200
    const dailyVelocity = threshold?.dailyVelocity ?? 0
    const available = agg.totalAvailable
    const locSummary = agg.locations.slice(0, 3).join(', ') + (agg.locations.length > 3 ? ` +${agg.locations.length - 3}` : '')
    const zoneSummary = agg.zones.join(', ')

    // 1. Reorder Report (Available <= Reorder Point)
    if (available <= reorderPoint) {
      let urgency: 'CRITICAL' | 'HIGH' | 'NORMAL' = 'NORMAL'
      if (available <= 0) urgency = 'CRITICAL'
      else if (available <= safetyStock) urgency = 'HIGH'

      const deficitQty = Math.max(0, reorderPoint - available)
      const recommendedRoq = Math.max(0, (reorderPoint + safetyStock) - available)

      reorderItems.push({
        itemId,
        sku: agg.item.sku,
        nameEn: formatItemDisplayName(agg.item.name_en, agg.item.desc_en),
        descEn: agg.item.desc_en,
        locationCode: locSummary,
        zoneType: zoneSummary,
        available,
        onHand: agg.totalOnHand,
        allocated: agg.totalAllocated,
        safetyStock,
        reorderPoint,
        deficitQty,
        recommendedRoq,
        dailyVelocity,
        leadTimeDays: leadTime,
        urgency
      })
    }

    // 2. Stockout Risk (DOS)
    if (dailyVelocity > 0) {
      const daysOfSupply = Math.round((available / dailyVelocity) * 10) / 10
      if (daysOfSupply <= 14) {
        let riskLevel: 'URGENT' | 'WARNING' | 'WATCH' = 'WATCH'
        if (daysOfSupply <= 3) riskLevel = 'URGENT'
        else if (daysOfSupply <= 7) riskLevel = 'WARNING'

        stockoutRiskItems.push({
          itemId,
          sku: agg.item.sku,
          nameEn: formatItemDisplayName(agg.item.name_en, agg.item.desc_en),
          locationCode: locSummary,
          zoneType: zoneSummary,
          available,
          dailyVelocity,
          daysOfSupply,
          leadTimeDays: leadTime,
          riskLevel
        })
      }
    }

    // 3. Surplus & Dead Stock
    if (available > 0 && dailyVelocity === 0) {
      surplusItems.push({
        itemId,
        sku: agg.item.sku,
        nameEn: formatItemDisplayName(agg.item.name_en, agg.item.desc_en),
        locationCode: locSummary,
        zoneType: zoneSummary,
        available,
        onHandQty: agg.totalOnHand,
        dailyVelocity: 0,
        surplusPoint,
        classification: 'DEAD_STOCK'
      })
    } else if (available >= surplusPoint) {
      surplusItems.push({
        itemId,
        sku: agg.item.sku,
        nameEn: formatItemDisplayName(agg.item.name_en, agg.item.desc_en),
        locationCode: locSummary,
        zoneType: zoneSummary,
        available,
        onHandQty: agg.totalOnHand,
        dailyVelocity,
        surplusPoint,
        classification: 'SURPLUS'
      })
    }
  }

  // Sortings
  reorderItems.sort((a, b) => a.available - b.available)
  stockoutRiskItems.sort((a, b) => a.daysOfSupply - b.daysOfSupply)
  expiryItems.sort((a, b) => a.daysRemaining - b.daysRemaining)
  surplusItems.sort((a, b) => b.available - a.available)

  // KPIs
  const criticalReorderCount = reorderItems.filter(r => r.urgency === 'CRITICAL' || r.urgency === 'HIGH').length
  const urgentStockoutCount = stockoutRiskItems.filter(s => s.riskLevel === 'URGENT').length
  const expiredCount = expiryItems.filter(e => e.status === 'EXPIRED').length
  const deadStockCount = surplusItems.filter(s => s.classification === 'DEAD_STOCK').length

  return {
    kpis: {
      totalSkus: skuSet.size,
      totalOnHandQty,
      reorderCount: reorderItems.length,
      criticalReorderCount,
      stockoutRiskCount: stockoutRiskItems.length,
      urgentStockoutCount,
      expiryWatchCount: expiryItems.length,
      expiredCount,
      surplusCount: surplusItems.length,
      deadStockCount,
    },
    reorderItems,
    stockoutRiskItems,
    expiryItems,
    surplusItems,
  }
}
