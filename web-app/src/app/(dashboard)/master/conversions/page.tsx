import * as React from "react"
import { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"
import { getConversions } from "@/services/conversion.service"
import { getActiveTenantId } from "@/lib/tenant/context"
import { ConversionsClient } from "./ConversionsClient"

export const metadata: Metadata = {
  title: "Bundle Conversions | WMS Portal",
  description: "Manage bundle de-kitting and conversion rules across items",
}

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

export default async function ConversionsPage() {
  const tenantId = await getActiveTenantId()
  const supabase = getAdminClient()

  // 1. 변환 목록 조회
  const { data: conversions } = await getConversions()

  // 2. 테넌트의 품목 리스트 조회 (선택용)
  const { data: items } = await (supabase as any)
    .from("items")
    .select("id, sku, name_en, uom")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sku", { ascending: true })

  // 3. 테넌트의 로케이션 리스트 조회 (선택용)
  const { data: locations } = await (supabase as any)
    .from("locations")
    .select("id, code, zone_type")
    .eq("tenant_id", tenantId)
    .order("code", { ascending: true })

  return (
    <ConversionsClient
      initialConversions={conversions || []}
      items={items || []}
      locations={locations || []}
    />
  )
}

