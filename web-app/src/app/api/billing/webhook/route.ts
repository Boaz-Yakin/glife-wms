import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { eventType, tenantId, planTier, amount, paymentKey } = payload

    const supabase = getAdminClient()

    if (eventType === "PAYMENT_SUCCESS" || eventType === "BILLING_RENEWAL") {
      const invoiceNo = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`

      // 1. Record billing invoice
      await (supabase as any).from("billing_invoices").insert([
        {
          tenant_id: tenantId,
          invoice_number: invoiceNo,
          plan_tier: planTier || "PRO",
          base_amount: amount || 389,
          usage_amount: 0,
          discount_amount: 0,
          total_amount: amount || 389,
          payment_status: "PAID",
          paid_at: new Date().toISOString(),
        },
      ])

      // 2. Extend subscription period
      await (supabase as any)
        .from("tenant_subscriptions")
        .update({
          status: "ACTIVE",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)

      return NextResponse.json({ success: true, message: "Subscription renewed" })
    }

    if (eventType === "PAYMENT_FAILED") {
      await (supabase as any)
        .from("tenant_subscriptions")
        .update({
          status: "PAST_DUE",
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)

      return NextResponse.json({ success: true, message: "Marked past due" })
    }

    return NextResponse.json({ success: true, message: "Webhook acknowledged" })
  } catch (error: any) {
    console.error("Billing Webhook Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
