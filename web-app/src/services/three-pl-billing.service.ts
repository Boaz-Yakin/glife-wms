"use server"

import { createClient } from "@supabase/supabase-js"
import { getCurrentTenant } from "@/lib/tenant/context"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface ClientBillingContract {
  id?: string
  tenant_id: string
  client_id: string
  daily_pallet_storage_fee: number
  daily_chilled_pallet_fee: number
  daily_cbm_storage_fee: number
  inbound_handling_fee_per_box: number
  outbound_picking_fee_per_ea: number
  packing_fee_per_order: number
  billing_currency: string
}

export interface Daily3PlLedger {
  id: string
  client_id: string
  record_date: string
  pallet_count: number
  chilled_pallet_count: number
  storage_fee: number
  inbound_boxes: number
  inbound_fee: number
  outbound_items_count: number
  outbound_orders_count: number
  handling_fee: number
  total_daily_fee: number
}

export interface ClientSettlementSummary {
  clientId: string
  clientName: string
  clientCode: string
  settlementMonth: string
  currency: string
  totalStorageFee: number
  totalInboundFee: number
  totalHandlingFee: number
  grandTotal: number
  avgPalletCount: number
  totalOutboundOrders: number
  totalOutboundItems: number
  contract: ClientBillingContract
  dailyRecords: Daily3PlLedger[]
}

/**
 * 특정 화주사의 3PL 요율표 계약 조회
 */
export async function getClientBillingContract(
  clientId: string
): Promise<{ contract: ClientBillingContract | null; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("client_billing_contracts")
      .select("*")
      .eq("tenant_id", tenantCtx.tenantId)
      .eq("client_id", clientId)
      .maybeSingle()

    if (error || !data) {
      // 기본 요율 반환
      return {
        contract: {
          tenant_id: tenantCtx.tenantId,
          client_id: clientId,
          daily_pallet_storage_fee: 800,
          daily_chilled_pallet_fee: 1500,
          daily_cbm_storage_fee: 1200,
          inbound_handling_fee_per_box: 150,
          outbound_picking_fee_per_ea: 100,
          packing_fee_per_order: 500,
          billing_currency: "KRW",
        },
        error: null,
      }
    }

    return { contract: data as any, error: null }
  } catch (err: any) {
    return { contract: null, error: err.message }
  }
}

/**
 * 화주사 3PL 계약 요율 저장/갱신
 */
