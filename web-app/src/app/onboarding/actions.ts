"use server"

import { revalidatePath } from "next/cache"
import { getCurrentTenant } from "@/lib/tenant/context"
import {
  saveTenantBranding,
  bulkImportItems,
  autoGenerateWarehouseLocations,
  bulkRegisterStores,
  completeOnboarding,
} from "@/services/onboarding.service"
import { BulkItemRow, BulkStoreRow } from "@/lib/importer/excel-bulk-importer"

export async function saveBrandingAction(data: {
  companyName: string
  primaryColor: string
  currency: string
  logoUrl?: string
}) {
  try {
    const tenant = await getCurrentTenant()
    const result = await saveTenantBranding(tenant.tenantId, data)
    revalidatePath("/onboarding")
    revalidatePath("/dashboard")
    return result
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save branding" }
  }
}

export async function bulkImportItemsAction(items: BulkItemRow[]) {
  try {
    const tenant = await getCurrentTenant()
    const result = await bulkImportItems(tenant.tenantId, items)
    revalidatePath("/onboarding")
    revalidatePath("/master/items")
    return result
  } catch (err: any) {
    return { success: false, inserted: 0, error: err.message || "Failed to import items" }
  }
}

export async function autoGenerateWarehouseAction(params: {
  zones: Array<{ code: string; tempZone: "ROOM" | "CHILLED" | "FROZEN" }>
  racksPerZone: number
  levelsPerRack: number
}) {
  try {
    const tenant = await getCurrentTenant()
    const result = await autoGenerateWarehouseLocations(tenant.tenantId, params)
    revalidatePath("/onboarding")
    revalidatePath("/master/locations")
    return result
  } catch (err: any) {
    return { success: false, generated: 0, error: err.message || "Failed to generate warehouse" }
  }
}

export async function bulkRegisterStoresAction(stores: BulkStoreRow[]) {
  try {
    const tenant = await getCurrentTenant()
    const result = await bulkRegisterStores(tenant.tenantId, stores)
    revalidatePath("/onboarding")
    revalidatePath("/master/stores")
    return result
  } catch (err: any) {
    return { success: false, inserted: 0, error: err.message || "Failed to register stores" }
  }
}

export async function completeOnboardingAction() {
  try {
    const tenant = await getCurrentTenant()
    const result = await completeOnboarding(tenant.tenantId)
    revalidatePath("/onboarding")
    revalidatePath("/dashboard")
    return result
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to complete onboarding" }
  }
}
