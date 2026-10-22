import * as React from "react"
import { PrintClient } from "./PrintClient"
import { getLocations } from "@/services/master.service"

export default async function MasterLabelsPage() {
  const { data: locationsData } = await getLocations({})
  const dbCodes = (locationsData || []).map((l) => l.code).filter(Boolean)

  return (
    <div className="flex flex-col gap-6 print:m-0 print:p-0 print:block">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">Shelf Rack Physical Labels (Location QR Codes)</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate and print official warehouse shelf rack labels (100mm × 45mm / 4" × 1.8") with Tier color bands and 2D QR codes (or 1D barcodes).
        </p>
      </div>

      <PrintClient initialDbCodes={dbCodes} />
    </div>
  )
}
