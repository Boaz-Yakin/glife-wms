import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateApiKey } from "@/lib/api-auth"
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher"
import { recordAuditEvent } from "@/services/audit-log.service"

export const dynamic = "force-dynamic"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * GET /api/v1/orders
 * 최근 주문 목록 조회 API
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const auth = await validateApiKey(authHeader, "read:orders")

  if (!auth.success || !auth.tenantId) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: auth.status || 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  const supabase = getAdminClient()

  let query = supabase
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
      )
    `, { count: "exact" })
    .eq("tenant_id", auth.tenantId)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, count, error } = await query
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: "Failed to retrieve orders", details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total: count || (data?.length || 0),
      limit,
      offset,
    },
  })
}

/**
 * POST /api/v1/orders
 * 외부 ERP / 쇼핑몰 연동 신규 발주/주문 인입 API
 * Body: { store_no: string, note?: string, items: Array<{ sku: string, quantity: number, unit_price?: number }> }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const auth = await validateApiKey(authHeader, "write:orders")

  if (!auth.success || !auth.tenantId) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: auth.status || 401 }
    )
  }

  try {
    const body = await request.json()
    const { store_no, note, items } = body

    if (!store_no || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload. 'store_no' and non-empty 'items' array are required." },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // 1. 매장 존재 확인
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, store_no")
      .eq("tenant_id", auth.tenantId)
      .eq("store_no", String(store_no))
      .maybeSingle()

    if (storeErr || !store) {
      return NextResponse.json(
        { error: `Store with store_no '${store_no}' not found for this tenant.` },
        { status: 404 }
      )
    }

    // 2. 품목 유효성 확인
    const skus = items.map((i: any) => String(i.sku))
    const { data: dbItems, error: itemsErr } = await supabase
      .from("items")
      .select("id, sku, name, unit_price")
      .eq("tenant_id", auth.tenantId)
      .in("sku", skus)

    if (itemsErr || !dbItems || dbItems.length === 0) {
      return NextResponse.json(
        { error: "None of the specified SKUs were found in items master." },
        { status: 400 }
      )
    }

    const itemMap = new Map(dbItems.map((it) => [it.sku, it]))
    const orderNo = `EXT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`

    // 총액 계산
    let totalAmount = 0
    const orderItemsToInsert: any[] = []

    for (const reqItem of items) {
      const it = itemMap.get(String(reqItem.sku))
      if (!it) {
        return NextResponse.json(
          { error: `SKU '${reqItem.sku}' does not exist in items master.` },
          { status: 400 }
        )
      }
      const qty = parseInt(reqItem.quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Quantity for SKU '${reqItem.sku}' must be greater than 0.` },
          { status: 400 }
        )
      }
      const price = typeof reqItem.unit_price === "number" ? reqItem.unit_price : it.unit_price || 0
      totalAmount += price * qty

      orderItemsToInsert.push({
        item_id: it.id,
        quantity: qty,
        unit_price: price,
        status: "PENDING",
      })
    }

    // 3. 주문 생성
    const { data: newOrder, error: orderInsertErr } = await supabase
      .from("orders")
      .insert({
        tenant_id: auth.tenantId,
        order_no: orderNo,
        store_id: store.id,
        order_date: new Date().toISOString(),
        status: "PENDING",
        total_amount: totalAmount,
        note: note ? `[OpenAPI] ${note}` : "[OpenAPI External Order]",
      })
      .select("id, order_no, created_at, status")
      .single()

    if (orderInsertErr || !newOrder) {
      return NextResponse.json(
        { error: "Failed to create order", details: orderInsertErr?.message },
        { status: 500 }
      )
    }

    // 4. 주문 상세 생성
    const itemsWithOrderId = orderItemsToInsert.map((item) => ({
      ...item,
      tenant_id: auth.tenantId,
      order_id: newOrder.id,
    }))

    const { error: detailErr } = await supabase.from("order_items").insert(itemsWithOrderId)
    if (detailErr) {
      console.warn("Failed to insert order items:", detailErr.message)
    }

    // 5. 보안 감사 로그 기록 및 Webhook 이벤트 발행 (비동기)
    recordAuditEvent({
      tenantId: auth.tenantId,
      actorName: `API Key (${auth.keyName})`,
      actorRole: "API_SERVICE",
      actionType: "ORDER_STATUS_CHANGE",
      entityType: "ORDER",
      entityId: orderNo,
      description: `외부 Open API 발주 생성 접수 (매장: ${store.name}, 품목 수: ${items.length}종, 금액: ₩${totalAmount.toLocaleString()})`,
      diffData: { order_no: orderNo, store_no, items_count: items.length, totalAmount },
    }).then()

    dispatchWebhookEvent(auth.tenantId, "order.created", {
      order_id: newOrder.id,
      order_no: orderNo,
      store_no: store.store_no,
      store_name: store.name,
      total_amount: totalAmount,
      items_count: items.length,
      created_at: newOrder.created_at,
    }).then()

    return NextResponse.json({
      success: true,
      message: "Order successfully created via Open API",
      data: {
        order_id: newOrder.id,
        order_no: orderNo,
        store_no: store.store_no,
        store_name: store.name,
        total_amount: totalAmount,
        status: newOrder.status,
        created_at: newOrder.created_at,
      },
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    )
  }
}
