export interface KakaoNotificationConfig {
  enabled: boolean
  rest_api_key?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string | null
  notify_on_new_order: boolean
  recipient_memo?: string
  last_status?: 'ACTIVE' | 'TOKEN_EXPIRED' | 'NOT_CONFIGURED' | 'ERROR'
  last_sent_at?: string | null
  last_error?: string | null
}

export interface KakaoSendResult {
  success: boolean
  message?: string
  error?: string
  resultCode?: number
}
