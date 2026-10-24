import * as React from "react"
import { MasterLabelsHub } from "./MasterLabelsHub"
import { getLocations, getItems } from "@/services/master.service"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Barcode Label Center | Glife WMS",
  description: "Generate and print shelf rack location labels and item barcode stickers.",
}

export default async function MasterLabelsPage() {
  let [{ data: locationsData }, { data: itemsData }] = await Promise.all([
    getLocations({}),
    getItems({ page: 1, limit: 2000 }),
  ])

  // Fallback: if active client filter returned 0 items, load all items so barcode center is always functional
  if (!itemsData || itemsData.length === 0) {
    const fallback = await getItems({ page: 1, limit: 2000, clientId: null })
    if (fallback.data && fallback.data.length > 0) {
      itemsData = fallback.data
    }
  }

  const dbCodes = (locationsData || []).map((l) => l.code).filter(Boolean)

  return (
    <MasterLabelsHub
      initialDbCodes={dbCodes}
      items={itemsData || []}
    />
  )
}
