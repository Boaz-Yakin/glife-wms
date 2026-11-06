"use server"

import { createClient } from "@supabase/supabase-js"
import { getCurrentTenant } from "@/lib/tenant/context"
import { PLANS, PlanTier } from "@/lib/billing/plans"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface UsageMeteringSummary {
  tenantId: string
  periodMonth: string // 'YYYY-MM'
  planTier: PlanTier
  basePrice: number
  // 계정 미터링 (Seats)
  activeSeats: number
  maxSeats: number // -1: 무제한
  seatOverage: number
  seatUnitPrice: number
  seatOverageCharge: number
  // 주문 처리량 미터링 (Orders)
  monthlyOrders: number
  maxOrders: number // -1: 무제한
  orderOverage: number
  orderUnitPrice: number
  orderOverageCharge: number
  // 총액
  totalOverageCharge: number
  totalEstimatedBill: number
  lastSyncedAt: string
}

/**
 * 테넌트 WMS 핵심 자원(작업자 계정, 당월 주문량) 실시간 사용량 집계 및 미터링 원장 동기화
 */
export async function getTenantUsageMetering(
  targetTenantId?: string
): Promise<{
  usage: UsageMeteringSummary | null
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const tenantId = targetTenantId || tenantCtx.tenantId
    const supabase = getAdminClient()

    const now = new Date()
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    // 1. 구독 플랜 조회
    const { data: subData } = await supabase
      .from("tenant_subscriptions")
      .select("plan_tier, billing_cycle")
      .eq("tenant_id", tenantId)
      .maybeSingle()

    const planTier: PlanTier = (subData?.plan_tier as PlanTier) || "STARTER"
    const billingCycle = subData?.billing_cycle || "MONTHLY"
    const planConfig = PLANS[planTier] || PLANS.STARTER

    const basePrice =
      billingCycle === "ANNUAL"
        ? planConfig.priceAnnualMonthly
        : planConfig.priceMonthly

    // 2. 활성 사용자(작업자 계정) 수 집계
    const { count: activeUsersCount, error: usersErr } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")

    if (usersErr) {
      console.warn("Failed to count active users for metering:", usersErr.message)
    }

    const activeSeats = activeUsersCount ?? 1

    // 3. 당월 주문 처리량 집계
    const { count: ordersCount, error: ordersErr } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth)

    if (ordersErr) {
      console.warn("Failed to count monthly orders for metering:", ordersErr.message)
    }

    const monthlyOrders = ordersCount ?? 0

    // 4. 계정 초과 계산
    const maxSeats = planConfig.maxSeats
    const seatOverage =
      maxSeats > 0 && activeSeats > maxSeats ? activeSeats - maxSeats : 0
    const seatOverageCharge = seatOverage * planConfig.extraSeatPrice

    // 5. 주문 초과 계산
    const maxOrders = planConfig.maxMonthlyOrders
    const orderOverage =
      maxOrders > 0 && monthlyOrders > maxOrders ? monthlyOrders - maxOrders : 0
    const orderOverageCharge = Math.round(orderOverage * planConfig.extraOrderPrice * 100) / 100

    const totalOverageCharge =
      Math.round((seatOverageCharge + orderOverageCharge) * 100) / 100
    const totalEstimatedBill =
      Math.round((basePrice + totalOverageCharge) * 100) / 100

    // 6. DB tenant_usage_meters 원장 동기화 (비동기 안전 처리)
    try {
      await Promise.all([
        supabase.from("tenant_usage_meters").upsert(
          {
            tenant_id: tenantId,
            metric_type: "ADDITIONAL_SEAT",
            usage_count: seatOverage,
            period_month: periodMonth,
            unit_price: planConfig.extraSeatPrice,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id, metric_type, period_month" }
        ),
        supabase.from("tenant_usage_meters").upsert(
          {
            tenant_id: tenantId,
            metric_type: "ORDER_OVERAGE",
            usage_count: orderOverage,
            period_month: periodMonth,
            unit_price: planConfig.extraOrderPrice,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id, metric_type, period_month" }
        ),
      ])
    } catch (syncErr) {
      // DDL 테이블 미적용 환경이어도 사용자 경험이 중단되지 않도록 안전 로깅
      console.warn("Usage meter DB sync skipped (table might be initializing):", syncErr)
    }

    return {
      usage: {
        tenantId,
        periodMonth,
        planTier,
        basePrice,
        activeSeats,
        maxSeats,
        seatOverage,
        seatUnitPrice: planConfig.extraSeatPrice,
        seatOverageCharge,
        monthlyOrders,
        maxOrders,
        orderOverage,
        orderUnitPrice: planConfig.extraOrderPrice,
        orderOverageCharge,
        totalOverageCharge,
        totalEstimatedBill,
        lastSyncedAt: new Date().toISOString(),
      },
      error: null,
    }
  } catch (err: any) {
    console.error("getTenantUsageMetering error:", err)
    return {
      usage: null,
      error: err.message || "Failed to calculate usage metering",
    }
  }
}
