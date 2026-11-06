import { createClient } from "@supabase/supabase-js"
import { BulkItemRow, BulkStoreRow } from "@/lib/importer/excel-bulk-importer"
import { getCurrentTenant } from "@/lib/tenant/context"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface OnboardingState {
  tenantId: string
  companyName: string
  code: string
  branding: {
    logo_url: string
    primary_color: string
    currency: string
    currency_symbol: string
  }
  onboarding_completed: boolean
  onboarding_step: number
  stats: {
    itemsCount: number
    locationsCount: number
    storesCount: number
  }
}

/**
 * 테넌트 온보딩 현황 및 설정 조회
 */
export async function getTenantOnboardingState(targetTenantId?: string): Promise<{
  state: OnboardingState | null
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const tenantId = targetTenantId || tenantCtx.tenantId
    const supabase = getAdminClient()

    const [{ data: tenant }, { data: settings }, { count: itemsCount }, { count: locationsCount }, { count: storesCount }] =
      await Promise.all([
        supabase.from("tenants").select("id, code, company_name").eq("id", tenantId).single(),
        supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("locations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("stores").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ])

    if (!tenant) {
      return { state: null, error: "테넌트 정보를 찾을 수 없습니다." }
    }

    const state: OnboardingState = {
      tenantId: tenant.id,
      companyName: tenant.company_name,
      code: tenant.code,
      branding: {
        logo_url: settings?.logo_url || "/logo.png",
        primary_color: settings?.primary_color || "#059669",
        currency: settings?.currency || "USD",
        currency_symbol: settings?.currency_symbol || "$",
      },
      onboarding_completed: Boolean((settings as any)?.onboarding_completed),
      onboarding_step: Number((settings as any)?.onboarding_step) || 1,
      stats: {
        itemsCount: itemsCount || 0,
        locationsCount: locationsCount || 0,
        storesCount: storesCount || 0,
      },
    }

    return { state, error: null }
  } catch (err: any) {
    console.error("getTenantOnboardingState error:", err)
    return { state: null, error: err.message || "Failed to load onboarding state" }
  }
}

/**
 * Step 1: 테넌트 브랜딩 설정 저장
 */
export async function saveTenantBranding(
  tenantId: string,
  data: {
    companyName: string
    primaryColor: string
    currency: string
    logoUrl?: string
  }
) {
  const supabase = getAdminClient()

  // 1. Update company_name in tenants
  if (data.companyName) {
    await supabase
      .from("tenants")
      .update({ company_name: data.companyName, updated_at: new Date().toISOString() })
      .eq("id", tenantId)
  }

  // 2. Update tenant_settings
  const currencySymbol = data.currency === "KRW" ? "₩" : "$"
  const updatePayload: Record<string, any> = {
    primary_color: data.primaryColor,
    currency: data.currency,
    currency_symbol: currencySymbol,
    onboarding_step: 2,
    updated_at: new Date().toISOString(),
  }
  if (data.logoUrl) updatePayload.logo_url = data.logoUrl

  const { error } = await supabase
    .from("tenant_settings")
    .update(updatePayload)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("saveTenantBranding error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Step 2: 엑셀 파싱 품목 마스터 일괄 등록
 */
export async function bulkImportItems(
  tenantId: string,
  items: BulkItemRow[]
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const supabase = getAdminClient()

  if (!items || items.length === 0) {
    return { success: false, inserted: 0, error: "등록할 품목 데이터가 없습니다." }
  }

  const payload = items.map((item) => ({
    tenant_id: tenantId,
    sku: item.sku,
    name_en: item.name,
    desc_en: item.desc || null,
    category: item.category || "General",
    uom: item.uom || "EA",
    unit_price: item.unit_price,
    box_price: item.box_price || null,
    pack_price: item.pack_price || null,
    upc: item.upc || null,
    is_active: true,
  }))

  // Batch insert up to 500 at a time
  const chunkSize = 500
  let totalInserted = 0

  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize)
    const { error } = await (supabase as any).from("items").upsert(chunk, {
      onConflict: "tenant_id,sku",
      ignoreDuplicates: false,
    })

    if (error) {
      console.error("bulkImportItems chunk error:", error)
      return { success: false, inserted: totalInserted, error: error.message }
    }
    totalInserted += chunk.length
  }

  // Advance onboarding step to 3
  await (supabase as any)
    .from("tenant_settings")
    .update({ onboarding_step: 3, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)

  return { success: true, inserted: totalInserted }
}

/**
 * Step 3: 간이 창고 구획(로케이션) 자동 생성
 */
export async function autoGenerateWarehouseLocations(
  tenantId: string,
  params: {
    zones: Array<{ code: string; tempZone: "ROOM" | "CHILLED" | "FROZEN" }>
    racksPerZone: number
    levelsPerRack: number
  }
): Promise<{ success: boolean; generated: number; error?: string }> {
  const supabase = getAdminClient()

  const locations: any[] = []
  const { zones, racksPerZone, levelsPerRack } = params

  zones.forEach((zone, zIdx) => {
    for (let rack = 1; rack <= racksPerZone; rack++) {
      for (let lvl = 1; lvl <= levelsPerRack; lvl++) {
        const lvlChar = String.fromCharCode(64 + lvl) // 'A', 'B', 'C'
        const locCode = `LOC-${zone.code}${String(rack).padStart(2, "0")}${lvlChar}`

        locations.push({
          tenant_id: tenantId,
          location_code: locCode,
          zone: zone.code,
          temperature_zone: zone.tempZone,
          status: "AVAILABLE",
          pos_x: rack * 3,
          pos_y: (zIdx + 1) * 5,
          rotation: 0,
        })
      }
    }
  })

  // Try RPC first, fallback to batch upsert
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("auto_generate_warehouse_locations", {
    p_tenant_id: tenantId,
    p_zone_codes: zones.map((z) => z.code),
    p_temp_zones: zones.map((z) => z.tempZone),
    p_racks_per_zone: racksPerZone,
    p_levels_per_rack: levelsPerRack,
  })

  if (!rpcErr && (rpcRes as any)?.success) {
    return { success: true, generated: (rpcRes as any)?.inserted_locations || locations.length }
  }

  // Fallback direct upsert
  const { error: upsertErr } = await (supabase as any)
    .from("locations")
    .upsert(locations, { onConflict: "location_code" })

  if (upsertErr) {
    console.error("autoGenerateWarehouseLocations upsert error:", upsertErr)
    return { success: false, generated: 0, error: upsertErr.message }
  }

  // Advance step to 4
  await (supabase as any)
    .from("tenant_settings")
    .update({ onboarding_step: 4, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)

  return { success: true, generated: locations.length }
}

/**
 * Step 4: 매장/거래처 등록
 */
export async function bulkRegisterStores(
  tenantId: string,
  stores: BulkStoreRow[]
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const supabase = getAdminClient()

  if (!stores || stores.length === 0) {
    return { success: false, inserted: 0, error: "등록할 매장 정보가 없습니다." }
  }

  const payload = stores.map((s, idx) => ({
    tenant_id: tenantId,
    name: s.name,
    address: s.address || "배송지 정보 미입력",
    store_no: s.store_no || `STORE-${idx + 1}`,
    phone: s.phone || null,
    credit_limit: s.credit_limit || 0,
    price_tier: s.price_tier || "BASE",
    is_active: true,
  }))

  const { error } = await (supabase as any).from("stores").insert(payload)

  if (error) {
    console.error("bulkRegisterStores error:", error)
    return { success: false, inserted: 0, error: error.message }
  }

  // Advance step to 5
  await (supabase as any)
    .from("tenant_settings")
    .update({ onboarding_step: 5, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)

  return { success: true, inserted: payload.length }
}

/**
 * Step 5: 온보딩 완료 처리
 */
export async function completeOnboarding(tenantId: string) {
  const supabase = getAdminClient()

  const { error } = await (supabase as any)
    .from("tenant_settings")
    .update({
      onboarding_completed: true,
      onboarding_step: 5,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("completeOnboarding error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
