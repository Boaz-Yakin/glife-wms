import * as React from "react"
import { getInventoryReportsData } from "@/services/reports.service"
import { InventoryReportsView } from "@/components/features/inventory/InventoryReportsView"

export const metadata = {
  title: "Inventory Reports & Analytics | Glife WMS",
  description: "Executive replenishment, stockout forecast, FEFO expiry risks, and dormant inventory analysis.",
}

export default async function InventoryReportsPage() {
  const data = await getInventoryReportsData()

  return <InventoryReportsView data={data} />
}
