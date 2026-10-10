"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { checkStoreOrderCount } from "@/services/stores.service"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(supabaseUrl, serviceKey)
}

export async function createStoreAction(formData: FormData) {
  const supabase = getAdminClient()

  const clientId = formData.get("client_id")?.toString()
  const storeNo = formData.get("store_no")?.toString()?.trim()
  const name = formData.get("name")?.toString()?.trim()
  const address = formData.get("address")?.toString()?.trim() || null
  const phone = formData.get("phone")?.toString()?.trim() || null
  const contactPerson = formData.get("contact_person")?.toString()?.trim() || null
  const note = formData.get("note")?.toString()?.trim() || null
  const isActive = formData.get("is_active") === "true" || formData.get("is_active") === "on"

  if (!clientId) {
    return { error: "Client is required." }
  }
  if (!storeNo) {
    return { error: "Store Number (store_no) is required." }
  }
  if (!name) {
    return { error: "Store Name is required." }
  }

  const { data, error } = await (supabase as any).from("stores").insert([
    {
      client_id: clientId,
      store_no: storeNo,
      name,
      address,
      phone,
      contact_person: contactPerson,
      note,
      is_active: isActive,
    },
  ]).select().single()

  if (error) {
    console.error("Create Store Error:", error)
    if (error.code === "23505") {
      return { error: `Store number '${storeNo}' already exists for this client.` }
    }
    return { error: "Failed to register store: " + error.message }
  }

  revalidatePath("/master/stores")
  return { success: true, data }
}

export async function updateStoreAction(formData: FormData) {
  const supabase = getAdminClient()

  const id = formData.get("id")?.toString()
  const clientId = formData.get("client_id")?.toString()
  const storeNo = formData.get("store_no")?.toString()?.trim()
  const name = formData.get("name")?.toString()?.trim()
  const address = formData.get("address")?.toString()?.trim() || null
  const phone = formData.get("phone")?.toString()?.trim() || null
  const contactPerson = formData.get("contact_person")?.toString()?.trim() || null
  const note = formData.get("note")?.toString()?.trim() || null
  const isActive = formData.get("is_active") === "true" || formData.get("is_active") === "on"

  if (!id) {
    return { error: "Store ID is missing." }
  }
  if (!clientId) {
    return { error: "Client is required." }
  }
  if (!storeNo) {
    return { error: "Store Number (store_no) is required." }
  }
  if (!name) {
    return { error: "Store Name is required." }
  }

  const { error } = await (supabase as any)
    .from("stores")
    .update({
      client_id: clientId,
      store_no: storeNo,
      name,
      address,
      phone,
      contact_person: contactPerson,
      note,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Update Store Error:", error)
    if (error.code === "23505") {
      return { error: `Store number '${storeNo}' already exists for this client.` }
    }
    return { error: "Failed to update store: " + error.message }
  }

  revalidatePath("/master/stores")
  return { success: true }
}

export async function toggleStoreStatusAction(id: string, nextStatus: boolean) {
  const supabase = getAdminClient()

  const { error } = await (supabase as any)
    .from("stores")
    .update({
      is_active: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Toggle Store Status Error:", error)
    return { error: "Failed to update store status: " + error.message }
  }

  revalidatePath("/master/stores")
  return { success: true }
}

export async function deleteStoreAction(id: string) {
  // Check if there are linked orders
  const { count, error: countError } = await checkStoreOrderCount(id)
  if (countError) {
    return { error: "Failed to verify order history: " + countError }
  }

  if (count > 0) {
    return {
      error: `Cannot delete store. There are ${count} order(s) associated with this store. Please deactivate it instead.`,
      hasOrders: true,
      orderCount: count,
    }
  }

  const supabase = getAdminClient()
  const { error } = await (supabase as any).from("stores").delete().eq("id", id)

  if (error) {
    console.error("Delete Store Error:", error)
    return { error: "Failed to delete store: " + error.message }
  }

  revalidatePath("/master/stores")
  return { success: true }
}
