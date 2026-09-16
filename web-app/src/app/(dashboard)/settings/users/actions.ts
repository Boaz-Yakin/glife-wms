"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

export async function createUserAction(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "서버 설정 오류: Service Key 누락" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const first_name = formData.get("first_name")?.toString()
  const last_name = formData.get("last_name")?.toString()
  const rawPhone = formData.get("phone")?.toString() || ""
  const role = formData.get("role")?.toString() || "PICKER"

  if (!first_name || !last_name || !rawPhone) return { error: "필수 항목(이름, 핸드폰 번호)을 입력해주세요." }

  const phone = rawPhone.replace(/[^0-9]/g, "")
  if (phone.length < 10) return { error: "올바른 미국 전화번호 10자리를 입력해주세요." }

  const email = `${phone}@glife.com`
  const password = "password123" // 공통 초기 비밀번호

  // 1. auth.users 에 생성
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { role, requires_password_change: true }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: "이미 등록된 핸드폰 번호입니다." }
    }
    console.error("createUser auth error:", authError)
    return { error: "사용자 인증 계정 생성 실패: " + authError.message }
  }

  const userId = authData.user.id

  // 2. public.users 에 추가
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
    // 롤백 (auth user 삭제) - 생략해도 되지만 안정성을 위해 추가
    await adminClient.auth.admin.deleteUser(userId)
    return { error: "사용자 프로필 생성 실패: " + publicError.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function updateUserRoleAction(userId: string, newRole: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "서버 설정 오류: Service Key 누락" }

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
    return { error: "프로필 권한 수정 실패: " + publicError.message }
  }

  // 2. Update auth.users metadata
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole }
  })

  if (authError) {
    console.error("updateUserRole auth error:", authError)
    return { error: "인증 권한 수정 실패: " + authError.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function updateUserAction(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "서버 설정 오류: Service Key 누락" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const userId = formData.get("user_id")?.toString()
  const first_name = formData.get("first_name")?.toString()
  const last_name = formData.get("last_name")?.toString()
  const rawPhone = formData.get("phone")?.toString() || ""

  if (!userId || !first_name || !last_name || !rawPhone) {
    return { error: "필수 항목(이름, 번호)을 입력해주세요." }
  }

  const phone = rawPhone.replace(/[^0-9]/g, "")
  if (phone.length < 10) return { error: "올바른 미국 전화번호 10자리를 입력해주세요." }

  // 1. Update public.users
  const { error: publicError } = await adminClient
    .from("users")
    .update({ first_name, last_name, phone })
    .eq("id", userId)

  if (publicError) {
    console.error("updateUser public error:", publicError)
    return { error: "사용자 프로필 수정 실패: " + publicError.message }
  }

  // 2. Update email in auth.users (Phone changes mean email changes)
  const newEmail = `${phone}@glife.com`
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: "이미 등록된 번호입니다." }
    }
    console.error("updateUser auth error:", authError)
    return { error: "사용자 로그인 계정 동기화 실패: " + authError.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function deleteUserAction(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "서버 설정 오류: Service Key 누락" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Delete from auth.users (cascades to public.users)
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    console.error("deleteUser error:", error)
    return { error: "사용자 삭제 실패: " + error.message }
  }

  revalidatePath("/settings/users")
  return { success: true }
}

export async function resetUserPasswordAction(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "서버 설정 오류: Service Key 누락" }

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
    return { error: "비밀번호 초기화 실패: " + error.message }
  }

  return { success: true }
}
