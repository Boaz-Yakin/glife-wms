"use server"

import { revalidatePath } from "next/cache"
import { createWaveAction, completeWaveAction } from "@/services/wave.service"
import { requireAdmin } from "@/lib/auth/guard"

export async function createWaveServerAction(formData: FormData) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const name = formData.get("name")?.toString()?.trim()
  const zoneType = formData.get("zone_type")?.toString() || "ALL"
  const orderIdsRaw = formData.get("order_ids")?.toString() || "[]"

  if (!name) {
    return { error: "Wave name is required." }
  }

  let orderIds: string[] = []
  try {
    orderIds = JSON.parse(orderIdsRaw)
  } catch {
    return { error: "Invalid order selection." }
  }

  if (orderIds.length === 0) {
    return { error: "Please select at least 1 order to bundle into a wave." }
  }

  const res = await createWaveAction({
    name,
    orderIds,
    zoneType,
  })

  if (!res.success) {
    return { error: res.error || "Failed to create wave." }
  }

  revalidatePath("/orders/waves")
  revalidatePath("/orders")
  return { success: true, data: res.data }
}

export async function completeWaveServerAction(waveId: string) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const res = await completeWaveAction(waveId)
  if (!res.success) {
    return { error: res.error || "Failed to complete wave." }
  }

  revalidatePath("/orders/waves")
  revalidatePath("/orders")
  return { success: true }
}
