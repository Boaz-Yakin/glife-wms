"use server"
 
import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function createClientAction(formData: FormData) {
  const supabase = getAdminClient()
  const name = formData.get("name")?.toString().trim()
  let code = formData.get("code")?.toString().trim().toUpperCase()
  const is_active = formData.get("is_active") === "true"

  if (!name) {
    return { error: "Client Name is required." }
  }

  // Auto-generate code if empty (e.g., "BB.Q CHICKEN" -> "CLIENT-BBQ-CHICKEN")
  if (!code) {
    const slug = name.replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").toUpperCase()
    code = slug.startsWith("CLIENT-") ? slug : `CLIENT-${slug}`
  }

  const { data: existing } = await supabase.from("clients").select("id").eq("code", code).maybeSingle()
  if (existing) {
    return { error: `Client Code '${code}' is already taken. Please choose a different code.` }
  }

  const { error } = await supabase.from("clients").insert([
    {
      name,
      code,
      is_active,
    }
  ])

  if (error) {
    console.error("createClientAction error:", error)
    return { error: "Failed to create client: " + error.message }
  }

  revalidatePath("/master/clients")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateClientAction(formData: FormData) {
  const supabase = getAdminClient()
  const id = formData.get("id")?.toString()
  const name = formData.get("name")?.toString().trim()
  const code = formData.get("code")?.toString().trim().toUpperCase()
  const is_active = formData.get("is_active") === "true"

  if (!id || !name || !code) {
    return { error: "Client ID, Name, and Code are required." }
  }

  // Check code conflict
  const { data: existing } = await supabase.from("clients").select("id").eq("code", code).neq("id", id).maybeSingle()
  if (existing) {
    return { error: `Client Code '${code}' is already in use by another client.` }
  }

  const { error } = await supabase.from("clients").update({
    name,
    code,
    is_active,
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  if (error) {
    console.error("updateClientAction error:", error)
    return { error: "Failed to update client: " + error.message }
  }

  revalidatePath("/master/clients")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function toggleClientStatusAction(id: string, currentStatus: boolean) {
  const supabase = getAdminClient()
  const newStatus = !currentStatus

  const { error } = await supabase
    .from("clients")
    .update({ is_active: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    return { error: "Failed to toggle status: " + error.message }
  }

  revalidatePath("/master/clients")
  revalidatePath("/", "layout")
  return { success: true, is_active: newStatus }
}

export async function deleteClientAction(id: string) {
  const supabase = getAdminClient()

  // 1. Safety Check: Verify if client has dependent items, stores, or orders
  const [
    { count: itemCount },
    { count: storeCount },
    { count: orderCount },
  ] = await Promise.all([
    supabase.from("items").select("*", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("stores").select("*", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("client_id", id),
  ])

  if ((itemCount || 0) > 0 || (storeCount || 0) > 0 || (orderCount || 0) > 0) {
    return {
      error: `Cannot delete client: Contains ${itemCount || 0} items, ${storeCount || 0} stores, and ${orderCount || 0} orders. Please deactivate the client instead to preserve historical records.`
    }
  }

  const { error } = await supabase.from("clients").delete().eq("id", id)
  if (error) {
    return { error: "Failed to delete client: " + error.message }
  }

  // Clear cookie if active client was deleted
  const cookieStore = await cookies()
  if (cookieStore.get("active_client_id")?.value === id) {
    cookieStore.delete("active_client_id")
  }

  revalidatePath("/master/clients")
  revalidatePath("/", "layout")
  return { success: true }
}
