"use server"

import { revalidatePath } from "next/cache"
import {
  getWarehouseStudioLayout,
  saveWarehouseStudioLayout,
  buildAndSyncStudioLocations,
} from "@/services/warehouse-studio.service"
import { StudioNode, WarehouseStudioLayoutData } from "@/types/warehouse-studio"

export async function fetchWarehouseLayoutAction() {
  return await getWarehouseStudioLayout()
}

export async function saveWarehouseLayoutAction(input: {
  id?: string
  warehouse_name?: string
  grid_width?: number
  grid_height?: number
  layout_data: WarehouseStudioLayoutData
}) {
  const result = await saveWarehouseStudioLayout(input)
  if (!result.error) {
    revalidatePath("/master/warehouse-studio")
    revalidatePath("/master/locations")
    revalidatePath("/dashboard")
  }
  return result
}

export async function buildLocationsFromStudioAction(nodes: StudioNode[]) {
  const result = await buildAndSyncStudioLocations(nodes)
  if (!result.error) {
    revalidatePath("/master/locations")
    revalidatePath("/master/labels")
    revalidatePath("/master/warehouse-studio")
  }
  return result
}