export async function saveClientBillingContract(
  contract: Partial<ClientBillingContract> & { client_id: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { error } = await supabase.from("client_billing_contracts").upsert(
      {
        tenant_id: tenantCtx.tenantId,
        client_id: contract.client_id,
        daily_pallet_storage_fee: Number(contract.daily_pallet_storage_fee ?? 800),
        daily_chilled_pallet_fee: Number(contract.daily_chilled_pallet_fee ?? 1500),
        daily_cbm_storage_fee: Number(contract.daily_cbm_storage_fee ?? 1200),
        inbound_handling_fee_per_box: Number(contract.inbound_handling_fee_per_box ?? 150),
        outbound_picking_fee_per_ea: Number(contract.outbound_picking_fee_per_ea ?? 100),
        packing_fee_per_order: Number(contract.packing_fee_per_order ?? 500),
        billing_currency: contract.billing_currency || "KRW",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id, client_id" }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 특정 화주사의 당월 3PL 보관/작업 정산 상세 조회
 */
export async function getClientMonthlySettlement(
  clientId: string,
  targetMonth?: string
): Promise<{ summary: ClientSettlementSummary | null; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const now = new Date()
    const month = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // 1. 화주사 정보 조회
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, code")
      .eq("id", clientId)
      .single()

    if (clientErr || !client) {
      return { summary: null, error: `Client '${clientId}' not found.` }
    }

    // 2. 계약 요율 조회
    const { contract } = await getClientBillingContract(clientId)

    // 3. 당월 일별 정산 원장 조회
    const { data: records, error: recordsErr } = await supabase
      .from("third_party_logistics_ledger")
      .select("*")
      .eq("tenant_id", tenantCtx.tenantId)
      .eq("client_id", clientId)
      .eq("settlement_month", month)
      .order("record_date", { ascending: false })

    const dailyRecords: Daily3PlLedger[] = records || []

    // 4. 합산 지표 산출
    let totalStorageFee = 0
    let totalInboundFee = 0
    let totalHandlingFee = 0
    let totalPallets = 0
    let totalOrders = 0
    let totalItems = 0

    dailyRecords.forEach((r) => {
      totalStorageFee += Number(r.storage_fee || 0)
      totalInboundFee += Number(r.inbound_fee || 0)
      totalHandlingFee += Number(r.handling_fee || 0)
      totalPallets += Number(r.pallet_count || 0) + Number(r.chilled_pallet_count || 0)
      totalOrders += Number(r.outbound_orders_count || 0)
      totalItems += Number(r.outbound_items_count || 0)
    })

    const grandTotal = totalStorageFee + totalInboundFee + totalHandlingFee
    const avgPalletCount =
      dailyRecords.length > 0 ? Math.round((totalPallets / dailyRecords.length) * 10) / 10 : 0

    return {
      summary: {
        clientId: client.id,
        clientName: client.name,
        clientCode: client.code,
        settlementMonth: month,
        currency: contract?.billing_currency || "KRW",
        totalStorageFee,
        totalInboundFee,
        totalHandlingFee,
        grandTotal,
        avgPalletCount,
        totalOutboundOrders: totalOrders,
        totalOutboundItems: totalItems,
        contract: contract!,
        dailyRecords,
      },
      error: null,
    }
  } catch (err: any) {
    return { summary: null, error: err.message }
  }
}

/**
 * 모든 3PL 화주사의 월간 정산 개요 목록 조회
 */
export async function getAllClientsMonthlyOverview(
  targetMonth?: string
): Promise<{
  summaries: ClientSettlementSummary[]
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, code")
      .order("name", { ascending: true })

    if (error || !clients) {
      return { summaries: [], error: error?.message || "Failed to fetch clients" }
    }

    const summaries = await Promise.all(
      clients.map(async (c) => {
        const { summary } = await getClientMonthlySettlement(c.id, targetMonth)
        return summary
      })
    )

    return {
      summaries: summaries.filter(Boolean) as ClientSettlementSummary[],
      error: null,
    }
  } catch (err: any) {
    return { summaries: [], error: err.message }
  }
}

/**
 * 수동 정산 배치 실행 (당일 기준)
 */
export async function triggerDailySettlementCalculationAction(
  targetDate?: string
): Promise<{ success: boolean; message: string; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()
    const date = targetDate || new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase.rpc("calculate_daily_3pl_settlement", {
      p_tenant_id: tenantCtx.tenantId,
      p_date: date,
    })

    if (error) {
      return { success: false, message: "", error: error.message }
    }

    return {
      success: true,
      message: `${date} 일자 3PL 보관/작업 정산이 완료되었습니다. (${data?.processed_clients || 0}개 화주사 처리됨)`,
      error: null,
    }
  } catch (err: any) {
    return { success: false, message: "", error: err.message }
  }
}

/**
 * 3PL 화주사 월간 정산 명세서 CSV 생성
 */
export async function generateClientInvoiceCsv(
  clientId: string,
  targetMonth: string
): Promise<{ csv: string; filename: string; error: string | null }> {
  try {
    const { summary, error } = await getClientMonthlySettlement(clientId, targetMonth)
    if (error || !summary) throw new Error(error || "Client settlement not found")

    const headers = [
      "정산일자",
      "상온 파렛트(PLT)",
      "냉장/냉동 파렛트(PLT)",
      "일일 보관료(원)",
      "입고 박스",
      "입고 하역비(원)",
      "출고 피킹수량(EA)",
      "출고 주문수(건)",
      "하역/포장비(원)",
      "일일 합계 금액(원)",
    ]

    const rows = summary.dailyRecords.map((r) => [
      r.record_date,
      r.pallet_count,
      r.chilled_pallet_count,
      r.storage_fee,
      r.inbound_boxes,
      r.inbound_fee,
      r.outbound_items_count,
      r.outbound_orders_count,
      r.handling_fee,
      r.total_daily_fee,
    ])

    const totalRow = [
      "월간 합계",
      "-",
      "-",
      summary.totalStorageFee,
      "-",
      summary.totalInboundFee,
      summary.totalOutboundItems,
      summary.totalOutboundOrders,
      summary.totalHandlingFee,
      summary.grandTotal,
    ]

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(",")), totalRow.join(",")].join("\n")
    const filename = `3PL-Settlement-${summary.clientCode}-${summary.settlementMonth}.csv`

    return { csv: csvContent, filename, error: null }
  } catch (err: any) {
    return { csv: "", filename: "", error: err.message }
  }
}
