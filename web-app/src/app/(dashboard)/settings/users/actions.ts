"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

export async function createUserAction(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "Server configuration error: Service Key missing" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const first_name = formData.get("first_name")?.toString()
  const last_name = formData.get("last_name")?.toString()
  const rawPhone = formData.get("phone")?.toString() || ""
  const role = formData.get("role")?.toString() || "PICKER"

  if (!first_name || !last_name || !rawPhone) return { error: "Please enter required fields (name, phone number)." }

  const phone = rawPhone.replace(/[^0-9]/g, "")
  if (phone.length < 10) return { error: "Please enter a valid 10-digit US phone number." }

  const email = `${phone}@glife.com`
  const password = "password123" // Common initial password

  // 1. Create in auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { role, requires_password_change: true }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: "This phone number is already registered." }
    }
    console.error("createUser auth error:", authError)
    return { error: "Failed to create user auth account: " + authError.message }
  }

  const userId = authData.user.id

  // 2. Add to public.users
  const { error: publicError } = await adminClient.from("users").insert([
    {
      id: userId,
      phone,
      first_name,
      last_name,
      role,
      status: "ACTIVE"
    }
  ])

  if (publicError) {
    console.error("createUser public error:", publicError)
    // Rollback (delete auth user)
    await adminClient.auth.admin.deleteUser(userId)
    return { error: "Failed to create user profile: " + publicError.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function updateUserRoleAction(userId: string, newRole: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "Server configuration error: Service Key missing" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 1. Update public.users
  const { error: publicError } = await adminClient
    .from("users")
    .update({ role: newRole })
    .eq("id", userId)

  if (publicError) {
    console.error("updateUserRole public error:", publicError)
    return { error: "Failed to update public role: " + publicError.message }
  }

  // 2. Update auth.users metadata
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole }
  })

  if (authError) {
    console.error("updateUserRole auth error:", authError)
    return { error: "Failed to update role: " + authError.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function updateUserAction(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "Server configuration error: Missing Service Key" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const userId = formData.get("user_id")?.toString()
  const first_name = formData.get("first_name")?.toString()
  const last_name = formData.get("last_name")?.toString()
  const rawPhone = formData.get("phone")?.toString() || ""

  if (!userId || !first_name || !last_name || !rawPhone) {
    return { error: "Please enter required fields (name, number)." }
  }

  const phone = rawPhone.replace(/[^0-9]/g, "")
  if (phone.length < 10) return { error: "Please enter a valid 10-digit US phone number." }

  // 1. Update public.users
  const { error: publicError } = await adminClient
    .from("users")
    .update({ first_name, last_name, phone })
    .eq("id", userId)

  if (publicError) {
    console.error("updateUser public error:", publicError)
    return { error: "Failed to update user profile: " + publicError.message }
  }

  // 2. Update email in auth.users (Phone changes mean email changes)
  const newEmail = `${phone}@glife.com`
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: "Phone number already registered." }
    }
    console.error("updateUser auth error:", authError)
    return { error: "Failed to synchronize user login account: " + authError.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function deleteUserAction(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "Server configuration error: Missing Service Key" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Delete from auth.users (cascades to public.users)
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    console.error("deleteUser error:", error)
    return { error: "Failed to delete user: " + error.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function resetUserPasswordAction(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "Server Configuration Error: Missing Service Key" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Update password and force change on next login
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: "password123",
    user_metadata: { requires_password_change: true }
  })

  if (error) {
    console.error("resetPassword error:", error)
    return { error: "Failed to reset password: " + error.message }
  }

  return { success: true }
}
