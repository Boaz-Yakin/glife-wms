"use server"

import { revalidatePath } from "next/cache"
import { upsertStoreItemPrice, deleteStoreItemPrice, type PriceTier } from "@/services/pricing.service"
import { requireAdmin } from "@/lib/auth/guard"

export async function upsertPricingAction(formData: FormData) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const id = formData.get("id")?.toString() || undefined
  const clientId = formData.get("client_id")?.toString() || null
  const targetType = formData.get("target_type")?.toString() // "TIER" | "STORE"
  const priceTier = targetType === "TIER" ? (formData.get("price_tier")?.toString() as PriceTier) : null
  const storeId = targetType === "STORE" ? formData.get("store_id")?.toString() || null : null
  const itemId = formData.get("item_id")?.toString()
  const uom = formData.get("uom")?.toString() || "EA"
  const customPrice = parseFloat(formData.get("custom_price")?.toString() || "0")
  const note = formData.get("note")?.toString() || null

  if (!itemId) return { error: "품목을 선택해주세요." }
  if (isNaN(customPrice) || customPrice < 0) return { error: "올바른 단가를 입력해주세요." }
  if (targetType === "TIER" && !priceTier) return { error: "적용할 단가 등급을 선택해주세요." }
  if (targetType === "STORE" && !storeId) return { error: "적용할 매장을 선택해주세요." }

  const res = await upsertStoreItemPrice({
    id,
    clientId,
    storeId,
    priceTier,
    itemId,
    uom,
    customPrice,
    note,
  })

  if (res.error) {
    return { error: res.error }
  }

  revalidatePath("/master/pricing")
  return { success: true, data: res.data }
}

export async function deletePricingAction(id: string) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const res = await deleteStoreItemPrice(id)
  if (res.error) {
    return { error: res.error }
  }

  revalidatePath("/master/pricing")
  return { success: true }
}
