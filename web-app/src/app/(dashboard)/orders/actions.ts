"use server"

import { revalidatePath } from "next/cache"
import { 
  updateOrder, 
  searchMasterItemsForOrder, 
  UpdateOrderPayload, 
  MasterItemSearchResult 
} from "@/services/orders.service"

export async function updateOrderAction(payload: UpdateOrderPayload) {
  try {
    const result = await updateOrder(payload)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to update order" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("updateOrderAction error:", err)
    return { success: false, error: errorMsg }
  }
}

export async function searchMasterItemsAction(search: string): Promise<MasterItemSearchResult[]> {
  try {
    return await searchMasterItemsForOrder(search)
  } catch (err) {
    console.error("searchMasterItemsAction error:", err)
    return []
  }
}
