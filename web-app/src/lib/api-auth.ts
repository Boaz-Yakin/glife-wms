import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface ApiAuthResult {
  success: boolean
  tenantId?: string
  keyName?: string
  permissions?: string[]
  error?: string
  status?: number
}

/**
 * Open REST API 요청의 Bearer API Key 검증
 */
export async function validateApiKey(
  authHeader: string | null,
  requiredPermission?: string
): Promise<ApiAuthResult> {
  if (!authHeader) {
    return {
      success: false,
      error: "Authorization header is missing. Format: 'Bearer wms_live_...'",
      status: 401,
    }
  }

  let rawKey = authHeader.trim()
  if (rawKey.startsWith("Bearer ")) {
    rawKey = rawKey.substring(7).trim()
  }

  if (!rawKey.startsWith("wms_live_")) {
    return {
      success: false,
      error: "Invalid API key format. Expected prefix 'wms_live_'",
      status: 401,
    }
  }

  // SHA-256 해시 생성
  const hashedSecret = crypto.createHash("sha256").update(rawKey).digest("hex")
  const supabase = getAdminClient()

  // API 키 조회
  const { data: keyRecord, error } = await supabase
    .from("tenant_api_keys")
    .select("id, tenant_id, name, permissions, is_active, expires_at")
    .eq("hashed_secret", hashedSecret)
    .maybeSingle()

  if (error || !keyRecord) {
    return {
      success: false,
      error: "Invalid or nonexistent API key.",
      status: 401,
    }
  }

  if (!keyRecord.is_active) {
    return {
      success: false,
      error: "This API key has been revoked or deactivated.",
      status: 403,
    }
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return {
      success: false,
      error: "This API key has expired.",
      status: 403,
    }
  }

  const permissions: string[] = Array.isArray(keyRecord.permissions)
    ? (keyRecord.permissions as string[])
    : []

  if (requiredPermission && !permissions.includes(requiredPermission) && !permissions.includes("*")) {
    return {
      success: false,
      error: `Forbidden: API key lacks required permission '${requiredPermission}'`,
      status: 403,
    }
  }

  // 비동기로 last_used_at 갱신
  supabase
    .from("tenant_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)
    .then()

  return {
    success: true,
    tenantId: keyRecord.tenant_id,
    keyName: keyRecord.name,
    permissions,
  }
}
