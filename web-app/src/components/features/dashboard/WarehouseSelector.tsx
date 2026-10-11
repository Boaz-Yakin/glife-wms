"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, ChevronDown } from "lucide-react"

export function WarehouseSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentWarehouse = searchParams.get("warehouse") || "all"

  const warehouses = [
    { id: "all", label: "전체 센터 (All Centers)", shortLabel: "전체 센터" },
    { id: "gimpo", label: "김포 메인센터 (Gimpo Main Hub)", shortLabel: "김포 센터" },
    { id: "yongin", label: "용인 저온센터 (Yongin Cold Hub)", shortLabel: "용인 센터" },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === "all") {
      params.delete("warehouse")
    } else {
      params.set("warehouse", val)
    }
    const query = params.toString()
    router.push(query ? `?${query}` : window.location.pathname)
  }

  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border bg-background text-xs font-medium shadow-2xs hover:bg-muted/50 transition-colors">
        <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <select
          value={currentWarehouse}
          onChange={handleChange}
          aria-label="Select Warehouse"
          className="bg-transparent text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer pr-4 appearance-none"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id} className="bg-popover text-popover-foreground">
              {w.label}
            </option>
          ))}
        </select>
        <ChevronDown className="h-3 w-3 text-muted-foreground pointer-events-none absolute right-2.5" />
      </div>
    </div>
  )
}
