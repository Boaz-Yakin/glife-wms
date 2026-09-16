import * as React from "react"
import { PrintClient } from "./PrintClient"

export default function MasterLabelsPage() {
  return (
    <div className="flex flex-col gap-6 print:m-0 print:p-0 print:block">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">Print Barcode Labels</h2>
        <p className="text-muted-foreground mt-1">
          Generate and send barcode labels to printer for SKUs or racks (locations).
        </p>
      </div>

      <PrintClient />
    </div>
  )
}
