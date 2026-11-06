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
 * GET /api/v1/orders/[orderNo]
 * 특정 주문 상세 및 피킹/출고 진행 현황 단건 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  const authHeader = request.headers.get("authorization")
  const auth = await validateApiKey(authHeader, "read:orders")

  if (!auth.success || !auth.tenantId) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: auth.status || 401 }
    )
  }

  const { orderNo } = await params
  const supabase = getAdminClient()

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_no,
      order_date,
      status,
      total_amount,
      note,
      created_at,
      stores (
        store_no,
        name,
        contact_person,
        phone
      ),
      order_items (
        id,
        quantity,
        unit_price,
        status,
        items (
          sku,
          name,
          barcode,
          spec
        )
      )
    `)
    .eq("tenant_id", auth.tenantId)
    .eq("order_no", orderNo)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json(
      { error: `Order '${orderNo}' not found.` },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: order,
  })
}
