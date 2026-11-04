"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveClientAction } from "@/app/actions/client.actions"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type PriceTier = "VIP" | "WHOLESALE" | "STANDARD" | "RETAIL"

export interface StoreItemPriceData {
  id: string
  tenant_id: string
  client_id?: string | null
  store_id?: string | null
  price_tier?: PriceTier | null
  item_id: string
  uom: string
  custom_price: number
  note?: string | null
  created_at: string
  updated_at: string

  // joined fields
  store?: { id: string; name: string; store_no: string } | null
  item?: {
    id: string
    name_en: string
    sku: string
    unit_price?: number | null
    box_price?: number | null
    pack_price?: number | null
  } | null
  client?: { id: string; name: string; code: string } | null
}

export interface GetStoreItemPricesParams {
  clientId?: string | null
  storeId?: string | null
  priceTier?: PriceTier | null
  search?: string
  page?: number
  limit?: number
}

/**
 * B2B 테넌트별 등급 및 매장 맞춤 특수 단가 목록 조회
 */
export async function getStoreItemPrices({
  clientId,
  storeId,
  priceTier,
  search = "",
  page = 1,
  limit = 50,
}: GetStoreItemPricesParams = {}) {
  const supabase = getAdminClient()

  let query = (supabase as any)
    .from("store_item_prices")
    .select(`
      *,
      store:stores(id, name, store_no),
      item:items(id, name_en, sku, unit_price, box_price, pack_price),
      client:clients(id, name, code)
    `, { count: "exact" })

  const effectiveClientId = clientId !== undefined ? clientId : await getActiveClientAction()
  if (effectiveClientId) {
    query = query.eq("client_id", effectiveClientId)
  }

  if (storeId) {
    query = query.eq("store_id", storeId)
  }

  if (priceTier) {
    query = query.eq("price_tier", priceTier)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await query
    .range(from, to)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getStoreItemPrices error:", error)
    return { data: [], count: 0, error: error.message }
  }

  let filtered = data || []
  if (search.trim()) {
    const s = search.trim().toLowerCase()
    filtered = filtered.filter((row: any) =>
      row.item?.name_en?.toLowerCase().includes(s) ||
      row.item?.sku?.toLowerCase().includes(s) ||
      row.store?.name?.toLowerCase().includes(s) ||
      row.store?.store_no?.toLowerCase().includes(s)
    )
  }

  return { data: filtered as StoreItemPriceData[], count: count || 0, error: null }
}

/**
 * 특수 단가 등록 또는 수정 (Upsert)
 */
export async function upsertStoreItemPrice(payload: {
  id?: string
  tenantId?: string
  clientId?: string | null
  storeId?: string | null
  priceTier?: PriceTier | null
  itemId: string
  uom: string
  customPrice: number
  note?: string | null
}) {
  const supabase = getAdminClient()

  if (!payload.itemId) return { error: "Item is required" }
  if (payload.customPrice < 0) return { error: "Price cannot be negative" }
  if (!payload.storeId && !payload.priceTier) {
    return { error: "Either Store or Price Tier must be specified" }
  }

  const record: any = {
    item_id: payload.itemId,
    uom: (payload.uom || "EA").toUpperCase(),
    custom_price: payload.customPrice,
    note: payload.note || null,
    updated_at: new Date().toISOString(),
  }

  if (payload.clientId) record.client_id = payload.clientId
  if (payload.storeId) record.store_id = payload.storeId
  if (payload.priceTier) record.price_tier = payload.priceTier

  let result
  if (payload.id) {
    result = await (supabase as any)
      .from("store_item_prices")
      .update(record)
      .eq("id", payload.id)
      .select()
      .single()
  } else {
    // If tenant_id not provided, fetch default or first tenant
    const { data: tenant } = await (supabase as any).from("tenants").select("id").limit(1).single()
    record.tenant_id = payload.tenantId || tenant?.id || "00000000-0000-0000-0000-000000000001"
    result = await (supabase as any)
      .from("store_item_prices")
      .insert([record])
      .select()
      .single()
  }

  if (result.error) {
    console.error("upsertStoreItemPrice error:", result.error)
    return { data: null, error: result.error.message }
  }

  return { data: result.data, error: null }
}

/**
 * 특수 단가 삭제
 */
