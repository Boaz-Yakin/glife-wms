import * as React from "react"
import { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"
import { getCurrentTenant, getActiveTenantId } from "@/lib/tenant/context"
import { PolicyForm } from "./PolicyForm"
import { Sliders } from "lucide-react"

export const metadata: Metadata = {
  title: "Operating Policies | WMS Portal",
  description: "Configure tenant-wide warehouse operations and allocation policies",
}

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

export default async function PolicySettingsPage() {
  const tenant = await getCurrentTenant()
  const tenantId = await getActiveTenantId()
  const supabase = getAdminClient()

  // 테넌트 로케이션 목록 조회
  const { data: locations } = await (supabase as any)
    .from("locations")
    .select("id, code, zone_type")
    .eq("tenant_id", tenantId)
    .order("code", { ascending: true })

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sliders className="size-5 text-primary" />
          <span>Warehouse Operating Policies</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          [{tenant.companyName}] 물류센터의 재고 할당 정책, FEFO 유통기한 우선순위, 번들 자동 해체 스위치를 관리합니다.
        </p>
      </div>

      <PolicyForm
        initialSettings={tenant.settings}
        locations={locations || []}
      />
    </div>
  )
}

