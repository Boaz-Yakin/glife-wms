"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { getActiveTenantId } from "@/lib/tenant/context"
import { requireAdmin } from "@/lib/auth/guard"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

export async function updateTenantPolicyAction(formData: FormData) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const supabase = getAdminClient()
  const tenantId = await getActiveTenantId()

  const stock_policy = formData.get("stock_policy")?.toString() || "HARD_LIMIT"
  const perishable_mode = formData.get("perishable_mode") === "true"
  const auto_dekit_enabled = formData.get("auto_dekit_enabled") === "true"
  const default_dekit_location_id = formData.get("default_dekit_location_id")?.toString() || null

  const payload = {
    stock_policy,
    perishable_mode,
    auto_dekit_enabled,
    default_dekit_location_id: default_dekit_location_id === "none" ? null : default_dekit_location_id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase as any)
    .from("tenant_settings")
    .update(payload)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Update Tenant Policy Error:", error)
    return { error: "운영 정책 저장 실패: " + error.message }
  }

  revalidatePath("/settings/policy")
  revalidatePath("/master/conversions")
  return { success: true }
}

