"use server"

import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

export async function changePasswordAction(formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) return { error: "서버 설정 오류: Service Key 누락" }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const userId = formData.get("user_id")?.toString()
  const password = formData.get("password")?.toString()
  const confirmPassword = formData.get("confirm_password")?.toString()

  if (!userId) {
    return { error: "인증 정보가 없습니다." }
  }

  if (!password || password.length < 6) {
    return { error: "비밀번호는 최소 6자 이상이어야 합니다." }
  }

  if (password !== confirmPassword) {
    return { error: "비밀번호가 일치하지 않습니다." }
  }

  // Update password and clear requires_password_change flag
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: password,
    user_metadata: { requires_password_change: false }
  })

  if (error) {
    console.error("changePassword error:", error)
    return { error: "비밀번호 변경 실패: " + error.message }
  }

  return { success: true }
}
