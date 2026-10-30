"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Download,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  Sliders,
  Info,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react"
import { exportToExcel, exportMultiSheetExcel } from "@/lib/export"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { DynamicItemThreshold } from "@/services/inventory.service"

// Types matching the service response
export type InventoryData = {
  id: string
  on_hand_qty: number
  allocated_qty: number
  expiration_date?: string | null
  lot_no?: string | null
  updated_at: string
  created_at?: string
  item: {
    id: string
    sku: string
    name_en: string
    desc_en?: string | null
    shelf_life_days?: number | null
    min_stock_qty?: number | null
    lead_time_days?: number | null
    dynamicThreshold?: DynamicItemThreshold
  } | any
  location: { code: string; zone_type: string } | any
}

export type ThresholdMode = "auto" | "manual"

export interface StockThresholdConfig {
  low: number      // Low stock warning (0 < available <= low)
  optimal: number  // Optimal stock level (low < available <= optimal, surplus > optimal)
}

export const DEFAULT_STOCK_THRESHOLDS: StockThresholdConfig = {
  low: 10,
  optimal: 100,
}

const STORAGE_KEY_CONFIG = "wms_inventory_stock_thresholds"
const STORAGE_KEY_MODE = "wms_inventory_threshold_mode"

function getAvailableBadge(
  available: number,
  thresholds: StockThresholdConfig,
  dynamicThreshold?: DynamicItemThreshold,
  mode: ThresholdMode = "auto"
) {
  let lowThreshold = thresholds.low
  let optimalThreshold = thresholds.optimal
  let tooltipText = ""

  if (mode === "auto" && dynamicThreshold) {
    lowThreshold = dynamicThreshold.safetyStock
    optimalThreshold = dynamicThreshold.reorderPoint
    tooltipText = `[Auto-Tuned by Velocity]\n• Daily Burn (ADU): ${dynamicThreshold.dailyVelocity.toFixed(2)}/day\n• Supplier Lead Time: ${dynamicThreshold.leadTimeDays}d\n• Safety Stock (Low): ${lowThreshold}\n• Reorder Point (Optimal): ${optimalThreshold}`
  } else if (mode === "auto") {
    tooltipText = `[Auto Fallback] Base safety stock threshold: ${lowThreshold}`
  } else {
    tooltipText = `[Manual Thresholds] Low: ${lowThreshold}, Optimal: ${optimalThreshold}`
  }

  let colorClass = ""

  if (available <= 0) {
    // Out of Stock / Negative: Rose / Red
    colorClass = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold"
  } else if (available <= lowThreshold) {
    // Low stock warning: Amber / Orange
    colorClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
  } else if (available <= optimalThreshold) {
    // Optimal / Adequate: Emerald / Green
    colorClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
  } else {
    // Surplus / High: Sky / Blue
    colorClass = "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 font-semibold"
  }

  return (
    <span
      title={tooltipText}
      className={cn(
        "inline-flex items-center justify-center min-w-9 px-2 py-0.5 rounded-md text-xs font-mono border tabular-nums cursor-help transition-all",
        colorClass
      )}
    >
      {available}
    </span>
  )
}

