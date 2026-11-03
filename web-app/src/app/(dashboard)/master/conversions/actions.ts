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

export async function createConversionAction(formData: FormData) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const supabase = getAdminClient()
  const tenantId = await getActiveTenantId()

  const parent_item_id = formData.get("parent_item_id")?.toString()
  const child_item_id = formData.get("child_item_id")?.toString()
  const conversion_ratio = parseInt(formData.get("conversion_ratio")?.toString() || "1", 10)
  const target_location_id = formData.get("target_location_id")?.toString() || null
  const auto_dekit_on_order = formData.get("auto_dekit_on_order") === "true"
  const note = formData.get("note")?.toString() || null

  if (!parent_item_id || !child_item_id || conversion_ratio <= 0) {
    return { error: "부모 품목, 자식 품목, 그리고 1 이상의 환산 배율은 필수입니다." }
  }

  if (parent_item_id === child_item_id) {
    return { error: "부모 품목과 자식 품목은 동일할 수 없습니다." }
  }

  const payload = {
    tenant_id: tenantId,
    parent_item_id,
    child_item_id,
    conversion_ratio,
    target_location_id,
    auto_dekit_on_order,
    note,
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase as any)
    .from("item_conversions")
    .upsert([payload], { onConflict: "parent_item_id,child_item_id" })

  if (error) {
    console.error("Create Conversion Error:", error)
    return { error: "번들 변환 규칙 저장에 실패했습니다: " + error.message }
  }

  revalidatePath("/master/conversions")
  return { success: true }
}

export async function deleteConversionAction(id: string) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const supabase = getAdminClient()
  const tenantId = await getActiveTenantId()

  const { error } = await (supabase as any)
    .from("item_conversions")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Delete Conversion Error:", error)
    return { error: "삭제 실패: " + error.message }
  }

  revalidatePath("/master/conversions")
  return { success: true }
}

export async function toggleAutoDekitAction(id: string, currentState: boolean) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const supabase = getAdminClient()
  const tenantId = await getActiveTenantId()

  const { error } = await (supabase as any)
    .from("item_conversions")
    .update({ 
      auto_dekit_on_order: !currentState,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Toggle Auto Dekit Error:", error)
    return { error: "상태 변경 실패: " + error.message }
  }

  revalidatePath("/master/conversions")
  return { success: true }
}

export async function manualDekitAction(parentItemId: string, parentQty: number, fromLocationId?: string) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const supabase = getAdminClient()
  const tenantId = await getActiveTenantId()

  const { data, error } = await (supabase as any).rpc("dekit_bundle_item", {
    p_tenant_id: tenantId,
    p_parent_item_id: parentItemId,
    p_parent_qty: parentQty,
    p_from_location_id: fromLocationId || null,
  })

  if (error) {
    console.error("Manual Dekit RPC Error:", error)
    return { error: "수동 해체 실행 실패: " + error.message }
  }

  if (data && !data.success) {
    return { error: data.error || "해체 실패" }
  }

  revalidatePath("/master/conversions")
  revalidatePath("/inventory")
  return { success: true, data }
}

