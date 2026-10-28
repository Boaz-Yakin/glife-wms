import { createAdminClient } from '@/lib/supabase/admin'
import { KakaoNotificationConfig, KakaoSendResult } from '@/types/notifications'

const DEFAULT_CONFIG: KakaoNotificationConfig = {
  enabled: false,
  rest_api_key: '',
  access_token: '',
  refresh_token: '',
  token_expires_at: null,
  notify_on_new_order: true,
  recipient_memo: '나에게 보내기 (기본)',
  last_status: 'NOT_CONFIGURED',
  last_sent_at: null,
  last_error: null,
}

/**
 * Fetch Kakao Notification configuration from system_settings
 */
export async function getKakaoNotificationConfig(): Promise<KakaoNotificationConfig> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await (supabase as any)
      .from('system_settings')
      .select('value')
      .eq('key', 'kakao_notification')
      .single()

    if (error || !data?.value) {
      return DEFAULT_CONFIG
    }

    return {
      ...DEFAULT_CONFIG,
      ...data.value,
    }
  } catch (err: unknown) {
    console.error('Failed to get KakaoNotificationConfig:', err)
    return DEFAULT_CONFIG
  }
}

/**
 * Update Kakao Notification configuration in system_settings
 */
export async function updateKakaoNotificationConfig(
  updates: Partial<KakaoNotificationConfig>
): Promise<{ success: boolean; config: KakaoNotificationConfig; error?: string }> {
  try {
    const supabase = createAdminClient()
    const current = await getKakaoNotificationConfig()
    const merged: KakaoNotificationConfig = {
      ...current,
      ...updates,
      // If user provided a new access token, update status
      last_status: updates.enabled
        ? updates.access_token || current.access_token
          ? 'ACTIVE'
          : 'NOT_CONFIGURED'
        : current.last_status,
    }

    const { error } = await (supabase as any)
      .from('system_settings')
      .upsert({
        key: 'kakao_notification',
        value: merged,
        description: 'KakaoTalk notification settings via Kakao Developers REST API',
        updated_at: new Date().toISOString(),
      })

    if (error) {
      return { success: false, config: current, error: error.message }
    }

    return { success: true, config: merged }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating config'
    return { success: false, config: DEFAULT_CONFIG, error: message }
  }
}

/**
 * Refresh Kakao Access Token using Refresh Token & REST API Key
 */
export async function refreshKakaoAccessToken(
  currentConfig: KakaoNotificationConfig
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  if (!currentConfig.rest_api_key || !currentConfig.refresh_token) {
    return {
      success: false,
      error: 'REST API Key and Refresh Token are required for automatic token renewal.',
    }
  }

  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('client_id', currentConfig.rest_api_key.trim())
    params.append('refresh_token', currentConfig.refresh_token.trim())

    const res = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: params.toString(),
    })

    const data = await res.json()
    if (!res.ok || !data.access_token) {
      const errMsg = data.error_description || data.error || `HTTP ${res.status} token refresh failed`
      await updateKakaoNotificationConfig({
        last_status: 'TOKEN_EXPIRED',
        last_error: errMsg,
      })
      return { success: false, error: errMsg }
    }

    const newAccessToken: string = data.access_token
    const newRefreshToken: string = data.refresh_token || currentConfig.refresh_token
    const expiresIn: number = data.expires_in || 21600
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    await updateKakaoNotificationConfig({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expires_at: expiresAt,
      last_status: 'ACTIVE',
      last_error: null,
    })

    return { success: true, accessToken: newAccessToken }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Exception refreshing Kakao token'
    return { success: false, error: msg }
  }
}

/**
 * Send Kakao Talk "Send to Me" Default Text Template message
 */
