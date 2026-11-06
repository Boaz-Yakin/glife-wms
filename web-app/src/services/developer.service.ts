"use server"

import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { getCurrentTenant } from "@/lib/tenant/context"
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher"
import { recordAuditEvent } from "@/services/audit-log.service"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface TenantApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  rate_limit_per_minute: number
  is_active: boolean
  last_used_at?: string | null
  created_at: string
}

export interface TenantWebhook {
  id: string
  url: string
  secret_key: string
  subscribed_events: string[]
  is_active: boolean
  last_triggered_at?: string | null
  last_status_code?: number | null
  failure_count: number
  created_at: string
}

/**
 * 테넌트의 등록된 API 키 목록 조회
 */
export async function getTenantApiKeys(): Promise<{
  keys: TenantApiKey[]
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("tenant_api_keys")
      .select("id, name, key_prefix, permissions, rate_limit_per_minute, is_active, last_used_at, created_at")
      .eq("tenant_id", tenantCtx.tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Failed to fetch tenant_api_keys:", error.message)
      return { keys: [], error: null }
    }

    return { keys: (data as any) || [], error: null }
  } catch (err: any) {
    return { keys: [], error: err.message }
  }
}

/**
 * 신규 API 키 발급 (rawKey는 1회만 반환)
 */
export async function createTenantApiKey(
  name: string,
  permissions: string[] = ["read:inventory", "write:orders", "read:orders"]
): Promise<{
  rawKey?: string
  newKey?: TenantApiKey
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    if (!name.trim()) {
      return { error: "API 키 명칭을 입력해주세요." }
    }

    // 32바이트 랜덤 시크릿 생성
    const randomHex = crypto.randomBytes(24).toString("hex")
    const rawKey = `wms_live_${randomHex}`
    const keyPrefix = rawKey.substring(0, 16) + "..."
    const hashedSecret = crypto.createHash("sha256").update(rawKey).digest("hex")

    const { data, error } = await supabase
      .from("tenant_api_keys")
      .insert({
        tenant_id: tenantCtx.tenantId,
        name: name.trim(),
        key_prefix: keyPrefix,
        hashed_secret: hashedSecret,
        permissions,
        rate_limit_per_minute: 600,
        is_active: true,
      })
      .select("id, name, key_prefix, permissions, rate_limit_per_minute, is_active, last_used_at, created_at")
      .single()

    if (error || !data) {
      return { error: error?.message || "API 키 생성에 실패했습니다." }
    }

    recordAuditEvent({
      tenantId: tenantCtx.tenantId,
      actorName: "관리자",
      actorRole: "ADMIN",
      actionType: "SECURITY_POLICY_UPDATE",
      entityType: "SYSTEM",
      entityId: data.id,
      description: `신규 Open REST API 키 발급 ('${name}')`,
    }).then()

    return {
      rawKey,
      newKey: data as any,
      error: null,
    }
  } catch (err: any) {
    return { error: err.message }
  }
}

/**
 * API 키 폐기/비활성화
 */
export async function revokeTenantApiKey(keyId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { error } = await supabase
      .from("tenant_api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("tenant_id", tenantCtx.tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 테넌트의 등록된 웹훅 엔드포인트 목록 조회
 */
export async function getTenantWebhooks(): Promise<{
  webhooks: TenantWebhook[]
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("tenant_webhooks")
      .select("id, url, secret_key, subscribed_events, is_active, last_triggered_at, last_status_code, failure_count, created_at")
      .eq("tenant_id", tenantCtx.tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Failed to fetch tenant_webhooks:", error.message)
      return { webhooks: [], error: null }
    }

    return { webhooks: (data as any) || [], error: null }
  } catch (err: any) {
    return { webhooks: [], error: err.message }
  }
}

/**
 * 신규 웹훅 엔드포인트 등록
 */
export async function registerTenantWebhook(
  url: string,
  subscribedEvents: string[]
): Promise<{ webhook?: TenantWebhook; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "올바른 HTTP 또는 HTTPS URL 형식을 입력해주세요." }
    }

    const secretKey = `whsec_${crypto.randomBytes(24).toString("hex")}`

    const { data, error } = await supabase
      .from("tenant_webhooks")
      .insert({
        tenant_id: tenantCtx.tenantId,
        url: url.trim(),
        secret_key: secretKey,
        subscribed_events: subscribedEvents.length > 0 ? subscribedEvents : ["order.created", "order.fulfilled"],
        is_active: true,
      })
      .select("id, url, secret_key, subscribed_events, is_active, last_triggered_at, last_status_code, failure_count, created_at")
      .single()

    if (error || !data) {
      return { error: error?.message || "웹훅 등록에 실패했습니다." }
    }

    return { webhook: data as any, error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}

/**
 * 웹훅 엔드포인트 삭제
 */
export async function deleteTenantWebhook(webhookId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const tenantCtx = await getCurrentTenant()
    const supabase = getAdminClient()

    const { error } = await supabase
      .from("tenant_webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("tenant_id", tenantCtx.tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 웹훅 Ping 테스트 발송
 */
export async function testWebhookPingAction(webhookId: string): Promise<{
  success: boolean
  message: string
  error: string | null
}> {
  try {
    const tenantCtx = await getCurrentTenant()
    const result = await dispatchWebhookEvent(tenantCtx.tenantId, "ping", {
      message: "Glife WMS Webhook connectivity ping test successful",
      ping_at: new Date().toISOString(),
    })

    if (result.errors.length > 0) {
      return { success: false, message: result.errors.join("; "), error: result.errors[0] }
    }

    return { success: true, message: "웹훅 Ping 테스트가 성공적으로 전송되었습니다.", error: null }
  } catch (err: any) {
    return { success: false, message: "", error: err.message }
  }
}
