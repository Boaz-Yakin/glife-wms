"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { PlanTier, canAccessFeature, FeatureKey, PLANS } from "@/lib/billing/plans"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface TenantSubscription {
  id: string
  tenant_id: string
  plan_tier: PlanTier
  billing_cycle: "MONTHLY" | "ANNUAL"
  status: "ACTIVE" | "PAST_DUE" | "TRIALING" | "CANCELED"
  payment_method: string
  card_info?: {
    card_company?: string
    last4?: string
  } | null
  current_period_start: string
  current_period_end: string
  trial_end_at?: string | null
  created_at: string
  updated_at: string
}

export interface BillingInvoice {
  id: string
  tenant_id: string
  invoice_number: string
  plan_tier: string
  base_amount: number
  usage_amount: number
  discount_amount: number
  total_amount: number
  payment_status: "PAID" | "PENDING" | "FAILED"
  payment_method?: string | null
  paid_at?: string | null
  receipt_url?: string | null
  created_at: string
}

/**
 * 테넌트 구독 정보 조회
 */
export async function getTenantSubscription(tenantId?: string): Promise<{
  subscription: TenantSubscription | null
  error: string | null
}> {
  const supabase = getAdminClient()

  let query = (supabase as any)
    .from("tenant_subscriptions")
    .select("*")

  if (tenantId) {
    query = query.eq("tenant_id", tenantId)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.error("getTenantSubscription error:", error)
    return { subscription: null, error: error.message }
  }

  // Fallback default if not yet seeded
  if (!data) {
    return {
      subscription: {
        id: "default_sub",
        tenant_id: tenantId || "00000000-0000-0000-0000-000000000001",
        plan_tier: "ENTERPRISE",
        billing_cycle: "MONTHLY",
        status: "ACTIVE",
        payment_method: "CARD",
        card_info: { card_company: "현대카드", last4: "8821" },
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    }
  }

  return { subscription: data as TenantSubscription, error: null }
}

/**
 * 인보이스 및 결제 내역 목록 조회
 */
export async function getBillingInvoices(tenantId?: string): Promise<{
  invoices: BillingInvoice[]
  error: string | null
}> {
  const supabase = getAdminClient()

  let query = (supabase as any)
    .from("billing_invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)

  if (tenantId) {
    query = query.eq("tenant_id", tenantId)
  }

  const { data, error } = await query

  if (error) {
    console.error("getBillingInvoices error:", error)
    return { invoices: [], error: error.message }
  }

  return { invoices: (data || []) as BillingInvoice[], error: null }
}

/**
 * 구독 플랜 변경 (업그레이드 / 다운그레이드)
 */
export async function changeSubscriptionPlan({
  planTier,
  billingCycle = "MONTHLY",
}: {
  planTier: PlanTier
  billingCycle?: "MONTHLY" | "ANNUAL"
}) {
  const supabase = getAdminClient()

  const { data: sub } = await (supabase as any)
    .from("tenant_subscriptions")
    .select("id, tenant_id")
    .limit(1)
    .single()

  const targetPlan = PLANS[planTier]
  const amount = billingCycle === "ANNUAL"
    ? targetPlan.priceAnnualMonthly * 12
    : targetPlan.priceMonthly

  if (sub) {
    // 1. 구독 정보 갱신
    await (supabase as any)
      .from("tenant_subscriptions")
      .update({
        plan_tier: planTier,
        billing_cycle: billingCycle,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id)

    // 2. 신규 인보이스 생성
    const invoiceNo = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`
    await (supabase as any)
      .from("billing_invoices")
      .insert([
        {
          tenant_id: sub.tenant_id,
          invoice_number: invoiceNo,
          plan_tier: planTier,
          base_amount: amount,
          usage_amount: 0,
          discount_amount: billingCycle === "ANNUAL" ? targetPlan.priceMonthly * 12 - amount : 0,
          total_amount: amount,
          payment_status: "PAID",
          paid_at: new Date().toISOString(),
        },
      ])
  }

  return { success: true }
}

/**
 * 서버 사이드 특정 기능 권한 확인
 */
export async function verifyFeatureAccess(feature: FeatureKey): Promise<boolean> {
  const { subscription } = await getTenantSubscription()
  const plan = subscription?.plan_tier || "STARTER"
  return canAccessFeature(plan, feature)
}
