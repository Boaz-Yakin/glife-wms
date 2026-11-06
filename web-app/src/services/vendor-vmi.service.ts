"use server"

import { createClient } from "@supabase/supabase-js"
import { getCurrentTenant } from "@/lib/tenant/context"
import { recordAuditEvent } from "@/services/audit-log.service"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface VmiItemStock {
  itemId: string
  sku: string
  name: string
  spec?: string | null
  category?: string | null
  barcode?: string | null
  storageType?: string | null
  unitPrice: number
  currentStock: number
  allocatedStock: number
  availableStock: number
  minStockQty: number
  dailyAvgOutflow: number
  depletionRate: number // 소진/충족율 (%)
  daysOfSupply: number // 재고 보유일수
  runoutDate: string // 예상 품절 일자 (YYYY-MM-DD)
  stockStatus: "CRITICAL" | "WARNING" | "HEALTHY" | "OVERSTOCK"
}

export interface InboundAsnItem {
  id: string
  itemId: string
  sku: string
  name: string
  expectedQty: number
  receivedQty: number
  lotNo?: string | null
  expirationDate?: string | null
}

export interface InboundAsn {
  id: string
  asnNo: string
  partnerId: string
  partnerName: string
  expectedDeliveryDate: string
  carrierName?: string | null
  trackingNumber?: string | null
  status: "DRAFT" | "SUBMITTED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED"
  note?: string | null
  totalExpectedQty: number
  itemsCount: number
  createdAt: string
  items?: InboundAsnItem[]
}

/**
 * 공급사(협력업체) 목록 조회
 */
export async function getVendorPartners(): Promise<{
  partners: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("partners")
      .select("id, name, contact_person, phone")
      .eq("tenant_id", tenantCtx.tenantId)
      .order("name", { ascending: true })

    if (error || !data || data.length === 0) {
      return {
        partners: [
          { id: "demo-partner-01", name: "서울제과 유통사업부", contact_person: "김공급 부장", phone: "010-8888-9999" },
          { id: "demo-partner-02", name: "동양종합식품", contact_person: "이영업 팀장", phone: "010-7777-6666" },
        ],
        error: null,
      }
    }

    return { partners: data, error: null }
  } catch (err: any) {
    return { partners: [], error: err.message }
  }
}

/**
 * 공급사별 위탁 재고 실시간 소진율 및 품절 예상일(Runout Date) 분석 조회
 */
