import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type WebhookEventType =
  | "order.created"
  | "order.fulfilled"
  | "order.cancelled"
  | "inventory.adjusted"
  | "stock.low"
  | "ping"

export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  delivery_id: string
  tenant_id: string
  data: Record<string, any>
}

/**
 * 테넌트 웹훅 엔드포인트로 실시간 이벤트 비동기 푸시 발송
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  event: WebhookEventType,
  data: Record<string, any>
): Promise<{ dispatchedCount: number; errors: string[] }> {
  const supabase = getAdminClient()
  const errors: string[] = []

  try {
    const { data: webhooks, error } = await supabase
      .from("tenant_webhooks")
      .select("id, url, secret_key, subscribed_events, failure_count")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)

    if (error || !webhooks || webhooks.length === 0) {
      return { dispatchedCount: 0, errors: [] }
    }

    const eligibleWebhooks = webhooks.filter((wh) => {
      if (event === "ping") return true
      const events: string[] = Array.isArray(wh.subscribed_events)
        ? (wh.subscribed_events as string[])
        : []
      return events.includes(event) || events.includes("*")
    })

    if (eligibleWebhooks.length === 0) {
      return { dispatchedCount: 0, errors: [] }
    }

    let dispatchedCount = 0

    await Promise.all(
      eligibleWebhooks.map(async (wh) => {
        const deliveryId = `del_${crypto.randomUUID()}`
        const timestamp = new Date().toISOString()
        const payload: WebhookPayload = {
          event,
          timestamp,
          delivery_id: deliveryId,
          tenant_id: tenantId,
          data,
        }

        const payloadString = JSON.stringify(payload)
        const signature = crypto
          .createHmac("sha256", wh.secret_key)
          .update(payloadString)
          .digest("hex")

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 6000) // 6초 타임아웃

          const res = await fetch(wh.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Glife-WMS-Webhook/1.0",
              "X-WMS-Event": event,
              "X-WMS-Delivery": deliveryId,
              "X-WMS-Tenant": tenantId,
              "X-WMS-Signature": `sha256=${signature}`,
            },
            body: payloadString,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          const statusCode = res.status
          const isSuccess = res.ok

          // 상태 코드 및 실패 카운트 비동기 업데이트
          await supabase
            .from("tenant_webhooks")
            .update({
              last_triggered_at: timestamp,
              last_status_code: statusCode,
              failure_count: isSuccess ? 0 : (wh.failure_count || 0) + 1,
            })
            .eq("id", wh.id)

          if (isSuccess) {
            dispatchedCount++
          } else {
            errors.push(`Webhook ${wh.url} returned status ${statusCode}`)
          }
        } catch (fetchErr: any) {
          errors.push(`Webhook ${wh.url} request failed: ${fetchErr.message}`)
          await supabase
            .from("tenant_webhooks")
            .update({
              last_triggered_at: timestamp,
              last_status_code: 504,
              failure_count: (wh.failure_count || 0) + 1,
            })
            .eq("id", wh.id)
        }
      })
    )

    return { dispatchedCount, errors }
  } catch (err: any) {
    console.error("dispatchWebhookEvent error:", err)
    return { dispatchedCount: 0, errors: [err.message] }
  }
}
