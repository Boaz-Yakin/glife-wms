"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

export async function createPartnerAction(formData: FormData) {
  const supabase = getAdminClient()

  const name = formData.get("name")?.toString()
  const type = formData.get("type")?.toString() || "BOTH"
  const contact_person = formData.get("contact_person")?.toString() || null
  const phone = formData.get("phone")?.toString() || null
  const email = formData.get("email")?.toString() || null
  const address = formData.get("address")?.toString() || null

  if (!name) {
    return { error: "Partner Name is required." }
  }

  const { error } = await (supabase as any).from("partners").insert([
    {
      name,
      type,
      contact_person,
      phone,
      email,
      address
    }
  ])

  if (error) {
    console.error("Create Partner Error:", error)
    return { error: "Failed to register partner: " + error.message }
  }

  revalidatePath("/master/partners")
  return { success: true }
}

export async function updatePartnerAction(formData: FormData) {
  const supabase = getAdminClient()
  
  const id = formData.get("id")?.toString()
  const name = formData.get("name")?.toString()
  const type = formData.get("type")?.toString() || "BOTH"
  const contact_person = formData.get("contact_person")?.toString() || null
  const phone = formData.get("phone")?.toString() || null
  const email = formData.get("email")?.toString() || null
  const address = formData.get("address")?.toString() || null

  if (!id || !name) {
    return { error: "Partner ID and Name are required." }
  }

  const { error } = await (supabase as any).from("partners").update({
    name,
    type,
    contact_person,
    phone,
    email,
    address,
    updated_at: new Date().toISOString()
  }).eq("id", id)

  if (error) {
    console.error("Update Partner Error:", error)
    return { error: "Failed to update partner: " + error.message }
  }

  revalidatePath("/master/partners")
  return { success: true }
}
