import * as React from "react"
import { MasterLabelsHub } from "./MasterLabelsHub"
import { getLocations, getItems } from "@/services/master.service"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Barcode Label Center | Glife WMS",
  description: "Generate and print shelf rack location labels and item barcode stickers.",
}

export default async function MasterLabelsPage() {
  const [{ data: locationsData }, { data: itemsData }] = await Promise.all([
    getLocations({}),
    getItems({ page: 1, limit: 1000 }),
  ])

  const dbCodes = (locationsData || []).map((l) => l.code).filter(Boolean)

  return (
    <MasterLabelsHub
      initialDbCodes={dbCodes}
      items={itemsData || []}
    />
  )
}
