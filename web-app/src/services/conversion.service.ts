import { createClient } from "@supabase/supabase-js"
import { getActiveTenantId } from "@/lib/tenant/context"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, serviceKey)
}

export interface ItemConversion {
  id: string;
  tenant_id: string;
  parent_item_id: string;
  child_item_id: string;
  conversion_ratio: number;
  target_location_id: string | null;
  auto_dekit_on_order: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  parent_item?: {
    id: string;
    sku: string;
    name_en: string;
    uom: string;
  } | null;
  child_item?: {
    id: string;
    sku: string;
    name_en: string;
    uom: string;
  } | null;
  target_location?: {
    id: string;
    code: string;
    zone_type: string;
  } | null;
}

export async function getConversions(): Promise<{ data: ItemConversion[] | null; error: string | null }> {
  try {
    const tenantId = await getActiveTenantId()
    const supabase = getAdminClient()

    const { data, error } = await (supabase as any)
      .from('item_conversions')
      .select(`
        id,
        tenant_id,
        parent_item_id,
        child_item_id,
        conversion_ratio,
        target_location_id,
        auto_dekit_on_order,
        note,
        created_at,
        updated_at,
        parent_item:parent_item_id (id, sku, name_en, uom),
        child_item:child_item_id (id, sku, name_en, uom),
        target_location:target_location_id (id, code, zone_type)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Get Conversions Error:", error)
      return { data: null, error: error.message }
    }

    return { data: (data as ItemConversion[]) || [], error: null }
  } catch (err: any) {
    return { data: null, error: err.message || "Failed to load conversions" }
  }
}

