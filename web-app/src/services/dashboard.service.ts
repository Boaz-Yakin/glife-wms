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

  return [
    { name: "Available", value: totalAvailable, color: "#10b981" },
    { name: "Allocated", value: totalAllocated, color: "#f59e0b" },
    { name: "Shortage/Damaged", value: 0, color: "#ef4444" },
  ]
}

