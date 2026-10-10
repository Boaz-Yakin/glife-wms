import { createClient } from "@/lib/supabase/server"
import { getActiveClientAction } from "@/app/actions/client.actions"

export interface StoreData {
  id: string
  store_no: string
  name: string
  address: string | null
  phone: string | null
  contact_person: string | null
  note: string | null
  is_active: boolean
  client_id: string
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
    code: string
  } | null
  orders_count?: number
}

interface GetStoresParams {
  clientId?: string | null
  search?: string
  status?: "all" | "active" | "inactive"
  page?: number
  limit?: number
}

export async function getStores({
  clientId,
  search = "",
  status = "all",
  page = 1,
  limit = 50,
}: GetStoresParams = {}) {
  const supabase = await createClient()

  // Base query with join on clients
  let query = supabase
    .from("stores")
    .select(`
      *,
      client:clients(id, name, code)
    `, { count: "exact" })

  // 1. Resolve client filter
  const effectiveClientId = clientId !== undefined ? clientId : await getActiveClientAction()
  if (effectiveClientId) {
    query = query.eq("client_id", effectiveClientId)
  }

  // 2. Active status filter
  if (status === "active") {
    query = query.eq("is_active", true)
  } else if (status === "inactive") {
    query = query.eq("is_active", false)
  }

  // 3. Search filter
  if (search.trim()) {
    const s = search.trim()
    query = query.or(`store_no.ilike.%${s}%,name.ilike.%${s}%,address.ilike.%${s}%,contact_person.ilike.%${s}%`)
  }

  // 4. Pagination & Sorting
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await query
    .range(from, to)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getStores error:", error)
    return { data: [], count: 0, error: error.message }
  }

  const formattedData: StoreData[] = (data || []).map((row: any) => ({
    ...row,
    orders_count: 0,
  }))

  return { data: formattedData, count: count || 0, error: null }
}

export async function getStoreById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stores")
    .select(`
      *,
      client:clients(id, name, code)
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("getStoreById error:", error)
    return { data: null, error: error ? error.message : "Not found" }
  }

  const rawData = data as any
  return {
    data: {
      ...rawData,
      orders_count: 0,
    } as StoreData,
    error: null,
  }
}

export async function checkStoreOrderCount(id: string) {
  // Use admin client to avoid user relation RLS recursion
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = createAdminClient(supabaseUrl, serviceKey)

  const { count, error } = await adminClient
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("store_id", id)

  if (error) {
    console.error("checkStoreOrderCount error:", error)
    return { count: 0, error: error.message }
  }

  return { count: count || 0, error: null }
}
