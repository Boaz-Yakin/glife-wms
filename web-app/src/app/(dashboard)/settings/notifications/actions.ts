'use server'

import { revalidatePath } from 'next/cache'
import {
  getKakaoNotificationConfig,
  updateKakaoNotificationConfig,
  sendKakaoTestMessage,
  sendKakaoOrderNotification,
} from '@/services/kakao.service'
import { KakaoNotificationConfig, KakaoSendResult } from '@/types/notifications'

export async function getKakaoConfigAction(): Promise<KakaoNotificationConfig> {
  return await getKakaoNotificationConfig()
}

export async function saveKakaoConfigAction(
  updates: Partial<KakaoNotificationConfig>
): Promise<{ success: boolean; config: KakaoNotificationConfig; error?: string }> {
  const result = await updateKakaoNotificationConfig(updates)
  revalidatePath('/settings/notifications')
  return result
}

export async function toggleKakaoNotificationAction(
  enabled: boolean
): Promise<{ success: boolean; config: KakaoNotificationConfig; error?: string }> {
  const result = await updateKakaoNotificationConfig({ enabled })
  revalidatePath('/settings/notifications')
  return result
}

export async function sendTestKakaoNotificationAction(): Promise<KakaoSendResult> {
  const res = await sendKakaoTestMessage()
  revalidatePath('/settings/notifications')
  return res
}

export async function triggerOrderKakaoNotificationAction(orderId: string): Promise<KakaoSendResult> {
  return await sendKakaoOrderNotification(orderId)
}
