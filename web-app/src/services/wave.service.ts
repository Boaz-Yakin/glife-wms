"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { optimizePickingTour } from "@/lib/routing/tsp-picker"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type WaveStatus = "CREATED" | "RELEASED" | "PICKING" | "COMPLETED" | "CANCELLED"

export interface PickingWave {
  id: string
  tenant_id: string
  wave_no: string
  name: string
  status: WaveStatus
  zone_type: string
  cluster_criteria?: Record<string, any> | null
  total_orders: number
  total_items: number
  total_qty: number
  picked_qty: number
  created_at: string
  updated_at: string

  // joined
  wave_orders?: Array<{
    id: string
    order_id: string
    tote_no: number
    tote_barcode: string
    status: string
    order?: {
      id: string
      order_no: string
      status: string
      store?: { name: string } | null
    } | null
  }>
}

export interface ToteDistribution {
  tote_no: number
  tote_barcode: string
  order_id: string
  store_name: string
  qty: number
}

export interface WaveConsolidatedPickItem {
  id: string
  item_id: string
  sku: string
  name: string
  upc: string
  uom: string
  total_qty: number
  status: "PENDING" | "PICKED" | "SKIPPED"
  locations?: {
    id: string
    code: string
    zone: string
    aisle: number
    bay: number
    level: string
    bin: number
    pos_x?: number | null
    pos_y?: number | null
    rotation?: number | null
    temperature_zone?: string | null
  }
  tote_distributions: ToteDistribution[]
}

/**
 * 파동 출고(Wave Picking) 목록 조회
 */
