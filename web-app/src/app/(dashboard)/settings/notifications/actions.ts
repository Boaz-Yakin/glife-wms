'use server'

import { revalidatePath } from 'next/cache'
import {
  getKakaoNotificationConfig,
  updateKakaoNotificationConfig,
  sendKakaoTestMessage,
  sendKakaoOrderNotification,
} from '@/services/kakao.service'
import { KakaoNotificationConfig, KakaoSendResult } from '@/types/notifications'
import { requireAdmin } from '@/lib/auth/guard'

export async function getKakaoConfigAction(): Promise<KakaoNotificationConfig> {
  await requireAdmin()
  return await getKakaoNotificationConfig()
}

export async function saveKakaoConfigAction(
  updates: Partial<KakaoNotificationConfig>
): Promise<{ success: boolean; config: KakaoNotificationConfig; error?: string }> {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { 
      success: false, 
      config: await getKakaoNotificationConfig(), 
      error: authErr instanceof Error ? authErr.message : "Unauthorized" 
    }
  }

  const result = await updateKakaoNotificationConfig(updates)
  revalidatePath('/settings/notifications')
  return result
}

export async function toggleKakaoNotificationAction(
  enabled: boolean
): Promise<{ success: boolean; config: KakaoNotificationConfig; error?: string }> {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { 
      success: false, 
      config: await getKakaoNotificationConfig(), 
      error: authErr instanceof Error ? authErr.message : "Unauthorized" 
    }
  }

  const result = await updateKakaoNotificationConfig({ enabled })
  revalidatePath('/settings/notifications')
  return result
}

export async function sendTestKakaoNotificationAction(): Promise<KakaoSendResult> {
  await requireAdmin()
  const res = await sendKakaoTestMessage()
  revalidatePath('/settings/notifications')
  return res
}

export async function triggerOrderKakaoNotificationAction(orderId: string): Promise<KakaoSendResult> {
  await requireAdmin()
  return await sendKakaoOrderNotification(orderId)
}
