"use server"

import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

export async function changePasswordAction(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "Server Configuration Error: Missing Service Key" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const userId = formData.get("user_id")?.toString()
  const password = formData.get("password")?.toString()
  const confirmPassword = formData.get("confirm_password")?.toString()

  if (!userId) {
    return { error: "Authentication information is missing." }
  }

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  // Update password and clear requires_password_change flag
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: password,
    user_metadata: { requires_password_change: false }
  })

  if (error) {
    console.error("changePassword error:", error)
    return { error: "Failed to change password: " + error.message }
  }

  return { success: true }
}
