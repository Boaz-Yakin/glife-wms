import { createClient } from '@/lib/supabase/server'
import { getActiveClientAction } from '@/app/actions/client.actions'

export type DashboardPeriod = 'today' | 'week' | 'month'

export interface DashboardKpis {
  totalInventoryValue: number
  inventoryValueFormatted: string
  inventoryValueTrend?: {
    value: string
    isPositive: boolean
  }
  storageUtilisationRate: number
  storageUtilisationFormatted: string
  storageOccupiedBins: number
  storageTotalBins: number
  dispatchedCount: number
  dispatchedTrend?: {
    value: string
    isPositive: boolean
  }
  pickingCount: number
  cycleCountPending: number
  lowStockCount: number
}

export interface StorageCapacityData {
  totalLocations: number
  occupiedLocations: number
  availableLocations: number
  utilizationRate: number
  zoneA: { total: number; occupied: number; rate: number }
  zoneF: { total: number; occupied: number; rate: number }
  chartData: Array<{ name: string; value: number; color: string }>
}

export async function getDashboardKpis(period: DashboardPeriod = 'today'): Promise<DashboardKpis> {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  // 1. 총 재고 자산 가치 (Total Inventory Value)
  let invValQuery = (supabase as any)
    .from('inventory')
    .select('on_hand_qty, item:item_id (unit_price)')

  if (activeClientId) {
    invValQuery = invValQuery.eq('client_id', activeClientId)
  }
  const { data: invRows } = await invValQuery

  let totalInventoryValue = 0
  if (invRows && invRows.length > 0) {
    for (const row of invRows) {
      const qty = row.on_hand_qty || 0
      const price = Number(row.item?.unit_price || 0)
      totalInventoryValue += qty * price
    }
  }

  const inventoryValueFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalInventoryValue)

  // 2. 창고 공간 점유율 (Storage Utilisation)
  const { count: totalLocationsCount } = await (supabase as any)
    .from('locations')
    .select('*', { count: 'exact', head: true })

  let occupiedLocQuery = (supabase as any)
    .from('inventory')
    .select('location_id')
    .gt('on_hand_qty', 0)

  if (activeClientId) {
    occupiedLocQuery = occupiedLocQuery.eq('client_id', activeClientId)
  }
  const { data: occupiedLocRows } = await occupiedLocQuery

  const occupiedSet = new Set((occupiedLocRows || []).map((r: any) => r.location_id))
  const storageOccupiedBins = occupiedSet.size
  const storageTotalBins = totalLocationsCount || 0
  const storageUtilisationRate = storageTotalBins > 0
    ? Number(((storageOccupiedBins / storageTotalBins) * 100).toFixed(1))
    : 0
  const storageUtilisationFormatted = `${storageUtilisationRate}%`

  // 3. 출고 완료 (DISPATCHED) - 선택된 기간 및 이전 기간 대비 증감 추세
  const now = new Date()
  const currentStart = new Date(now)
  const previousStart = new Date(now)
  const previousEnd = new Date(now)
  let periodLabel = 'vs yesterday'

  if (period === 'month') {
    currentStart.setDate(now.getDate() - 30)
    previousStart.setDate(now.getDate() - 60)
    previousEnd.setDate(now.getDate() - 30)
    periodLabel = 'vs prev 30d'
  } else if (period === 'week') {
    currentStart.setDate(now.getDate() - 7)
    previousStart.setDate(now.getDate() - 14)
    previousEnd.setDate(now.getDate() - 7)
    periodLabel = 'vs prev 7d'
  } else {
    currentStart.setHours(0, 0, 0, 0)
    previousStart.setDate(now.getDate() - 1)
    previousStart.setHours(0, 0, 0, 0)
    previousEnd.setDate(now.getDate() - 1)
    previousEnd.setHours(23, 59, 59, 999)
    periodLabel = 'vs yesterday'
  }

  let dispatchedQuery = (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DISPATCHED')
    .gte('updated_at', currentStart.toISOString())

  if (activeClientId) {
    dispatchedQuery = dispatchedQuery.eq('client_id', activeClientId)
  }
  const { count: dispatchedCount } = await dispatchedQuery

  let prevDispatchedQuery = (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DISPATCHED')
    .gte('updated_at', previousStart.toISOString())
    .lte('updated_at', previousEnd.toISOString())

  if (activeClientId) {
    prevDispatchedQuery = prevDispatchedQuery.eq('client_id', activeClientId)
  }
  const { count: prevDispatchedCount } = await prevDispatchedQuery

  let dispatchedTrend: { value: string; isPositive: boolean } | undefined = undefined
  const currDispatched = dispatchedCount || 0
  const prevDispatched = prevDispatchedCount || 0

  if (prevDispatched > 0) {
    const diffPercent = Math.round(((currDispatched - prevDispatched) / prevDispatched) * 100)
    dispatchedTrend = {
      value: `${diffPercent >= 0 ? '+' : ''}${diffPercent}% ${periodLabel}`,
      isPositive: diffPercent >= 0,
    }
  } else if (currDispatched > 0) {
    dispatchedTrend = {
      value: `+${currDispatched} ${periodLabel}`,
      isPositive: true,
    }
  }

  // 4. 진행 중 피킹 (PICKING)
  let pickingQuery = (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PICKING')

  if (activeClientId) {
    pickingQuery = pickingQuery.eq('client_id', activeClientId)
  }
  const { count: pickingCount } = await pickingQuery

  // 5. 긴급 실사 대기 (PENDING in cycle_count_requests)
  let cycleCount = 0
  try {
    let cycleQuery = (supabase as any)
      .from('cycle_count_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
    const { count } = await cycleQuery
    cycleCount = count || 0
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  // 6. 재고 부족 알림 (on_hand_qty < 10)
  let lowStockQuery = (supabase as any)
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .lt('on_hand_qty', 10)

  if (activeClientId) {
    lowStockQuery = lowStockQuery.eq('client_id', activeClientId)
  }
  const { count: lowStockCount } = await lowStockQuery

  return {
    totalInventoryValue,
    inventoryValueFormatted,
    inventoryValueTrend: undefined,
    storageUtilisationRate,
    storageUtilisationFormatted,
    storageOccupiedBins,
    storageTotalBins,
    dispatchedCount: dispatchedCount || 0,
    dispatchedTrend,
    pickingCount: pickingCount || 0,
    cycleCountPending: cycleCount,
    lowStockCount: lowStockCount || 0,
  }
}

export async function getStorageCapacity(): Promise<StorageCapacityData> {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  const { data: allLocations } = await (supabase as any)
    .from('locations')
    .select('id, zone_type')

  const totalLocations = allLocations?.length || 0

  let occupiedQuery = (supabase as any)
    .from('inventory')
    .select('location_id')
    .gt('on_hand_qty', 0)

  if (activeClientId) {
    occupiedQuery = occupiedQuery.eq('client_id', activeClientId)
  }
  const { data: occupiedData } = await occupiedQuery

  const occupiedSet = new Set((occupiedData || []).map((r: any) => r.location_id))

  let zoneATotal = 0
  let zoneAOccupied = 0
  let zoneFTotal = 0
  let zoneFOccupied = 0

  if (allLocations) {
    for (const loc of allLocations) {
      const isOccupied = occupiedSet.has(loc.id)
      if (loc.zone_type === 'A') {
        zoneATotal++
        if (isOccupied) zoneAOccupied++
      } else if (loc.zone_type === 'F') {
        zoneFTotal++
        if (isOccupied) zoneFOccupied++
      }
    }
  }

  const occupiedLocations = occupiedSet.size
  const availableLocations = Math.max(0, totalLocations - occupiedLocations)
  const utilizationRate = totalLocations > 0 ? Number(((occupiedLocations / totalLocations) * 100).toFixed(1)) : 0

  const zoneARate = zoneATotal > 0 ? Number(((zoneAOccupied / zoneATotal) * 100).toFixed(1)) : 0
  const zoneFRate = zoneFTotal > 0 ? Number(((zoneFOccupied / zoneFTotal) * 100).toFixed(1)) : 0

  return {
    totalLocations,
    occupiedLocations,
    availableLocations,
    utilizationRate,
    zoneA: { total: zoneATotal, occupied: zoneAOccupied, rate: zoneARate },
    zoneF: { total: zoneFTotal, occupied: zoneFOccupied, rate: zoneFRate },
    chartData: [
      { name: "Occupied", value: occupiedLocations, color: "#3b82f6" },
      { name: "Available", value: availableLocations, color: "#94a3b8" },
    ],
  }
}

export async function getInventoryHealth() {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  let query = (supabase as any)
    .from('inventory')
    .select('on_hand_qty, allocated_qty')

  if (activeClientId) {
    query = query.eq('client_id', activeClientId)
  }

  const { data } = await query

  let totalAvailable = 0
  let totalAllocated = 0

  if (data && data.length > 0) {
    for (const item of data) {
      const avail = Math.max(0, (item.on_hand_qty || 0) - (item.allocated_qty || 0))
      totalAvailable += avail
      totalAllocated += (item.allocated_qty || 0)
    }
  }

  let totalDamaged = 0
  try {
    const { data: adjData } = await (supabase as any)
      .from('inventory_adjustments')
      .select('previous_qty, new_qty, reason')
      .in('reason', ['DAMAGED', 'LOST'])

    if (adjData && adjData.length > 0) {
      for (const adj of adjData) {
        const diff = (adj.previous_qty || 0) - (adj.new_qty || 0)
        if (diff > 0) totalDamaged += diff
      }
    }
  } catch (e) {
    // Ignore if table or records do not exist
  }

  return [
    { name: "Available", value: totalAvailable, color: "#10b981" },
    { name: "Allocated", value: totalAllocated, color: "#f59e0b" },
    { name: "Shortage/Damaged", value: totalDamaged, color: "#ef4444" },
  ]
}

export async function getHourlyPickingProgress(period: DashboardPeriod = 'today') {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let pickedQuery = (supabase as any)
    .from('orders')
    .select('id, status, updated_at')
    .in('status', ['PICKED', 'DISPATCHED'])
    .gte('updated_at', today.toISOString())
    .order('updated_at', { ascending: true })

  if (activeClientId) {
    pickedQuery = pickedQuery.eq('client_id', activeClientId)
  }

  const { data: pickedOrders } = await pickedQuery

  let todayOrdersQuery = (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', today.toISOString())
    .neq('status', 'CANCELED')

  if (activeClientId) {
    todayOrdersQuery = todayOrdersQuery.eq('client_id', activeClientId)
  }
  const { count: totalOrdersToday } = await todayOrdersQuery
  const totalTarget = totalOrdersToday || 0

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
  const targetPerSlot = totalTarget > 0 ? Math.ceil(totalTarget / timeSlots.length) : 0

  return timeSlots.map((timeStr, idx) => {
    const slotHour = parseInt(timeStr.split(':')[0], 10)

    let countSoFar = 0
    if (pickedOrders && pickedOrders.length > 0) {
      countSoFar = pickedOrders.filter((order: any) => {
        const orderHour = new Date(order.updated_at).getHours()
        return orderHour <= slotHour
      }).length
    }

    const targetSoFar = Math.min(totalTarget, (idx + 1) * targetPerSlot)

    return {
      time: timeStr,
      picking: countSoFar,
      target: targetSoFar,
    }
  })
}

export type QualityStatus = 'optimal' | 'warning' | 'critical'

export interface ProcessStageQuality {
  id: string
  name: string
  stepNumber: string
  rate: number
  status: QualityStatus
  badgeText: string
  label: string
  description: string
  benchmark: string
}

export interface LogistixFlowMetrics {
  dockToStock: {
    minutes: number
    targetMinutes: number
    status: QualityStatus
    badgeText: string
    benchmarkText: string
    hasRealData: boolean
  }
  stages: {
    receiving: ProcessStageQuality
    placeSmart: ProcessStageQuality
    guidedPick: ProcessStageQuality
    packingQc: ProcessStageQuality
    cycleCount: ProcessStageQuality
  }
  lastUpdated: string
}

export async function getLogistixFlowMetrics(warehouse: string = 'all'): Promise<LogistixFlowMetrics> {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  // 1. Dock-to-Stock Actual Lead Time from inventory (created_at vs updated_at delta)
  let leadTimeMinutes = 0
  let hasValidLeadTimes = false
  try {
    let invLeadQuery = (supabase as any)
      .from('inventory')
      .select('created_at, updated_at, location:location_id(zone_type)')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (activeClientId) {
      invLeadQuery = invLeadQuery.eq('client_id', activeClientId)
    }

    const { data: invRows } = await invLeadQuery
    if (invRows && invRows.length > 0) {
      const filteredRows = warehouse !== 'all'
        ? invRows.filter((r: any) => r.location?.zone_type === warehouse.replace('zone_', '').toUpperCase())
        : invRows

      const deltas = filteredRows
        .map((r: any) => {
          const start = new Date(r.created_at).getTime()
          const end = new Date(r.updated_at).getTime()
          return (end - start) / (1000 * 60)
        })
        .filter((mins: number) => mins > 0)

      if (deltas.length > 0) {
        const sum = deltas.reduce((acc: number, val: number) => acc + val, 0)
        leadTimeMinutes = Number((sum / deltas.length).toFixed(1))
        hasValidLeadTimes = true
      }
    }
  } catch {
    leadTimeMinutes = 0
  }

  // 2. Receiving Quality (%): Inventory records without damaged/lost adjustments
  let receivingRate = 100
  try {
    const { count: totalInvCount } = await (supabase as any)
      .from('inventory')
      .select('*', { count: 'exact', head: true })

    const { count: damagedCount } = await (supabase as any)
      .from('inventory_adjustments')
      .select('*', { count: 'exact', head: true })
      .in('reason', ['DAMAGED', 'LOST'])

    const total = totalInvCount || 0
    const damaged = damagedCount || 0
    if (total > 0) {
      receivingRate = Number((Math.max(0, 100 - (damaged / total) * 100)).toFixed(1))
    }
  } catch {
    receivingRate = 100
  }

  // 3. Place Smart (%): Item recommended zone_type matched with location zone_type
  let placeSmartRate = 100
  try {
    let slottingQuery = (supabase as any)
      .from('inventory')
      .select('item:item_id (zone_type), location:location_id (zone_type)')

    if (activeClientId) {
      slottingQuery = slottingQuery.eq('client_id', activeClientId)
    }

    const { data: slottingRows } = await slottingQuery
    if (slottingRows && slottingRows.length > 0) {
      const filteredSlots = warehouse !== 'all'
        ? slottingRows.filter((r: any) => r.location?.zone_type === warehouse.replace('zone_', '').toUpperCase())
        : slottingRows

      if (filteredSlots.length > 0) {
        const matched = filteredSlots.filter((r: any) => r.item?.zone_type === r.location?.zone_type).length
        placeSmartRate = Number(((matched / filteredSlots.length) * 100).toFixed(1))
      }
    }
  } catch {
    placeSmartRate = 100
  }

  // 4. Guided Pick Zero-Skip Rate (%): Completed orders vs skip requests in cycle_count_requests
  let guidedPickRate = 100
  try {
    let pickedQuery = (supabase as any)
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PICKED', 'DISPATCHED'])

    if (activeClientId) {
      pickedQuery = pickedQuery.eq('client_id', activeClientId)
    }

    const { count: pickedCount } = await pickedQuery

    let skipQuery = (supabase as any)
      .from('cycle_count_requests')
      .select('*', { count: 'exact', head: true })

    const { count: skipCount } = await skipQuery

    const totalPicked = pickedCount || 0
    const skips = skipCount || 0
    if (totalPicked > 0) {
      guidedPickRate = Number((Math.max(0, 100 - (skips / totalPicked) * 100)).toFixed(1))
    }
  } catch {
    guidedPickRate = 100
  }

  // 5. Packing QC Pass Rate (%): Dispatched orders vs total finalized orders (Dispatched + Canceled)
  let packingQcRate = 100
  try {
    let dispatchedQuery = (supabase as any)
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'DISPATCHED')

    let canceledQuery = (supabase as any)
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'CANCELED')

    if (activeClientId) {
      dispatchedQuery = dispatchedQuery.eq('client_id', activeClientId)
      canceledQuery = canceledQuery.eq('client_id', activeClientId)
    }

    const { count: dispatchedCount } = await dispatchedQuery
    const { count: canceledCount } = await canceledQuery

    const dCount = dispatchedCount || 0
    const cCount = canceledCount || 0
    const totalFinal = dCount + cCount

    if (totalFinal > 0) {
      packingQcRate = Number(((dCount / totalFinal) * 100).toFixed(1))
    }
  } catch {
    packingQcRate = 100
  }

  // 6. Cycle Count Accuracy (%): Inventory without adjustments
  let cycleCountRate = 100
  try {
    const { count: totalInv } = await (supabase as any)
      .from('inventory')
      .select('*', { count: 'exact', head: true })

    const { count: totalAdj } = await (supabase as any)
      .from('inventory_adjustments')
      .select('*', { count: 'exact', head: true })

    const inv = totalInv || 0
    const adj = totalAdj || 0
    if (inv > 0) {
      cycleCountRate = Number((Math.max(0, 100 - (adj / inv) * 100)).toFixed(1))
    }
  } catch {
    cycleCountRate = 100
  }

  const getStatusFromRate = (rate: number, optThreshold: number, warnThreshold: number): { status: QualityStatus; badgeText: string } => {
    if (rate >= optThreshold) return { status: 'optimal', badgeText: 'Optimal 🟢' }
    if (rate >= warnThreshold) return { status: 'warning', badgeText: 'Warning 🟡' }
    return { status: 'critical', badgeText: 'Critical 🔴' }
  }

  const dockStatus: QualityStatus = !hasValidLeadTimes
    ? 'optimal'
    : leadTimeMinutes <= 30
    ? 'optimal'
    : leadTimeMinutes <= 60
    ? 'warning'
    : 'critical'

  const dockBadgeText = !hasValidLeadTimes
    ? 'No Data ⚪'
    : dockStatus === 'optimal'
    ? 'Optimal 🟢'
    : dockStatus === 'warning'
    ? 'Warning 🟡'
    : 'Delayed 🔴'

  const receivingQuality = getStatusFromRate(receivingRate, 98.0, 95.0)
  const placeSmartQuality = getStatusFromRate(placeSmartRate, 90.0, 80.0)
  const guidedPickQuality = getStatusFromRate(guidedPickRate, 95.0, 90.0)
  const packingQcQuality = getStatusFromRate(packingQcRate, 98.0, 90.0)
  const cycleCountQuality = getStatusFromRate(cycleCountRate, 95.0, 90.0)

  return {
    dockToStock: {
      minutes: leadTimeMinutes,
      targetMinutes: 30,
      status: dockStatus,
      badgeText: dockBadgeText,
      benchmarkText: 'Target: <30m',
      hasRealData: hasValidLeadTimes,
    },
    stages: {
      receiving: {
        id: 'receiving',
        stepNumber: '01',
        name: 'Receiving',
        rate: receivingRate,
        status: receivingQuality.status,
        badgeText: receivingQuality.badgeText,
        label: 'Inbound Verification',
        description: 'Barcode & SKU verification',
        benchmark: '≥ 98.0%',
      },
      placeSmart: {
        id: 'placeSmart',
        stepNumber: '02',
        name: 'Place Smart',
        rate: placeSmartRate,
        status: placeSmartQuality.status,
        badgeText: placeSmartQuality.badgeText,
        label: 'Slotting Compliance',
        description: 'Zone & temperature match',
        benchmark: '≥ 90.0%',
      },
      guidedPick: {
        id: 'guidedPick',
        stepNumber: '03',
        name: 'Guided Pick',
        rate: guidedPickRate,
        status: guidedPickQuality.status,
        badgeText: guidedPickQuality.badgeText,
        label: 'Zero-Skip Pick Rate',
        description: 'CMD-SKIP avoidance rate',
        benchmark: '≥ 95.0%',
      },
      packingQc: {
        id: 'packingQc',
        stepNumber: '04',
        name: 'Packing QC',
        rate: packingQcRate,
        status: packingQcQuality.status,
        badgeText: packingQcQuality.badgeText,
        label: 'Dispatch QC Pass',
        description: 'Final inspection pass rate',
        benchmark: '≥ 99.5%',
      },
      cycleCount: {
        id: 'cycleCount',
        stepNumber: '05',
        name: 'Cycle Count',
        rate: cycleCountRate,
        status: cycleCountQuality.status,
        badgeText: cycleCountQuality.badgeText,
        label: 'Inventory Accuracy',
        description: 'Audit & ledger match rate',
        benchmark: '≥ 95.0%',
      },
    },
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

export interface DeadStockItem {
  id: string
  sku: string
  name: string
  qty: number
  unitPrice: number
  totalValue: number
  zoneType: string
  daysInactive: number
}

export interface DeadStockAnalysisData {
  totalDeadStockValue: number
  formattedDeadStockValue: string
  deadStockQty: number
  deadStockRatio: number
  deadItems: DeadStockItem[]
}

export interface ReorderQueueItem {
  id: string
  sku: string
  name: string
  currentStock: number
  minStock: number
  suggestedReorderQty: number
  unitPrice: number
  estimatedCost: number
  isCritical: boolean
}

export interface ReorderQueueData {
  totalItemsToReorder: number
  criticalStockouts: number
  totalEstimatedCost: number
  formattedEstimatedCost: string
  items: ReorderQueueItem[]
}

export interface SlottingRecommendationItem {
  id: string
  sku: string
  name: string
  currentZone: string
  recommendedZone: string
  currentLocationCode: string
  dispatchFrequency: number
  reason: string
}

export interface SlottingOptimizationData {
  totalRecommendations: number
  items: SlottingRecommendationItem[]
}

export interface InventoryIntelligenceData {
  deadStock: DeadStockAnalysisData
  reorderQueue: ReorderQueueData
  slotting: SlottingOptimizationData
}

export async function getInventoryIntelligenceData(): Promise<InventoryIntelligenceData> {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  // 1. Dead Stock Analysis (Items in inventory with no DISPATCHED orders in the last 60 days)
  let totalDeadStockValue = 0
  let deadStockQty = 0
  let deadItems: DeadStockItem[] = []
  let deadStockRatio = 0

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 60)

    // Find items dispatched within last 60 days
    let recentDispatchedQuery = (supabase as any)
      .from('order_items')
      .select('item_id, order:order_id!inner(status, updated_at)')
      .eq('order.status', 'DISPATCHED')
      .gte('order.updated_at', cutoffDate.toISOString())

    const { data: recentItemsData } = await recentDispatchedQuery
    const activeItemIds = new Set((recentItemsData || []).map((r: any) => r.item_id))

    // Query on-hand inventory
    let invQuery = (supabase as any)
      .from('inventory')
      .select('item_id, on_hand_qty, location:location_id(code, zone_type), item:item_id(id, sku, name_en, unit_price, zone_type)')
      .gt('on_hand_qty', 0)

    if (activeClientId) {
      invQuery = invQuery.eq('client_id', activeClientId)
    }

    const { data: invRows } = await invQuery

    let totalValAll = 0
    if (invRows && invRows.length > 0) {
      const deadCandidateMap = new Map<string, DeadStockItem>()

      for (const row of invRows) {
        const item = row.item
        const qty = row.on_hand_qty || 0
        const price = Number(item?.unit_price || 0)
        const rowVal = qty * price
        totalValAll += rowVal

        if (item && !activeItemIds.has(row.item_id)) {
          const existing = deadCandidateMap.get(item.id)
          if (existing) {
            existing.qty += qty
            existing.totalValue += rowVal
          } else {
            deadCandidateMap.set(item.id, {
              id: item.id,
              sku: item.sku || 'N/A',
              name: item.name_en || 'Unknown Item',
              qty,
              unitPrice: price,
              totalValue: rowVal,
              zoneType: row.location?.zone_type || item.zone_type || 'A',
              daysInactive: 60,
            })
          }
        }
      }

      deadItems = Array.from(deadCandidateMap.values()).sort((a, b) => b.totalValue - a.totalValue)
      totalDeadStockValue = deadItems.reduce((acc, curr) => acc + curr.totalValue, 0)
      deadStockQty = deadItems.reduce((acc, curr) => acc + curr.qty, 0)

      if (totalValAll > 0) {
        deadStockRatio = Number(((totalDeadStockValue / totalValAll) * 100).toFixed(1))
      }
    }
  } catch {
    // Graceful fallback to empty state
  }

  const formattedDeadStockValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalDeadStockValue)

  // 2. Smart Reorder Queue (Items where total on-hand is below min_stock_qty)
  let reorderItems: ReorderQueueItem[] = []
  let totalEstimatedCost = 0
  let criticalStockouts = 0

  try {
    let itemsQuery = (supabase as any)
      .from('items')
      .select('id, sku, name_en, min_stock_qty, unit_price')
      .gt('min_stock_qty', 0)

    const { data: allMonitoredItems } = await itemsQuery

    if (allMonitoredItems && allMonitoredItems.length > 0) {
      // Get stock totals for items
      let stockAggQuery = (supabase as any)
        .from('inventory')
        .select('item_id, on_hand_qty')

      if (activeClientId) {
        stockAggQuery = stockAggQuery.eq('client_id', activeClientId)
      }

      const { data: stockRows } = await stockAggQuery
      const stockMap = new Map<string, number>()
      if (stockRows) {
        for (const s of stockRows) {
          stockMap.set(s.item_id, (stockMap.get(s.item_id) || 0) + (s.on_hand_qty || 0))
        }
      }

      for (const it of allMonitoredItems) {
        const currentStock = stockMap.get(it.id) || 0
        const minStock = it.min_stock_qty || 0

        if (currentStock < minStock) {
          const suggested = Math.max(1, (minStock * 2) - currentStock)
          const price = Number(it.unit_price || 0)
          const cost = suggested * price
          const isCrit = currentStock === 0

          if (isCrit) criticalStockouts++
          totalEstimatedCost += cost

          reorderItems.push({
            id: it.id,
            sku: it.sku || 'N/A',
            name: it.name_en || 'Unknown Item',
            currentStock,
            minStock,
            suggestedReorderQty: suggested,
            unitPrice: price,
            estimatedCost: cost,
            isCritical: isCrit,
          })
        }
      }

      // Sort critical items first, then by highest cost
      reorderItems.sort((a, b) => {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
        return b.estimatedCost - a.estimatedCost
      })
    }
  } catch {
    // Graceful fallback to empty state
  }

  const formattedEstimatedCost = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalEstimatedCost)

  // 3. Dynamic Slotting Recommendations (High velocity items in mismatched zones)
  let slottingItems: SlottingRecommendationItem[] = []
  try {
    let slotMismatchQuery = (supabase as any)
      .from('inventory')
      .select('item_id, on_hand_qty, location:location_id(code, zone_type), item:item_id(id, sku, name_en, zone_type)')
      .gt('on_hand_qty', 0)

    if (activeClientId) {
      slotMismatchQuery = slotMismatchQuery.eq('client_id', activeClientId)
    }

    const { data: mismatchRows } = await slotMismatchQuery
    if (mismatchRows) {
      for (const row of mismatchRows) {
        const item = row.item
        const loc = row.location
        if (item && loc && item.zone_type && loc.zone_type && item.zone_type !== loc.zone_type) {
          slottingItems.push({
            id: item.id,
            sku: item.sku || 'N/A',
            name: item.name_en || 'Unknown Item',
            currentZone: loc.zone_type === 'A' ? 'Zone A (Ambient)' : 'Zone F (Cold)',
            recommendedZone: item.zone_type === 'A' ? 'Zone A (Ambient)' : 'Zone F (Cold)',
            currentLocationCode: loc.code || 'UNKNOWN',
            dispatchFrequency: row.on_hand_qty || 0,
            reason: `Temperature mismatch: Assigned to ${loc.zone_type} but requires ${item.zone_type}`,
          })
        }
      }
    }
  } catch {
    // Graceful fallback to empty state
  }

  return {
    deadStock: {
      totalDeadStockValue,
      formattedDeadStockValue,
      deadStockQty,
      deadStockRatio,
      deadItems: deadItems.slice(0, 10), // Top 10 items
    },
    reorderQueue: {
      totalItemsToReorder: reorderItems.length,
      criticalStockouts,
      totalEstimatedCost,
      formattedEstimatedCost,
      items: reorderItems.slice(0, 15), // Top 15 items
    },
    slotting: {
      totalRecommendations: slottingItems.length,
      items: slottingItems.slice(0, 10),
    },
  }
}