export async function sendKakaoTextMessage(
  text: string,
  options: {
    buttonTitle?: string
    linkUrl?: string
    isTest?: boolean
  } = {}
): Promise<KakaoSendResult> {
  const config = await getKakaoNotificationConfig()

  // 1. Check if feature is enabled (tests can run if token is present even if disabled)
  if (!options.isTest && !config.enabled) {
    return { success: false, message: 'Kakao notification is currently turned OFF.' }
  }

  let accessToken = config.access_token?.trim()
  if (!accessToken) {
    await updateKakaoNotificationConfig({
      last_status: 'NOT_CONFIGURED',
      last_error: 'Access Token is missing. Please enter your Kakao Access Token.',
    })
    return {
      success: false,
      error: '카카오 액세스 토큰이 등록되지 않았습니다. 설정 화면에서 토큰을 입력해 주세요.',
    }
  }

  const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wms.glife.com/orders'
  const linkUrl = options.linkUrl || defaultUrl

  const templateObject = {
    object_type: 'text',
    text,
    link: {
      web_url: linkUrl,
      mobile_web_url: linkUrl,
    },
    button_title: options.buttonTitle || 'WMS 주문 확인하기',
  }

  const sendRequest = async (token: string) => {
    const bodyParams = new URLSearchParams()
    bodyParams.append('template_object', JSON.stringify(templateObject))

    return await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: bodyParams.toString(),
    })
  }

  try {
    let res = await sendRequest(accessToken)

    // Handle 401 Unauthorized (Expired Token) -> Attempt auto refresh
    if (res.status === 401 && config.refresh_token && config.rest_api_key) {
      console.log('Kakao access token expired, attempting auto refresh...')
      const refreshResult = await refreshKakaoAccessToken(config)
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken
        res = await sendRequest(accessToken)
      }
    }

    const data = await res.json()

    if (res.ok && data.result_code === 0) {
      await updateKakaoNotificationConfig({
        last_status: 'ACTIVE',
        last_sent_at: new Date().toISOString(),
        last_error: null,
      })
      return { success: true, resultCode: data.result_code }
    }

    const errMsg = data.msg || `Kakao API error (Code: ${data.code || res.status})`
    await updateKakaoNotificationConfig({
      last_status: res.status === 401 ? 'TOKEN_EXPIRED' : 'ERROR',
      last_error: errMsg,
    })
    return { success: false, error: errMsg, resultCode: data.code }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error communicating with Kakao API'
    await updateKakaoNotificationConfig({
      last_status: 'ERROR',
      last_error: errorMsg,
    })
    return { success: false, error: errorMsg }
  }
}

/**
 * Send Test Message to verify KakaoTalk integration
 */
export async function sendKakaoTestMessage(): Promise<KakaoSendResult> {
  const now = new Date()
  const timeFormatted = now.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const testMessage = `[GLIFE WMS - 카카오톡 알림 연동 테스트] ✅

카카오 개발자 REST API '나에게 보내기' 연동이 정상 확인되었습니다.

• 발송 일시: ${timeFormatted}
• 수신 채널: 나에게 보내기 (관리자 전용)
• 알림 기능: 활성화 대기/작동 중

신규 매장 주문 접수 시 이 채널로 주문 요약 정보가 실시간 자동 보고됩니다.`

  return await sendKakaoTextMessage(testMessage, {
    buttonTitle: 'WMS 대시보드 바로가기',
    isTest: true,
  })
}

/**
 * Send real-time KakaoTalk report for a newly placed order
 */
export async function sendKakaoOrderNotification(orderId: string): Promise<KakaoSendResult> {
  const config = await getKakaoNotificationConfig()
  if (!config.enabled) {
    return { success: false, message: 'Kakao notification is turned OFF.' }
  }

  try {
    const supabase = createAdminClient()

    // 1. Fetch Order Details with Store and Client
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select(`
        id,
        order_no,
        order_date,
        invoice_amount,
        note,
        status,
        store:store_id ( name, store_no ),
        client:client_id ( name, code )
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return { success: false, error: `Order not found: ${orderId}` }
    }

    // 2. Fetch Order Items to build item summary
    const { data: items } = await (supabase as any)
      .from('order_items')
      .select(`
        qty,
        uom,
        item:item_id ( name_en, sku )
      `)
      .eq('order_id', orderId)

    const totalUnits = (items || []).reduce((sum: number, it: any) => sum + (Number(it.qty) || 0), 0)
    const itemCount = items?.length || 0

    let itemsSummary = '품목 없음'
    if (items && items.length > 0) {
      const firstItem = items[0]?.item?.name_en || items[0]?.item?.sku || '상품'
      itemsSummary = itemCount > 1 ? `${firstItem} 외 ${itemCount - 1}건` : firstItem
    }

    const storeName = order.store?.name || (order.store?.store_no ? `매장 #${order.store.store_no}` : '지정 매장')
    const clientName = order.client?.name ? ` [${order.client.name}]` : ''
    const amountFormatted = Number(order.invoice_amount || 0).toLocaleString('ko-KR') + '원'
    
    // Order date formatting
    const orderDate = new Date(order.order_date || Date.now()).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    const memoText = order.note ? `\n• 주문메모: ${order.note}` : ''

    const reportMessage = `[GLIFE WMS - 신규 주문 접수 알림] 🔔${clientName}

새로운 매장 발주가 정상 접수되었습니다.

• 주문번호: ${order.order_no || order.id.slice(0, 8)}
• 발주매장: ${storeName}
• 접수일시: ${orderDate}
• 품목요약: ${itemsSummary} (총 ${totalUnits} EA)
• 결제/청구: ${amountFormatted}${memoText}

WMS 물류센터에서 재고 할당 및 피킹 작업을 확인해 주세요.`

    return await sendKakaoTextMessage(reportMessage, {
      buttonTitle: 'WMS 주문 상세 확인',
      linkUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://wms.glife.com'}/orders`,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Exception sending order notification'
    console.error('sendKakaoOrderNotification error:', err)
    return { success: false, error: errorMsg }
  }
}
