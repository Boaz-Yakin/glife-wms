"use server"

import { revalidatePath } from "next/cache"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export interface MyProfileData {
  id: string
  email: string
  phone: string
  first_name: string
  last_name: string
  role: string
  status: string
  created_at: string
}

export async function getMyProfileAction(): Promise<{ data: MyProfileData | null; error: string | null }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: "Authentication session not found. Please sign in again." }
    }

    const { data: rawProfile, error: profileError } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("getMyProfileAction error:", profileError)
    }

    const profile = rawProfile as {
      phone?: string | null
      first_name?: string | null
      last_name?: string | null
      role?: string | null
      status?: string | null
      created_at?: string | null
    } | null

    const profileData: MyProfileData = {
      id: user.id,
      email: user.email || "",
      phone: profile?.phone || user.user_metadata?.phone || (user.email ? user.email.split("@")[0] : ""),
      first_name: profile?.first_name || user.user_metadata?.first_name || "",
      last_name: profile?.last_name || user.user_metadata?.last_name || "",
      role: profile?.role || user.user_metadata?.role || "ADMIN",
      status: profile?.status || "ACTIVE",
      created_at: profile?.created_at || user.created_at || "",
    }

    return { data: profileData, error: null }
  } catch (err: any) {
    console.error("getMyProfileAction unexpected error:", err)
    return { data: null, error: "An unexpected error occurred while loading profile data." }
  }
}

export async function updateMyProfileAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Authentication required." }
    }

    const firstName = formData.get("first_name")?.toString().trim() || ""
    const lastName = formData.get("last_name")?.toString().trim() || ""
    const rawPhone = formData.get("phone")?.toString().trim() || ""

    if (!firstName || !lastName) {
      return { error: "Please provide both first name and last name." }
    }

    const cleanPhone = rawPhone.replace(/[^0-9]/g, "")
    if (!cleanPhone || cleanPhone.length < 10) {
      return { error: "Please enter a valid phone number (at least 10 digits)." }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    if (!serviceKey) {
      return { error: "Server configuration error: Service key missing." }
    }

    const adminClient = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Update public.users
    const { error: publicError } = await adminClient
      .from("users")
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      })

    if (publicError) {
      if (publicError.message.includes("unique") || publicError.message.includes("duplicate")) {
        return { error: "This phone number is already registered to another account." }
      }
      console.error("updateMyProfile public error:", publicError)
      return { error: "Failed to save profile: " + publicError.message }
    }

    // 2. Update auth.users email (virtual email based on phone number) & metadata
    const newVirtualEmail = `${cleanPhone}@glife.com`
    const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: newVirtualEmail,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone,
      },
    })

    if (authError) {
      console.error("updateMyProfile auth error:", authError)
      return { error: "Failed to synchronize login account: " + authError.message }
    }

    revalidatePath("/settings/profile")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: any) {
    console.error("updateMyProfileAction unexpected error:", err)
    return { error: "An unexpected error occurred while updating profile." }
  }
}

export async function updateMyPasswordAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Authentication required." }
    }

    const newPassword = formData.get("new_password")?.toString().trim() || ""
    const confirmPassword = formData.get("confirm_password")?.toString().trim() || ""

    if (!newPassword || newPassword.length < 6) {
      return { error: "Password must be at least 6 characters long." }
    }

    if (newPassword !== confirmPassword) {
      return { error: "New password and confirmation do not match." }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    if (!serviceKey) {
      return { error: "Server configuration error: Service key missing." }
    }

    const adminClient = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: {
        ...user.user_metadata,
        requires_password_change: false,
      },
    })

    if (authError) {
      console.error("updateMyPassword auth error:", authError)
      return { error: "Failed to update password: " + authError.message }
    }

    revalidatePath("/settings/profile")
    return { success: true }
  } catch (err: any) {
    console.error("updateMyPasswordAction unexpected error:", err)
    return { error: "An error occurred while changing password." }
  }
}
