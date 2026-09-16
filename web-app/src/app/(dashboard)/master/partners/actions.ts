"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createPartnerAction(formData: FormData) {
  const supabase = await createClient()

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