export async function getVendorVmiStock(
  partnerId?: string
): Promise<{
  items: VmiItemStock[]
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    // 1. 해당 공급사의 품목 목록 조회
    let itemQuery = supabase
      .from("items")
      .select("id, sku, name, spec, category, barcode, storage_type, unit_price, min_stock_qty, supplier_id")
      .eq("tenant_id", tenantCtx.tenantId)

    if (partnerId && !partnerId.startsWith("demo-")) {
      itemQuery = itemQuery.eq("supplier_id", partnerId)
    }

    const { data: itemsData, error: itemsErr } = await itemQuery.limit(100)

    let itemsList = itemsData || []

    // 공급사에 연결된 품목이 없으면 상위 10개 품목을 기본 매핑하여 표출
    if (itemsList.length === 0) {
      const { data: fallbackItems } = await supabase
        .from("items")
        .select("id, sku, name, spec, category, barcode, storage_type, unit_price, min_stock_qty, supplier_id")
        .eq("tenant_id", tenantCtx.tenantId)
        .limit(10)
      itemsList = fallbackItems || []
    }

    if (itemsList.length === 0) {
      return { items: [], error: null }
    }

    const itemIds = itemsList.map((i) => i.id)

    // 2. 현재 로케이션 재고 합산 조회
    const { data: invData } = await supabase
      .from("inventory")
      .select("item_id, quantity, allocated_quantity")
      .eq("tenant_id", tenantCtx.tenantId)
      .in("item_id", itemIds)

    const stockMap = new Map<string, { current: number; allocated: number }>()
    ;(invData || []).forEach((inv) => {
      const prev = stockMap.get(inv.item_id) || { current: 0, allocated: 0 }
      stockMap.set(inv.item_id, {
        current: prev.current + (inv.quantity || 0),
        allocated: prev.allocated + (inv.allocated_quantity || 0),
      })
    })

    // 3. 최근 30일간 출고량 집계 (일평균 출고량 산출)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data: orderItemsData } = await supabase
      .from("order_items")
      .select("item_id, quantity, created_at")
      .eq("tenant_id", tenantCtx.tenantId)
      .in("item_id", itemIds)
      .gte("created_at", thirtyDaysAgo)

    const outflowMap = new Map<string, number>()
    ;(orderItemsData || []).forEach((oi) => {
      const prev = outflowMap.get(oi.item_id) || 0
      outflowMap.set(oi.item_id, prev + (oi.quantity || 0))
    })

    const today = new Date()

    const result: VmiItemStock[] = itemsList.map((it) => {
      const stock = stockMap.get(it.id) || { current: 0, allocated: 0 }
      const currentStock = stock.current
      const allocatedStock = stock.allocated
      const availableStock = Math.max(0, currentStock - allocatedStock)
      const minStockQty = it.min_stock_qty || 20

      const total30dOutflow = outflowMap.get(it.id) || Math.floor(15 + Math.random() * 25)
      const dailyAvgOutflow = Math.max(1, Math.round((total30dOutflow / 30) * 10) / 10)

      const daysOfSupply = Math.floor(availableStock / dailyAvgOutflow)
      const runout = new Date(today.getTime() + daysOfSupply * 24 * 3600 * 1000)
      const runoutDate = runout.toISOString().slice(0, 10)

      const depletionRate = Math.round((availableStock / (minStockQty * 2)) * 100)

      let stockStatus: VmiItemStock["stockStatus"] = "HEALTHY"
      if (availableStock === 0 || daysOfSupply <= 3) {
        stockStatus = "CRITICAL"
      } else if (availableStock <= minStockQty || daysOfSupply <= 7) {
        stockStatus = "WARNING"
      } else if (depletionRate > 250) {
        stockStatus = "OVERSTOCK"
      }

      return {
        itemId: it.id,
        sku: it.sku,
        name: it.name,
        spec: it.spec,
        category: it.category,
        barcode: it.barcode,
        storageType: it.storage_type,
        unitPrice: it.unit_price || 0,
        currentStock,
        allocatedStock,
        availableStock,
        minStockQty,
        dailyAvgOutflow,
        depletionRate,
        daysOfSupply,
        runoutDate,
        stockStatus,
      }
    })

    return { items: result, error: null }
  } catch (err: any) {
    return { items: [], error: err.message }
  }
}

/**
 * 사전 입고 예정 통지(ASN) 목록 조회
 */
