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
  const isWorker = role === 'PICKER' || role === 'INSPECTOR'
  const password = isWorker ? "123456" : "password123" // 6-digit PIN for workers, password for managers

  // 1. Create in auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
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
      status: "ACTIVE",
      must_change_pin: isWorker ? true : false
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
  const role = formData.get("role")?.toString()

  if (!userId || !first_name || !last_name || !rawPhone) {
    return { error: "Please enter required fields (name, number)." }
  }

  const phone = rawPhone.replace(/[^0-9]/g, "")
  if (phone.length < 10) return { error: "Please enter a valid 10-digit US phone number." }

  // 1. Update public.users
  const updatePayload: Record<string, any> = { first_name, last_name, phone }
  if (role) {
    updatePayload.role = role
  }

  const { error: publicError } = await adminClient
    .from("users")
    .update(updatePayload)
    .eq("id", userId)

  if (publicError) {
    console.error("updateUser public error:", publicError)
    return { error: "Failed to update user profile: " + publicError.message }
  }

  // 2. Update email & metadata in auth.users
  const newEmail = `${phone}@glife.com`
  const authUpdatePayload: Record<string, any> = {
    email: newEmail,
    email_confirm: true
  }
  if (role) {
    authUpdatePayload.user_metadata = { role }
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdatePayload)

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

  // 1. Fetch user phone to clean up any login lockout records
  const { data: pubUser } = await adminClient.from("users").select("phone").eq("id", userId).maybeSingle()

  // 2. Explicitly nullify foreign key references in historical records to preserve audit trail safely
  try {
    await Promise.all([
      adminClient.from("orders").update({ user_id: null }).eq("user_id", userId),
      adminClient.from("inventory_adjustments").update({ adjusted_by: null }).eq("adjusted_by", userId),
      adminClient.from("cycle_count_requests").update({ requested_by: null }).eq("requested_by", userId),
      adminClient.from("cycle_count_requests").update({ reported_by: null }).eq("reported_by", userId),
      adminClient.from("cycle_count_requests").update({ completed_by: null }).eq("completed_by", userId),
      pubUser?.phone ? adminClient.from("auth_login_attempts").delete().eq("phone", pubUser.phone) : Promise.resolve(),
    ])
  } catch (cleanErr) {
    console.warn("User reference cleanup warning:", cleanErr)
  }

  // 3. Delete from public.users table
  const { error: pubDeleteError } = await adminClient.from("users").delete().eq("id", userId)
  if (pubDeleteError) {
    console.error("public.users delete error:", pubDeleteError)
    return { error: "Failed to delete user profile: " + pubDeleteError.message }
  }

  // 4. Delete from auth.users (authentication account)
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (authDeleteError && !authDeleteError.message.includes("User not found")) {
    console.error("auth.users delete error:", authDeleteError)
    return { error: "Failed to delete auth login: " + authDeleteError.message }
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

  // 1. Fetch user to check role & phone
  const { data: pubUser } = await adminClient.from("users").select("role, phone").eq("id", userId).maybeSingle()
  const isWorker = pubUser?.role === 'PICKER' || pubUser?.role === 'INSPECTOR'
  const newPassword = isWorker ? "123456" : "password123"

  // 2. Update password and force change on next login
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
    user_metadata: { requires_password_change: true }
  })

  if (error) {
    console.error("resetPassword error:", error)
    return { error: "Failed to reset password: " + error.message }
  }

  // 3. If worker, set must_change_pin = true and unlock any failed login lock
  if (isWorker) {
    await adminClient.from("users").update({ must_change_pin: true }).eq("id", userId)
    if (pubUser?.phone) {
      await adminClient.from("auth_login_attempts").delete().eq("phone", pubUser.phone)
    }
  }

  revalidatePath("/settings/users")
  return { success: true, temporarySecret: newPassword, isWorker }
}
