"use server"

import { cookies } from "next/headers"
import { requireAuth } from "@/lib/auth/guard"

export async function setActiveClientAction(clientId: string | null) {
  try {
    await requireAuth()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const cookieStore = await cookies()
  if (clientId) {
    cookieStore.set("active_client_id", clientId, { path: '/' })
  } else {
    cookieStore.delete("active_client_id")
  }
  return { success: true }
}

export async function getActiveClientAction() {
  const cookieStore = await cookies()
  const activeClientId = cookieStore.get("active_client_id")?.value || null
  return activeClientId
}