export async function deleteStoreItemPrice(id: string) {
  const supabase = getAdminClient()
  const { error } = await (supabase as any)
    .from("store_item_prices")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("deleteStoreItemPrice error:", error)
    return { error: error.message }
  }
  return { success: true }
}

/**
 * B2B 단가 해석 엔진 (Hierarchical Pricing Resolver)
 * 1순위: 매장별 특수 지정가 (Store Custom Price)
 * 2순위: 거래처 등급별 지정가 (Price Tier Override: VIP / WHOLESALE / STANDARD)
 * 3순위: 기본 마스터 품목 UOM 단가 (Master Unit / Box / Pack Price)
 */
export async function resolveEffectiveItemPrice({
  storeId,
  priceTier,
  itemId,
  uom = "EA",
  defaultPrice = 0,
}: {
  storeId?: string | null
  priceTier?: PriceTier | null
  itemId: string
  uom?: string
  defaultPrice?: number
}): Promise<{ effectivePrice: number; priceSource: "STORE_CUSTOM" | "TIER_CUSTOM" | "MASTER_BASE" }> {
  const supabase = getAdminClient()
  const normalizedUom = uom.trim().toUpperCase()

  // 1. 매장 전용 지정가 조회
  if (storeId) {
    const { data: storePrice } = await (supabase as any)
      .from("store_item_prices")
      .select("custom_price")
      .eq("store_id", storeId)
      .eq("item_id", itemId)
      .eq("uom", normalizedUom)
      .limit(1)
      .single()

    if (storePrice && Number(storePrice.custom_price) >= 0) {
      return {
        effectivePrice: Number(storePrice.custom_price),
        priceSource: "STORE_CUSTOM",
      }
    }
  }

  // 2. 등급별 지정가 조회 (VIP, WHOLESALE 등)
  if (priceTier) {
    const { data: tierPrice } = await (supabase as any)
      .from("store_item_prices")
      .select("custom_price")
      .is("store_id", null)
      .eq("price_tier", priceTier)
      .eq("item_id", itemId)
      .eq("uom", normalizedUom)
      .limit(1)
      .single()

    if (tierPrice && Number(tierPrice.custom_price) >= 0) {
      return {
        effectivePrice: Number(tierPrice.custom_price),
        priceSource: "TIER_CUSTOM",
      }
    }
  }

  // 3. 기본 마스터 단가 적용
  return {
    effectivePrice: defaultPrice,
    priceSource: "MASTER_BASE",
  }
}

export interface CreditLimitCheckResult {
  allowed: boolean
  store_id?: string
  store_name?: string
  price_tier?: PriceTier
  credit_limit: number
  current_balance: number
  order_amount: number
  projected_balance: number
  remaining_credit: number
  reason: string
}

/**
 * 매장 여신(외상 발주) 한도 실시간 검증
 */
export async function checkStoreCreditLimit(
  storeId: string,
  orderAmount: number
): Promise<CreditLimitCheckResult> {
  const supabase = getAdminClient()

  const { data, error } = await (supabase as any).rpc("check_store_credit_limit", {
    p_store_id: storeId,
    p_order_amount: orderAmount,
  })

  if (error) {
    console.error("checkStoreCreditLimit RPC error:", error)
    // Fallback: direct query
    const { data: store } = await (supabase as any)
      .from("stores")
      .select("id, name, price_tier, credit_limit, outstanding_balance")
      .eq("id", storeId)
      .single()

    if (!store) {
      return {
        allowed: false,
        credit_limit: 0,
        current_balance: 0,
        order_amount: orderAmount,
        projected_balance: orderAmount,
        remaining_credit: 0,
        reason: "매장 정보를 확인할 수 없습니다.",
      }
    }

    const limit = Number(store.credit_limit || 0)
    const current = Number(store.outstanding_balance || 0)
    const projected = current + orderAmount
    const allowed = limit === 0 || projected <= limit

    return {
      allowed,
      store_id: store.id,
      store_name: store.name,
      price_tier: store.price_tier,
      credit_limit: limit,
      current_balance: current,
      order_amount: orderAmount,
      projected_balance: projected,
      remaining_credit: limit > 0 ? limit - projected : 0,
      reason: allowed
        ? "OK"
        : `외상(여신) 한도를 초과하여 발주가 제한되었습니다. (한도: ₩${limit.toLocaleString()}, 예상 미수금: ₩${projected.toLocaleString()})`,
    }
  }

  return data as CreditLimitCheckResult
}
