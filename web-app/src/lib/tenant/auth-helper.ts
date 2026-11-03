import { createClient } from "@supabase/supabase-js"
import { getCurrentTenant } from "./context"

/**
 * 테넌트 코드에 맞춘 가상 이메일 생성기
 * - Glife (1호 테넌트)는 기존 Supabase Auth 계정 호환성을 위해 @glife.com 유지
 * - 신규 테넌트(Acme 등)는 @{tenantCode}.wms.local 형식 적용
 */
export function formatTenantVirtualEmail(phone: string, tenantCode: string = "glife"): string {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, "")
  const code = (tenantCode || "glife").toLowerCase()

  if (code === "glife") {
    return `${cleanPhone}@glife.com`
  }
  return `${cleanPhone}@${code}.wms.local`
}

/**
 * 전화번호를 기반으로 사용자가 소속된 테넌트의 가상 이메일 조회/해결
 * (서버 액션 또는 라우트 핸들러에서 사용)
 */
export async function resolveVirtualEmailForPhone(
  phone: string,
  hintSubdomain?: string
): Promise<string> {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, "")

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
    const admin = createClient(supabaseUrl, serviceKey)

    // 1. users 테이블에서 해당 전화번호의 tenant_id 및 code 조회
    const { data: userRec } = await admin
      .from("users")
      .select("tenant_id, tenants:tenants(code)")
      .eq("phone", cleanPhone)
      .maybeSingle()

    if (userRec?.tenants && (userRec.tenants as any).code) {
      const code = (userRec.tenants as any).code
      return formatTenantVirtualEmail(cleanPhone, code)
    }

    // 2. 현재 요청의 테넌트 컨텍스트 확인
    if (hintSubdomain && hintSubdomain !== "localhost") {
      return formatTenantVirtualEmail(cleanPhone, hintSubdomain)
    }

    const currentTenant = await getCurrentTenant().catch(() => null)
    if (currentTenant?.code) {
      return formatTenantVirtualEmail(cleanPhone, currentTenant.code)
    }
  } catch (err) {
    console.warn("Failed to resolve tenant for phone, falling back:", err)
  }

  // 기본 fallback
  return `${cleanPhone}@glife.com`
}
