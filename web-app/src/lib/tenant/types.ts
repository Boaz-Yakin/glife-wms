export interface TenantSettings {
  tenant_id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  stock_policy: 'HARD_LIMIT' | 'BACKORDER';
  perishable_mode: boolean;
  auto_dekit_enabled: boolean;
  default_dekit_location_id: string | null;
  kakao_notification_enabled: boolean;
  updated_at: string;
}

export interface TenantContext {
  tenantId: string;
  code: string;
  companyName: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  settings: TenantSettings;
}
