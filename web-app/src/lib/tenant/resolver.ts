import { createClient } from '@supabase/supabase-js'
import { TenantContext, TenantSettings } from './types'

// 메모리 캐시 (TTL 60초)
const tenantCache = new Map<string, { data: TenantContext; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 1000

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

// Glife 기본 테넌트 폴백 (Zero-Downtime 및 로컬 개발용)
const GLIFE_FALLBACK: TenantContext = {
  tenantId: '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
  code: 'glife',
  companyName: 'Glife Co., Ltd.',
  subscriptionPlan: 'ENTERPRISE',
  subscriptionStatus: 'ACTIVE',
  settings: {
    tenant_id: '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    logo_url: '/logo.png',
    favicon_url: '/favicon.ico',
    primary_color: '#059669',
    currency: 'KRW',
    currency_symbol: '₩',
    timezone: 'Asia/Seoul',
    stock_policy: 'HARD_LIMIT',
    perishable_mode: true,
    auto_dekit_enabled: true,
    default_dekit_location_id: '31b632f2-e408-4d5a-bf11-47b52b8db673',
    kakao_notification_enabled: false,
    updated_at: new Date().toISOString(),
  },
}

export async function resolveTenantFromHost(hostname: string): Promise<TenantContext> {
  // 포트 번호 제거 (e.g. localhost:3000 -> localhost)
  const cleanHost = hostname.split(':')[0].toLowerCase()

  // 1. 캐시 검사
  const cached = tenantCache.get(cleanHost)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  // 2. 로컬호스트나 IP 주소는 기본 Glife 테넌트 반환
  if (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost.endsWith('.local') ||
    cleanHost.includes('vercel.app')
  ) {
    tenantCache.set(cleanHost, { data: GLIFE_FALLBACK, expiresAt: Date.now() + CACHE_TTL_MS })
    return GLIFE_FALLBACK
  }

  // 3. 서브도메인 추출 (e.g. acme.wms-saas.com -> acme)
  const parts = cleanHost.split('.')
  const subdomain = parts.length > 2 ? parts[0] : null

  try {
    const supabase = getAdminClient()

    let query = supabase
      .from('tenants')
      .select(`
        id,
        code,
        company_name,
        subscription_plan,
        subscription_status,
        tenant_settings (*)
      `)

    if (subdomain) {
      query = query.or(`code.eq.${subdomain},custom_domain.eq.${cleanHost}`)
    } else {
      query = query.eq('custom_domain', cleanHost)
    }

    const { data: tenant, error } = await query.maybeSingle()

    if (error || !tenant) {
      console.warn(`[TenantResolver] No tenant found for host: ${cleanHost}. Falling back to default.`);
      return GLIFE_FALLBACK
    }

    const settingsData = Array.isArray(tenant.tenant_settings)
      ? tenant.tenant_settings[0]
      : tenant.tenant_settings

    const context: TenantContext = {
      tenantId: tenant.id,
      code: tenant.code,
      companyName: tenant.company_name,
      subscriptionPlan: tenant.subscription_plan || 'STARTER',
      subscriptionStatus: tenant.subscription_status || 'ACTIVE',
      settings: (settingsData as TenantSettings) || GLIFE_FALLBACK.settings,
    }

    // 캐시에 저장
    tenantCache.set(cleanHost, { data: context, expiresAt: Date.now() + CACHE_TTL_MS })
    return context
  } catch (err) {
    console.error('[TenantResolver] Failed to resolve tenant:', err)
    return GLIFE_FALLBACK
  }
}
