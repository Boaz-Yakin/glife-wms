"use server"

import { revalidatePath } from "next/cache"
import { 
  updateOrder, 
  updateOrderStatus,
  deleteOrder,
  restoreOrder,
  permanentlyDeleteOrder,
  cancelOrderCategory,
  uncancelOrderCategory,
  searchMasterItemsForOrder, 
  UpdateOrderPayload, 
  MasterItemSearchResult 
} from "@/services/orders.service"
import { requireManager, requireAdmin, requireAuth } from "@/lib/auth/guard"

export async function updateOrderStatusAction(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireManager()
    const result = await updateOrderStatus(orderId, status)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to update order status" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("updateOrderStatusAction error:", err)
    return { success: false, error: errorMsg }
  }
}

export async function updateOrderAction(payload: UpdateOrderPayload) {
  try {
    await requireManager()
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
    await requireAuth()
    return await searchMasterItemsForOrder(search)
  } catch (err) {
    console.error("searchMasterItemsAction error:", err)
    return []
  }
}

export async function deleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireManager()
    const result = await deleteOrder(orderId)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to delete order" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("deleteOrderAction error:", err)
    return { success: false, error: errorMsg }
  }
}

export async function restoreOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireManager()
    const result = await restoreOrder(orderId)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to restore order" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("restoreOrderAction error:", err)
    return { success: false, error: errorMsg }
  }
}

export async function permanentlyDeleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const result = await permanentlyDeleteOrder(orderId)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to permanently delete order" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("permanentlyDeleteOrderAction error:", err)
    return { success: false, error: errorMsg }
  }
}

export async function cancelOrderCategoryAction(orderId: string, category: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireManager()
    const result = await cancelOrderCategory(orderId, category)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to cancel order category" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("cancelOrderCategoryAction error:", err)
    return { success: false, error: errorMsg }
  }
}

export async function uncancelOrderCategoryAction(orderId: string, category: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireManager()
    const result = await uncancelOrderCategory(orderId, category)
    if (!result.success) {
      return { success: false, error: result.error || "Failed to restore order category" }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error"
    console.error("uncancelOrderCategoryAction error:", err)
    return { success: false, error: errorMsg }
  }
}