export async function getWaves({
  status,
  limit = 50,
}: {
  status?: string
  limit?: number
} = {}) {
  const supabase = getAdminClient()

  let query = (supabase as any)
    .from("picking_waves")
    .select(`
      *,
      wave_orders:wave_orders (
        id,
        order_id,
        tote_no,
        tote_barcode,
        status,
        order:orders (
          id,
          order_no,
          status,
          store:stores (name)
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status && status !== "ALL") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("getWaves error:", error)
    return { data: [], error: error.message }
  }

  return { data: (data || []) as PickingWave[], error: null }
}

/**
 * 특정 파동 출고 상세 및 토트 매핑 조회
 */
export async function getWaveById(waveId: string) {
  const supabase = getAdminClient()

  const { data, error } = await (supabase as any)
    .from("picking_waves")
    .select(`
      *,
      wave_orders:wave_orders (
        id,
        order_id,
        tote_no,
        tote_barcode,
        status,
        order:orders (
          id,
          order_no,
          status,
          store:stores (name)
        )
      )
    `)
    .eq("id", waveId)
    .single()

  if (error) {
    console.error("getWaveById error:", error)
    return { data: null, error: error.message }
  }

  return { data: data as PickingWave, error: null }
}

/**
 * 웨이브 내 다중 주문의 품목을 통합 집계하고 2D TSP 최적 동선으로 정렬된 지시서 생성
 */
export async function getWaveConsolidatedPickList(waveId: string): Promise<{
  wave: PickingWave | null
  items: WaveConsolidatedPickItem[]
  totalDistanceMeters: number
  error: string | null
}> {
  const supabase = getAdminClient()

  // 1. 웨이브 정보 조회
  const { data: wave, error: waveErr } = await getWaveById(waveId)
  if (waveErr || !wave) {
    return { wave: null, items: [], totalDistanceMeters: 0, error: waveErr || "Wave not found" }
  }

  const orderIds = (wave.wave_orders || []).map((wo) => wo.order_id)
  if (orderIds.length === 0) {
    return { wave, items: [], totalDistanceMeters: 0, error: null }
  }

  // 2. 해당 주문들의 전체 order_items 및 location, item 정보 조회
  const { data: rawOrderItems, error: itemsErr } = await (supabase as any)
    .from("order_items")
    .select(`
      id,
      order_id,
      item_id,
      location_id,
      qty,
      uom,
      item:items (
        id,
        sku,
        name_en,
        upc
      ),
      location:locations (
        id,
        code,
        zone_type,
        pos_x,
        pos_y,
        rotation,
        temperature_zone
      )
    `)
    .in("order_id", orderIds)

  if (itemsErr) {
    return { wave, items: [], totalDistanceMeters: 0, error: itemsErr.message }
  }

  // 3. 토트 매핑 사전 구축: order_id -> { tote_no, tote_barcode, store_name }
  const toteMap = new Map<string, { tote_no: number; tote_barcode: string; store_name: string }>()
  for (const wo of wave.wave_orders || []) {
    toteMap.set(wo.order_id, {
      tote_no: wo.tote_no,
      tote_barcode: wo.tote_barcode,
      store_name: wo.order?.store?.name || `Order ${wo.order?.order_no || wo.order_id.slice(0, 8)}`,
    })
  }

  // 4. 품목 및 로케이션 기준으로 그룹화 (Consolidation)
  const groupMap = new Map<string, WaveConsolidatedPickItem>()

  for (const oi of rawOrderItems || []) {
    const key = `${oi.item_id}_${oi.location_id || "NO_LOC"}`
    const toteInfo = toteMap.get(oi.order_id)

    if (!groupMap.has(key)) {
      const loc = oi.location
      const locCode = loc?.code || "UNASSIGNED"
      const match = locCode.match(/^LOC-([A-Z])(\d{2})(\d{2})([A-Z])(\d{2})$/i)

      groupMap.set(key, {
        id: `wave_pick_${key}`,
        item_id: oi.item_id,
        sku: oi.item?.sku || "SKU-UNKNOWN",
        name: oi.item?.name_en || "Unknown Item",
        upc: oi.item?.upc || "",
        uom: oi.uom || "EA",
        total_qty: 0,
        status: "PENDING",
        locations: {
          id: loc?.id || "",
          code: locCode,
          zone: match ? match[1].toUpperCase() : (loc?.zone_type || "A"),
          aisle: match ? parseInt(match[2], 10) : 1,
          bay: match ? parseInt(match[3], 10) : 1,
          level: match ? match[4].toUpperCase() : "A",
          bin: match ? parseInt(match[5], 10) : 1,
          pos_x: loc?.pos_x ?? 0,
          pos_y: loc?.pos_y ?? 0,
          rotation: loc?.rotation ?? 0,
          temperature_zone: loc?.temperature_zone || (loc?.zone_type === "F" ? "FROZEN" : "ROOM"),
        },
        tote_distributions: [],
      })
    }

    const grouped = groupMap.get(key)!
    const itemQty = Number(oi.qty || 0)
    grouped.total_qty += itemQty

    if (toteInfo) {
      grouped.tote_distributions.push({
        tote_no: toteInfo.tote_no,
        tote_barcode: toteInfo.tote_barcode,
        order_id: oi.order_id,
        store_name: toteInfo.store_name,
        qty: itemQty,
      })
    }
  }

  const consolidatedList = Array.from(groupMap.values())

  // 5. 2D TSP 및 Cold Chain 우선순위 정렬 적용
  const { sortedItems, totalDistanceMeters } = optimizePickingTour(consolidatedList)

  return {
    wave,
    items: sortedItems,
    totalDistanceMeters,
    error: null,
  }
}

/**
 * 신규 파동 출고 생성
 */
export async function createWaveAction({
  waveNo,
  name,
  orderIds,
  zoneType = "ALL",
}: {
  waveNo?: string
  name: string
  orderIds: string[]
  zoneType?: string
}) {
  const supabase = getAdminClient()

  const finalWaveNo = waveNo || `WAVE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(10 + Math.random() * 90)}`

  const { data, error } = await (supabase as any).rpc("create_picking_wave", {
    p_wave_no: finalWaveNo,
    p_name: name,
    p_order_ids: orderIds,
    p_zone_type: zoneType,
  })

  if (error) {
    console.error("createWaveAction error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * 파동 출고 완료 처리
 */
export async function completeWaveAction(waveId: string) {
  const supabase = getAdminClient()

  const { data, error } = await (supabase as any).rpc("complete_picking_wave", {
    p_wave_id: waveId,
  })

  if (error) {
    console.error("completeWaveAction error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