function getExpirationBadge(expDateStr?: string | null) {
  if (!expDateStr) {
    return <span className="text-muted-foreground text-xs font-mono">-</span>
  }

  const expDate = new Date(expDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expDate.setHours(0, 0, 0, 0)

  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  let badgeVariant = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
  let label = `D-${diffDays}`

  if (diffDays <= 0) {
    badgeVariant = "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40 animate-pulse"
    label = diffDays === 0 ? "D-Day (Today)" : `Expired (${Math.abs(diffDays)}d)`
  } else if (diffDays <= 14) {
    badgeVariant = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold"
    label = `D-${diffDays} (Critical)`
  } else if (diffDays <= 45) {
    badgeVariant = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    label = `D-${diffDays}`
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="font-mono text-xs tabular-nums text-foreground/90 font-medium">
        {expDateStr}
      </span>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeVariant}`}>
        {label}
      </span>
    </div>
  )
}

interface InventoryTableProps {
  data: InventoryData[]
  totalCount: number
  currentPage?: number
  pageSize?: number
}

export function InventoryTable({
  data,
  totalCount,
  currentPage = 1,
  pageSize = 20,
}: InventoryTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const defaultSearch = searchParams.get("search") || ""
  const defaultZone = searchParams.get("zone") || "ALL"

  const [searchTerm, setSearchTerm] = React.useState(defaultSearch)

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handlePageSizeChange = (newSize: string | null) => {
    if (!newSize) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("limit", newSize)
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const getVisiblePages = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }
    return pages
  }

  // Sorting state & handler
  const currentSortBy = searchParams.get("sortBy") || ""
  const currentSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc"

  const handleSort = (sortKey: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSortBy === sortKey) {
      if (currentSortOrder === "asc") {
        params.set("sortOrder", "desc")
      } else {
        // Toggle off: reset sort to default
        params.delete("sortBy")
        params.delete("sortOrder")
      }
    } else {
      params.set("sortBy", sortKey)
      params.set("sortOrder", "asc")
    }
    params.delete("page") // Reset to page 1 on sort change
    router.replace(`${pathname}?${params.toString()}`)
  }

  const renderSortableHeader = (label: string, sortKey: string, alignRight = false) => {
    const isSorted = currentSortBy === sortKey
    return (
      <button
        type="button"
        onClick={() => handleSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold text-xs transition-colors hover:text-foreground cursor-pointer select-none group",
          alignRight ? "justify-end w-full text-right" : "justify-start text-left",
          isSorted ? "text-foreground font-bold" : "text-muted-foreground"
        )}
      >
        <span>{label}</span>
        {isSorted ? (
          currentSortOrder === "asc" ? (
            <ArrowUp className="size-3.5 text-primary shrink-0" />
          ) : (
            <ArrowDown className="size-3.5 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
        )}
      </button>
    )
  }

  // Threshold mode: "auto" (Statistical velocity & lead time) or "manual" (Global fixed thresholds)
  const [mode, setMode] = React.useState<ThresholdMode>("auto")
  const [thresholds, setThresholds] = React.useState<StockThresholdConfig>(DEFAULT_STOCK_THRESHOLDS)
  const [tempThresholds, setTempThresholds] = React.useState<StockThresholdConfig>(DEFAULT_STOCK_THRESHOLDS)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  // Load saved preferences from localStorage on mount
  React.useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as ThresholdMode | null
      if (savedMode === "auto" || savedMode === "manual") {
        setMode(savedMode)
      }
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        if (typeof parsed.low === "number" && typeof parsed.optimal === "number") {
          setThresholds(parsed)
          setTempThresholds(parsed)
        }
      }
    } catch (e) {
      console.warn("Failed to load inventory threshold preferences:", e)
    }
  }, [])

  const handleModeChange = (newMode: ThresholdMode) => {
    setMode(newMode)
    try {
      localStorage.setItem(STORAGE_KEY_MODE, newMode)
      toast.success(
        newMode === "auto"
          ? "Switched to Auto-Tuned Mode (Dynamic Velocity & Lead Time)"
          : "Switched to Manual Thresholds Mode"
      )
    } catch (e) {
      console.warn("Failed to save threshold mode to localStorage:", e)
    }
  }

  const handleSaveThresholds = () => {
    if (tempThresholds.low >= tempThresholds.optimal) {
      toast.error("Low stock threshold must be less than optimal threshold.")
      return
    }
    setThresholds(tempThresholds)
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(tempThresholds))
      toast.success("Manual stock level thresholds saved.")
    } catch (e) {
      console.warn("Failed to save inventory thresholds to localStorage:", e)
    }
    setIsSettingsOpen(false)
  }

  const handleResetDefaults = () => {
    setTempThresholds(DEFAULT_STOCK_THRESHOLDS)
    setThresholds(DEFAULT_STOCK_THRESHOLDS)
    try {
      localStorage.removeItem(STORAGE_KEY_CONFIG)
      toast.info("Stock thresholds reset to defaults.")
    } catch (e) {
      console.warn("Failed to reset inventory thresholds:", e)
    }
    setIsSettingsOpen(false)
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchTerm) {
        params.set("search", searchTerm)
        params.delete("page")
      } else {
        params.delete("search")
      }
      router.replace(`${pathname}?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchTerm, pathname, router, searchParams])

  const handleZoneChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== "ALL") {
      params.set("zone", val)
    } else {
      params.delete("zone")
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleExport = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const formatItemNameWithDesc = (item?: { name_en?: string | null; desc_en?: string | null } | null) => {
      if (!item) return 'N/A'
      const name = item.name_en?.trim() || 'N/A'
      const desc = item.desc_en?.trim()
      return desc ? `${name} (${desc})` : name
    }

    // 1. All Inventory Sheet
    const allSheet = data.map((d) => {
      const available = d.on_hand_qty - d.allocated_qty
      const vel = d.item?.dynamicThreshold?.dailyVelocity ?? 0
      const dos = vel > 0 ? Math.round((available / vel) * 10) / 10 : 'N/A'
      return {
        Location: d.location?.code || 'N/A',
        Zone: d.location?.zone_type || 'N/A',
        SKU: d.item?.sku || 'N/A',
        "Item Name": formatItemNameWithDesc(d.item),
        "Exp. Date": d.expiration_date || 'N/A',
        "Lot No": d.lot_no || 'N/A',
        "On Hand": d.on_hand_qty,
        Allocated: d.allocated_qty,
        Available: available,
        "Daily Velocity (ADU)": vel,
        "Days of Supply (DOS)": dos,
        "Safety Stock": d.item?.dynamicThreshold?.safetyStock ?? d.item?.min_stock_qty ?? 10,
        "Reorder Point": d.item?.dynamicThreshold?.reorderPoint ?? 50,
        "Lead Time (Days)": d.item?.dynamicThreshold?.leadTimeDays ?? d.item?.lead_time_days ?? 7,
        "Updated At": d.updated_at ? new Date(d.updated_at).toLocaleString('en-US') : '',
      }
    })

    // 2. Reorder Suggestions Sheet (Available <= Reorder Point)
    const reorderSheet: any[] = []
    data.forEach((d) => {
      const available = d.on_hand_qty - d.allocated_qty
      const rop = d.item?.dynamicThreshold?.reorderPoint ?? 50
      const ss = d.item?.dynamicThreshold?.safetyStock ?? d.item?.min_stock_qty ?? 10
      const leadTime = d.item?.dynamicThreshold?.leadTimeDays ?? d.item?.lead_time_days ?? 7
      const vel = d.item?.dynamicThreshold?.dailyVelocity ?? 0

      if (available <= rop) {
        const deficit = Math.max(0, rop - available)
        const roq = Math.max(0, (rop + ss) - available)
        let urgency = "NORMAL (Below ROP)"
        if (available <= 0) urgency = "CRITICAL (Stockout)"
        else if (available <= ss) urgency = "HIGH (Below Safety Stock)"

        reorderSheet.push({
          Urgency: urgency,
          SKU: d.item?.sku || 'N/A',
          "Item Name": formatItemNameWithDesc(d.item),
          Location: d.location?.code || 'N/A',
          Available: available,
          "Safety Stock": ss,
          "Reorder Point": rop,
          "Deficit Qty": deficit,
          "Recommended Order Qty (ROQ)": roq,
          "Daily Velocity (ADU)": vel,
          "Lead Time (Days)": leadTime,
        })
      }
    })
    reorderSheet.sort((a, b) => (a.Available - b.Available))

    // 3. Stockout Risk Sheet (DOS <= 14 days and vel > 0)
    const stockoutSheet: any[] = []
    data.forEach((d) => {
      const available = d.on_hand_qty - d.allocated_qty
      const vel = d.item?.dynamicThreshold?.dailyVelocity ?? 0
      if (vel > 0) {
        const dos = Math.round((available / vel) * 10) / 10
        if (dos <= 14) {
          let risk = "WATCH (≤14 Days)"
          if (dos <= 3) risk = "URGENT (≤3 Days)"
          else if (dos <= 7) risk = "WARNING (≤7 Days)"

          stockoutSheet.push({
            "Risk Level": risk,
            SKU: d.item?.sku || 'N/A',
            "Item Name": formatItemNameWithDesc(d.item),
            Location: d.location?.code || 'N/A',
            Available: available,
            "Daily Velocity (ADU)": vel,
            "Days of Supply (DOS)": dos,
            "Lead Time (Days)": d.item?.dynamicThreshold?.leadTimeDays ?? d.item?.lead_time_days ?? 7,
          })
        }
      }
    })
    stockoutSheet.sort((a, b) => (a["Days of Supply (DOS)"] - b["Days of Supply (DOS)"]))

    // 4. FEFO & Expiry Alert Sheet
    const expirySheet: any[] = []
    data.forEach((d) => {
      if (d.expiration_date) {
        const expDate = new Date(d.expiration_date)
        expDate.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 90) {
          let status = `WATCH (D-${diffDays})`
          if (diffDays <= 0) status = diffDays === 0 ? "D-Day (Expires Today)" : `EXPIRED (${Math.abs(diffDays)}d ago)`
          else if (diffDays <= 14) status = `CRITICAL (D-${diffDays})`
          else if (diffDays <= 45) status = `WARNING (D-${diffDays})`

          expirySheet.push({
            Status: status,
            "Days Remaining": diffDays,
            "Exp. Date": d.expiration_date,
            "Lot No": d.lot_no || 'N/A',
            SKU: d.item?.sku || 'N/A',
            "Item Name": formatItemNameWithDesc(d.item),
            Location: d.location?.code || 'N/A',
            "On Hand Qty": d.on_hand_qty,
            Allocated: d.allocated_qty,
          })
        }
      }
    })
    expirySheet.sort((a, b) => (a["Days Remaining"] - b["Days Remaining"]))

    // 5. Overstock & Dead Stock
    const overstockSheet: any[] = []
    data.forEach((d) => {
      const available = d.on_hand_qty - d.allocated_qty
      const vel = d.item?.dynamicThreshold?.dailyVelocity ?? 0
      const surplus = d.item?.dynamicThreshold?.surplusPoint ?? 200

      if (available > 0 && vel === 0) {
        overstockSheet.push({
          Classification: "DEAD STOCK (No Outbound in 30d)",
          SKU: d.item?.sku || 'N/A',
          "Item Name": formatItemNameWithDesc(d.item),
          Location: d.location?.code || 'N/A',
          Available: available,
          "Daily Velocity (ADU)": 0,
          "Surplus Point": surplus,
        })
      } else if (available >= surplus) {
        overstockSheet.push({
          Classification: "SURPLUS (Excess Stock)",
          SKU: d.item?.sku || 'N/A',
          "Item Name": formatItemNameWithDesc(d.item),
          Location: d.location?.code || 'N/A',
          Available: available,
          "Daily Velocity (ADU)": vel,
          "Surplus Point": surplus,
        })
      }
    })
    overstockSheet.sort((a, b) => (b.Available - a.Available))

    toast.promise(
      new Promise<void>((resolve) => {
        exportMultiSheetExcel([
          { sheetName: "All Inventory", data: allSheet },
          { sheetName: "Reorder Suggestions", data: reorderSheet },
          { sheetName: "Stockout Risk (DOS)", data: stockoutSheet },
          { sheetName: "FEFO Expiry Alert", data: expirySheet },
          { sheetName: "Overstock & Dead Stock", data: overstockSheet },
        ], `Inventory_Executive_Report_${new Date().toISOString().slice(0, 10)}`)
        resolve()
      }),
      {
        loading: "Generating 5-in-1 Executive Report...",
        success: "5-in-1 Executive Inventory Report downloaded!",
        error: "Failed to generate Excel report"
      }
    )
  }

  const columns = React.useMemo<ColumnDef<InventoryData>[]>(() => [
    {
      accessorKey: "location.code",
      header: () => renderSortableHeader("Location", "location"),
      cell: ({ row }) => <div className="font-medium tabular-nums">{row.original.location?.code || 'N/A'}</div>,
    },
    {
      accessorKey: "item.sku",
      header: () => renderSortableHeader("SKU", "sku"),
      cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.item?.sku || 'N/A'}</div>,
    },
    {
      accessorKey: "item.name_en",
      header: () => renderSortableHeader("Item Name", "name"),
      cell: ({ row }) => {
        const name = row.original.item?.name_en || 'N/A'
        const desc = row.original.item?.desc_en?.trim()
        const fullText = desc ? `${name} (${desc})` : name
        return (
          <div className="font-semibold" title={fullText}>
            <span>{name}</span>
            {desc ? (
              <span className="text-muted-foreground ml-1 font-normal">({desc})</span>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: "expiration_date",
      header: () => renderSortableHeader("Exp. Date / D-Day", "expiration_date"),
      cell: ({ row }) => getExpirationBadge(row.original.expiration_date),
    },
    {
      accessorKey: "lot_no",
      header: () => renderSortableHeader("Lot No.", "lot_no"),
      cell: ({ row }) => (
        <div className="text-xs font-mono text-muted-foreground tabular-nums">
          {row.original.lot_no || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "on_hand_qty",
      header: () => renderSortableHeader("On Hand", "on_hand_qty", true),
      cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.on_hand_qty}</div>,
    },
    {
      accessorKey: "allocated_qty",
      header: () => renderSortableHeader("Allocated", "allocated_qty", true),
      cell: ({ row }) => <div className="text-right text-muted-foreground tabular-nums">{row.original.allocated_qty}</div>,
    },
    {
      id: "available_qty",
      header: () => renderSortableHeader("Available", "available", true),
      cell: ({ row }) => {
        const available = row.original.on_hand_qty - row.original.allocated_qty
        const dyn = row.original.item?.dynamicThreshold
        return (
          <div className="text-right">
            {getAvailableBadge(available, thresholds, dyn, mode)}
          </div>
        )
      },
    },
  ], [thresholds, mode, currentSortBy, currentSortOrder])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input 
            placeholder="Search Location, SKU, Item Name, or Description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm bg-background" 
          />
          <Select defaultValue={defaultZone} onValueChange={handleZoneChange}>
            <SelectTrigger className="w-[120px] bg-background">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Zones</SelectItem>
              <SelectItem value="A">Zone A</SelectItem>
              <SelectItem value="F">Zone F</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Thresholds Settings Popover */}
          <Popover 
            open={isSettingsOpen} 
            onOpenChange={(open) => {
              setIsSettingsOpen(open)
              if (open) setTempThresholds(thresholds)
            }}
          >
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "shrink-0 bg-background gap-1.5 cursor-pointer font-medium",
                mode === "auto" && "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10"
              )}
            >
              {mode === "auto" ? (
                <Zap className="size-4 text-primary fill-primary/20" />
              ) : (
                <SlidersHorizontal className="size-4 text-muted-foreground" />
              )}
              <span>Thresholds</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-muted font-mono uppercase text-muted-foreground">
                {mode}
              </span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-88 p-4 space-y-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm leading-none flex items-center gap-1.5">
                    <SlidersHorizontal className="size-4 text-primary" />
                    Stock Criteria & Thresholds
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Determine how inventory status colors are evaluated.
                </p>
              </div>

              {/* Mode Toggle Switch */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleModeChange("auto")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer",
                    mode === "auto"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="size-3.5 text-primary" />
                  Auto-Tuned
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("manual")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer",
                    mode === "manual"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sliders className="size-3.5 text-muted-foreground" />
                  Manual
                </button>
              </div>

              {/* Auto Mode Info Card */}
              {mode === "auto" ? (
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs text-foreground/90">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Zap className="size-3.5" />
                      Dynamic Statistical Formula
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Each SKU automatically calculates its own thresholds using <strong>Daily Outbound Velocity (ADU)</strong> and <strong>Supplier Lead Time ($L$)</strong> with a 95% service level buffer.
                    </p>
                    <div className="pt-1 border-t border-border/40 text-[11px] font-mono space-y-1 text-muted-foreground">
                      <div>• Safety Stock: <span className="text-foreground">Ceil(1.65 × σ × √L)</span></div>
                      <div>• Reorder Point: <span className="text-foreground">ADU × L + Safety Stock</span></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    Hover over any Available badge in the table to view the breakdown for that item.
                  </p>
                </div>
              ) : (
                /* Manual Mode Configuration */
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/40 p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-medium text-foreground">Out of Stock</span>
                      </div>
                      <span className="font-mono text-muted-foreground">&le; 0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-medium text-foreground">Low Stock</span>
                      </div>
                      <span className="font-mono text-muted-foreground">1 ~ {tempThresholds.low}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-foreground">Optimal Stock</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{tempThresholds.low + 1} ~ {tempThresholds.optimal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-sky-500 shrink-0" />
                        <span className="font-medium text-foreground">Surplus Stock</span>
                      </div>
                      <span className="font-mono text-muted-foreground">&gt; {tempThresholds.optimal}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="low-threshold" className="text-xs font-medium">
                          Low Stock Threshold (Amber)
                        </Label>
                        <span className="text-[11px] text-muted-foreground">&le; value</span>
                      </div>
                      <Input
                        id="low-threshold"
                        type="number"
                        min={1}
                        max={tempThresholds.optimal - 1}
                        value={tempThresholds.low}
                        onChange={(e) => setTempThresholds(prev => ({ 
                          ...prev, 
                          low: Math.max(1, parseInt(e.target.value) || 1) 
                        }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="optimal-threshold" className="text-xs font-medium">
                          Optimal Stock Threshold (Green)
                        </Label>
                        <span className="text-[11px] text-muted-foreground">&le; value</span>
                      </div>
                      <Input
                        id="optimal-threshold"
                        type="number"
                        min={tempThresholds.low + 1}
                        value={tempThresholds.optimal}
                        onChange={(e) => setTempThresholds(prev => ({ 
                          ...prev, 
                          optimal: Math.max(prev.low + 1, parseInt(e.target.value) || prev.low + 1) 
                        }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleResetDefaults}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <RotateCcw className="size-3 mr-1" />
                      Reset
                    </Button>
                    <Button
                      size="xs"
                      onClick={handleSaveThresholds}
                      className="text-xs px-3 cursor-pointer"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            className="shrink-0 bg-background gap-2 font-medium cursor-pointer border-emerald-600/30 hover:bg-emerald-500/5 hover:border-emerald-600/50" 
            onClick={handleExport}
            title="Export 5-in-1 Executive Multi-Sheet Excel (Inventory, Reorder, DOS, FEFO, Dead Stock)"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Executive Report (.xlsx)</span>
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination & Status Footer */}
      <div className="space-y-3 pt-1">
        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing <strong className="font-semibold text-foreground">{startItem}</strong> to{" "}
              <strong className="font-semibold text-foreground">{endItem}</strong> of{" "}
              <strong className="font-semibold text-foreground">{totalCount}</strong> records
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-7 w-[68px] text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
                title="First Page"
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-8 px-2 text-xs flex items-center gap-1"
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>

              <div className="flex items-center gap-1 px-1">
                {getVisiblePages().map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(p as number)}
                      className={`h-8 w-8 p-0 text-xs ${p === currentPage ? "font-bold" : ""}`}
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 px-2 text-xs flex items-center gap-1"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
                title="Last Page"
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Dynamic Status Legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              {mode === "auto" ? (
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <Zap className="size-3" /> Auto Velocity:
                </span>
              ) : (
                "Available:"
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500" />
              <span className="font-mono">&le;0 (Stockout)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="font-mono">{mode === "auto" ? "≤Safety Stock" : `≤${thresholds.low}`}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-mono">{mode === "auto" ? "≤Reorder Point" : `≤${thresholds.optimal}`}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-sky-500" />
              <span className="font-mono">{mode === "auto" ? ">Surplus" : `>${thresholds.optimal}`}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