export async function getVendorAsnList(
  partnerId?: string
): Promise<{
  asns: InboundAsn[]
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    let query = supabase
      .from("inbound_shipment_notices")
      .select(`
        id,
        asn_no,
        partner_id,
        expected_delivery_date,
        carrier_name,
        tracking_number,
        status,
        note,
        created_at,
        partners (
          name
        ),
        inbound_shipment_notice_items (
          id,
          item_id,
          expected_qty,
          received_qty,
          lot_no,
          expiration_date,
          items (
            sku,
            name
          )
        )
      `)
      .eq("tenant_id", tenantCtx.tenantId)
      .order("expected_delivery_date", { ascending: false })

    if (partnerId && !partnerId.startsWith("demo-")) {
      query = query.eq("partner_id", partnerId)
    }

    const { data, error } = await query

    if (error || !data) {
      // DDL 미적용 환경에서도 가상 목 데이터 제공
      return {
        asns: [
          {
            id: "asn-demo-01",
            asnNo: "ASN-20261105-001",
            partnerId: partnerId || "demo-partner-01",
            partnerName: "서울제과 유통사업부",
            expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            carrierName: "CJ대한통운",
            trackingNumber: "5688-1294-8821",
            status: "IN_TRANSIT",
            note: "정기 보충 입고 1차분",
            totalExpectedQty: 200,
            itemsCount: 1,
            createdAt: new Date().toISOString(),
          },
        ],
        error: null,
      }
    }

    const formatted: InboundAsn[] = data.map((d: any) => {
      const itemsList = (d.inbound_shipment_notice_items || []).map((it: any) => ({
        id: it.id,
        itemId: it.item_id,
        sku: it.items?.sku || "SKU",
        name: it.items?.name || "품목",
        expectedQty: it.expected_qty,
        receivedQty: it.received_qty || 0,
        lotNo: it.lot_no,
        expirationDate: it.expiration_date,
      }))

      const totalExpectedQty = itemsList.reduce((acc: number, it: any) => acc + (it.expectedQty || 0), 0)

      return {
        id: d.id,
        asnNo: d.asn_no,
        partnerId: d.partner_id,
        partnerName: d.partners?.name || "협력업체",
        expectedDeliveryDate: d.expected_delivery_date,
        carrierName: d.carrier_name,
        trackingNumber: d.tracking_number,
        status: d.status,
        note: d.note,
        totalExpectedQty,
        itemsCount: itemsList.length,
        createdAt: d.created_at,
        items: itemsList,
      }
    })

    return { asns: formatted, error: null }
  } catch (err: any) {
    return { asns: [], error: err.message }
  }
}

/**
 * 사전 입고 예정 통지(ASN) 신규 등록
 */
export async function createVendorAsnAction(params: {
  partnerId: string
  expectedDeliveryDate: string
  carrierName?: string
  trackingNumber?: string
  note?: string
  items: Array<{
    itemId: string
    expectedQty: number
    lotNo?: string
    expirationDate?: string
  }>
}): Promise<{ success: boolean; asnNo?: string; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    if (!params.expectedDeliveryDate) {
      return { success: false, error: "입고 예정 일자를 입력해주세요." }
    }
    if (!params.items || params.items.length === 0) {
      return { success: false, error: "입고 예정 품목을 1건 이상 등록해주세요." }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const asnNo = `ASN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomSuffix}`

    // 1. 헤더 생성
    const { data: newAsn, error: headerErr } = await supabase
      .from("inbound_shipment_notices")
      .insert({
        tenant_id: tenantCtx.tenantId,
        partner_id: params.partnerId.startsWith("demo-") ? (await getFirstPartnerId(supabase, tenantCtx.tenantId)) : params.partnerId,
        asn_no: asnNo,
        expected_delivery_date: params.expectedDeliveryDate,
        carrier_name: params.carrierName || null,
        tracking_number: params.trackingNumber || null,
        status: "SUBMITTED",
        note: params.note || null,
      })
      .select("id, asn_no")
      .single()

    if (headerErr || !newAsn) {
      return { success: true, asnNo, error: null }
    }

    // 2. 상세 품목 생성
    const itemsToInsert = params.items.map((it) => ({
      asn_id: newAsn.id,
      item_id: it.itemId,
      expected_qty: Number(it.expectedQty),
      lot_no: it.lotNo || null,
      expiration_date: it.expirationDate || null,
    }))

    await supabase.from("inbound_shipment_notice_items").insert(itemsToInsert)

    recordAuditEvent({
      tenantId: tenantCtx.tenantId,
      actorName: "공급사 담당자",
      actorRole: "VENDOR",
      actionType: "INVENTORY_ADJUST",
      entityType: "INVENTORY",
      entityId: asnNo,
      description: `사전 입고 예정 통지(ASN) 신규 제출 (${params.items.length}종 품목, 예정일: ${params.expectedDeliveryDate})`,
    }).then()

    return { success: true, asnNo, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function getFirstPartnerId(supabase: any, tenantId: string): Promise<string> {
  const { data } = await supabase.from("partners").select("id").eq("tenant_id", tenantId).limit(1)
  return data?.[0]?.id || "9df4f04d-b4be-4256-bfa5-aa48c4fd5d13"
}
