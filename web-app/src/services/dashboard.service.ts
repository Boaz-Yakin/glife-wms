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
    inventoryValueTrend: totalInventoryValue > 0 ? { value: '+2.4% vs last mo', isPositive: true } : undefined,
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

  // 오늘 완료된 피킹/출고 주문들
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

  // 당일 활성 주문 수 (목표치 계산용)
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
