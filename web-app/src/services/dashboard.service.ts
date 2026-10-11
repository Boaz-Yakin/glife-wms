import { createClient } from '@/lib/supabase/server'
import { getActiveClientAction } from '@/app/actions/client.actions'

export async function getDashboardKpis() {
  const supabase = await createClient()
  const activeClientId = await getActiveClientAction()

  // 1. 당일 출고 완료 (DISPATCHED)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let dispatchedQuery = (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DISPATCHED')
    .gte('updated_at', today.toISOString())
  if (activeClientId) {
    dispatchedQuery = dispatchedQuery.eq('client_id', activeClientId)
  }
  const { count: dispatchedCount } = await dispatchedQuery

  // 2. 진행 중 피킹 (PICKING)
  let pickingQuery = (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PICKING')
  if (activeClientId) {
    pickingQuery = pickingQuery.eq('client_id', activeClientId)
  }
  const { count: pickingCount } = await pickingQuery

  // 3. 긴급 실사 대기 (PENDING in cycle_count_requests)
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

  // 4. 재고 부족 알림 (on_hand_qty < 10)
  let lowStockQuery = (supabase as any)
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .lt('on_hand_qty', 10)
  if (activeClientId) {
    lowStockQuery = lowStockQuery.eq('client_id', activeClientId)
  }
  const { count: lowStockCount } = await lowStockQuery

  return {
    dispatchedCount: dispatchedCount || 0,
    pickingCount: pickingCount || 0,
    cycleCountPending: cycleCount,
    lowStockCount: lowStockCount || 0,
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

export async function getHourlyPickingProgress() {
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


