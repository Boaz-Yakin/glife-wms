import { createClient } from "@supabase/supabase-js"
import { getActiveTenantId } from "@/lib/tenant/context"
import {
  StudioNode,
  WarehouseStudioLayoutData,
  WarehouseLayoutRecord,
  generateLocationsFromNodes,
} from "@/types/warehouse-studio"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  return createClient(supabaseUrl, serviceKey)
}

const DEFAULT_INITIAL_NODES: StudioNode[] = [
  {
    id: "node-dock-01",
    type: "DOCK",
    label: "Inbound / Outbound Dock",
    x: 2,
    y: 2,
    width: 12,
    height: 4,
    zone: "DOCK",
    temperature: "ROOM",
    color: "#64748b",
  },
  {
    id: "node-staging-01",
    type: "STAGING",
    label: "Staging Floor (Zone S)",
    x: 2,
    y: 8,
    width: 12,
    height: 10,
    zone: "S",
    rackPrefix: "S01",
    bays: 10,
    levels: 1,
    bins: 1,
    temperature: "ROOM",
    color: "#f59e0b",
  },
  {
    id: "node-rack-a",
    type: "RACK",
    label: "Ambient Shelf (Zone A)",
    x: 18,
    y: 4,
    width: 16,
    height: 28,
    zone: "A",
    rackPrefix: "A01",
    bays: 10,
    levels: 2,
    bins: 2,
    temperature: "ROOM",
    color: "#10b981",
  },
  {
    id: "node-cold-f",
    type: "RACK",
    label: "Frozen Storage (Zone F)",
    x: 38,
    y: 4,
    width: 16,
    height: 28,
    zone: "F",
    rackPrefix: "F01",
    bays: 10,
    levels: 2,
    bins: 2,
    temperature: "FROZEN",
    color: "#06b6d4",
  },
]

export async function getWarehouseStudioLayout(): Promise<{
  data: WarehouseLayoutRecord | null
  error: string | null
}> {
  try {
    const tenantId = await getActiveTenantId()
    const supabase = getAdminClient()

    const { data, error } = await (supabase as any)
      .from("warehouse_layouts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("Error fetching warehouse layout:", error)
      return { data: null, error: error.message }
    }

    if (!data) {
      // Return a default virtual layout if none stored yet
      const fallback: WarehouseLayoutRecord = {
        id: "",
        tenant_id: tenantId,
        warehouse_name: "Primary Warehouse",
        grid_width: 60,
        grid_height: 40,
        layout_data: {
          viewport: { zoom: 1, panX: 20, panY: 20 },
          nodes: DEFAULT_INITIAL_NODES,
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return { data: fallback, error: null }
    }

    return { data: data as WarehouseLayoutRecord, error: null }
  } catch (err: any) {
    console.error("Unexpected error in getWarehouseStudioLayout:", err)
    return { data: null, error: err.message || "Failed to load warehouse layout" }
  }
}

export async function saveWarehouseStudioLayout(input: {
  id?: string
  warehouse_name?: string
  grid_width?: number
  grid_height?: number
  layout_data: WarehouseStudioLayoutData
}): Promise<{ data: WarehouseLayoutRecord | null; error: string | null }> {
  try {
    const tenantId = await getActiveTenantId()
    const supabase = getAdminClient()

    const payload = {
      tenant_id: tenantId,
      warehouse_name: input.warehouse_name || "Primary Warehouse",
      grid_width: input.grid_width || 60,
      grid_height: input.grid_height || 40,
      layout_data: input.layout_data,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    let query = (supabase as any).from("warehouse_layouts")

    if (input.id && input.id.trim() !== "") {
      const { data, error } = await query
        .update(payload)
        .eq("id", input.id)
        .eq("tenant_id", tenantId)
        .select()
        .single()

      if (error) throw error
      return { data: data as WarehouseLayoutRecord, error: null }
    } else {
      const { data, error } = await query
        .upsert(payload, { onConflict: "tenant_id, warehouse_name" })
        .select()
        .single()

      if (error) throw error
      return { data: data as WarehouseLayoutRecord, error: null }
    }
  } catch (err: any) {
    console.error("Failed to save warehouse layout:", err)
    return { data: null, error: err.message || "Failed to save warehouse layout" }
  }
}

export async function buildAndSyncStudioLocations(
  nodes: StudioNode[]
): Promise<{ count: number; codes: string[]; error: string | null }> {
  try {
    const tenantId = await getActiveTenantId()
    const supabase = getAdminClient()

    const generated = generateLocationsFromNodes(nodes)

    if (generated.length === 0) {
      return { count: 0, codes: [], error: "No rack or storage nodes configured to build." }
    }

    const rowsToUpsert = generated.map((loc) => ({
      code: loc.code,
      zone_type: loc.zone_type,
      pos_x: loc.pos_x,
      pos_y: loc.pos_y,
      rotation: loc.rotation,
      temperature_zone: loc.temperature_zone,
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    }))

    // Upsert locations based on (tenant_id, code) or code
    const { error } = await (supabase as any)
      .from("locations")
      .upsert(rowsToUpsert, { onConflict: "code" })

    if (error) {
      console.error("Error upserting generated locations:", error)
      return { count: 0, codes: [], error: error.message }
    }

    return {
      count: generated.length,
      codes: generated.map((g) => g.code),
      error: null,
    }
  } catch (err: any) {
    console.error("Failed to build locations from studio nodes:", err)
    return { count: 0, codes: [], error: err.message || "Failed to build locations" }
  }
}
