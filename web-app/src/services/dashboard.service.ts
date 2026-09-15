import { createClient } from '@/lib/supabase/server'

export async function getDashboardKpis() {
  const supabase = await createClient()

  // 1. 당일 출고 완료 (DISPATCHED)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: dispatchedCount } = await (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'DISPATCHED')
    .gte('updated_at', today.toISOString())

  // 2. 진행 중 피킹 (PICKING)
  const { count: pickingCount } = await (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PICKING')

  // 3. 긴급 실사 대기 (PENDING in cycle_count_requests)
  // Assuming cycle_count_requests exists as planned. If not, this might fail or return null.
  // We'll wrap in try-catch just in case the table is missing in the real DB.
  let cycleCount = 0
  try {
    const { count } = await (supabase as any)
      .from('cycle_count_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
    cycleCount = count || 0
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  // 4. 재고 부족 알림 (on_hand_qty < 10)
  const { count: lowStockCount } = await (supabase as any)
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .lt('on_hand_qty', 10)

  return {
    dispatchedCount: dispatchedCount || 0,
    pickingCount: pickingCount || 0,
    cycleCountPending: cycleCount,
    lowStockCount: lowStockCount || 0,
  }
}
