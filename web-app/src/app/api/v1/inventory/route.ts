import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateApiKey } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * GET /api/v1/inventory
 * Headless WMS 실시간 재고 조회 API
 * Headers: Authorization: Bearer wms_live_...
 * Query Params: sku, location_code, zone, limit, offset
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const auth = await validateApiKey(authHeader, "read:inventory")

  if (!auth.success || !auth.tenantId) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: auth.status || 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const sku = searchParams.get("sku")
  const locationCode = searchParams.get("location_code")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  const supabase = getAdminClient()

  let query = supabase
    .from("inventory")
    .select(`
      id,
      quantity,
      allocated_quantity,
      lot_no,
      expiration_date,
      updated_at,
      items!inner (
        id,
        sku,
        name,
        barcode,
        spec,
        category,
        unit_price,
        storage_type
      ),
      locations!inner (
        id,
        location_code,
        zone,
        temperature_zone
      )
    `, { count: "exact" })
    .eq("tenant_id", auth.tenantId)

  if (sku) {
    query = query.eq("items.sku", sku)
  }

  if (locationCode) {
    query = query.eq("locations.location_code", locationCode)
  }

  const { data, count, error } = await query
    .range(offset, offset + limit - 1)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: "Failed to retrieve inventory", details: error.message },
      { status: 500 }
    )
  }

  const formatted = (data || []).map((row: any) => ({
    id: row.id,
    sku: row.items?.sku,
    name: row.items?.name,
    barcode: row.items?.barcode,
    spec: row.items?.spec,
    category: row.items?.category,
    unit_price: row.items?.unit_price,
    storage_type: row.items?.storage_type,
    location_code: row.locations?.location_code,
    zone: row.locations?.zone,
    temperature_zone: row.locations?.temperature_zone,
    quantity: row.quantity,
    allocated_quantity: row.allocated_quantity || 0,
    available_quantity: Math.max(0, row.quantity - (row.allocated_quantity || 0)),
    lot_no: row.lot_no,
    expiration_date: row.expiration_date,
    updated_at: row.updated_at,
  }))

  return NextResponse.json({
    success: true,
    data: formatted,
    pagination: {
      total: count || formatted.length,
      limit,
      offset,
    },
  })
}
