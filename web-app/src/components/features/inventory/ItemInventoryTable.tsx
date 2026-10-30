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
  MapPin,
  Layers,
} from "lucide-react"
import { exportMultiSheetExcel } from "@/lib/export"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type {
  ItemInventoryRow,
  DynamicItemThreshold,
} from "@/services/inventory.service"
import {
  DEFAULT_STOCK_THRESHOLDS,
  StockThresholdConfig,
  ThresholdMode,
} from "./InventoryTable"

const STORAGE_KEY_CONFIG = "wms_inventory_stock_thresholds"
const STORAGE_KEY_MODE = "wms_inventory_threshold_mode"

function getItemAvailableBadge(
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
    tooltipText = `[Auto-Tuned by Velocity]\n• Daily Burn (ADU): ${dynamicThreshold.dailyVelocity.toFixed(2)}/day\n• Supplier Lead Time: ${dynamicThreshold.leadTimeDays}d\n• Safety Stock: ${lowThreshold}\n• Reorder Point: ${optimalThreshold}`
  } else if (mode === "auto") {
    tooltipText = `[Auto Fallback] Base safety stock threshold: ${lowThreshold}`
  } else {
    tooltipText = `[Manual Thresholds] Low: ${lowThreshold}, Optimal: ${optimalThreshold}`
  }

  let colorClass = ""

  if (available <= 0) {
    colorClass = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold"
  } else if (available <= lowThreshold) {
    colorClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
  } else if (available <= optimalThreshold) {
    colorClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
  } else {
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

interface ItemInventoryTableProps {
  data: ItemInventoryRow[]
  totalCount: number
  categories: string[]
  currentPage?: number
  pageSize?: number
}

export function ItemInventoryTable({
  data,
  totalCount,
  categories,
  currentPage = 1,
  pageSize = 20,
}: ItemInventoryTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const defaultSearch = searchParams.get("search") || ""
  const defaultCategory = searchParams.get("category") || "ALL"

  const [searchTerm, setSearchTerm] = React.useState(defaultSearch)

  // Threshold mode & settings
  const [mode, setMode] = React.useState<ThresholdMode>("auto")
  const [thresholds, setThresholds] = React.useState<StockThresholdConfig>(DEFAULT_STOCK_THRESHOLDS)
  const [tempThresholds, setTempThresholds] = React.useState<StockThresholdConfig>(DEFAULT_STOCK_THRESHOLDS)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  // Load preferences from localStorage
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

  // Debounced search sync to URL
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

  const handleCategoryChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== "ALL") {
      params.set("category", val)
    } else {
      params.delete("category")
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

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
  const currentSortBy = searchParams.get("sortBy") || "available"
  const currentSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc"

  const handleSort = (sortKey: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSortBy === sortKey) {
      if (currentSortOrder === "asc") {
        params.set("sortOrder", "desc")
      } else {
        // Toggle off
        params.delete("sortBy")
        params.delete("sortOrder")
      }
    } else {
      params.set("sortBy", sortKey)
      params.set("sortOrder", "asc")
    }
    params.delete("page")
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

  // Export to Excel
  const handleExport = () => {
    const rows = data.map((d) => ({
      SKU: d.sku,
      "Item Name": d.desc ? `${d.name} (${d.desc})` : d.name,
      Category: d.category,
      UOM: d.uom,
      "Total On Hand": d.totalOnHand,
      "Total Allocated": d.totalAllocated,
      "Total Available": d.totalAvailable,
      "Bin Count": d.locationCount,
      "Storage Locations Breakdown": d.locations
        .map((l) => `${l.code} (On-Hand: ${l.onHand}, Avail: ${l.available})`)
        .join("; "),
      "Daily Velocity (ADU)": d.dynamicThreshold?.dailyVelocity ?? 0,
      "Safety Stock": d.dynamicThreshold?.safetyStock ?? 10,
      "Reorder Point": d.dynamicThreshold?.reorderPoint ?? 50,
    }))

    toast.promise(
      new Promise<void>((resolve) => {
        exportMultiSheetExcel(
          [{ sheetName: "Item Stock Summary", data: rows }],
          `Item_Inventory_Summary_${new Date().toISOString().slice(0, 10)}`
        )
        resolve()
      }),
      {
        loading: "Exporting item inventory summary...",
        success: "Item Inventory Summary exported to Excel!",
        error: "Failed to export Excel report",
      }
    )
  }

  const columns = React.useMemo<ColumnDef<ItemInventoryRow>[]>(() => [
    {
      accessorKey: "sku",
      header: () => renderSortableHeader("SKU", "sku"),
      cell: ({ row }) => (
        <div className="font-mono text-xs font-bold text-primary tabular-nums">
          {row.original.sku}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: () => renderSortableHeader("Item Name", "name"),
      cell: ({ row }) => {
        const name = row.original.name
        const desc = row.original.desc?.trim()
        return (
          <div className="font-semibold text-sm">
            <span>{name}</span>
            {desc && (
              <span className="text-muted-foreground ml-1 font-normal text-xs">
                ({desc})
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: () => renderSortableHeader("Category", "category"),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-medium bg-muted/30">
          {row.original.category}
        </Badge>
      ),
    },
    {
      id: "locations",
      header: () => renderSortableHeader("Storage Bins", "bins"),
      cell: ({ row }) => {
        const locs = row.original.locations || []
        const count = locs.length

        if (count === 0) {
          return <span className="text-xs text-muted-foreground italic">None (Unassigned)</span>
        }

        return (
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "xs" }),
                "h-6 px-2 text-[11px] font-mono gap-1.5 cursor-pointer bg-background hover:bg-muted border-border/80"
              )}
            >
              <MapPin className="size-3 text-emerald-500 shrink-0" />
              <span>
                {count} {count === 1 ? "Rack" : "Racks"}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3 space-y-2 shadow-xl">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  <span>Stored Racks for {row.original.sku}</span>
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {count} Location{count > 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1 text-xs">
                {locs.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded-md bg-muted/40 border border-border/40 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground">{loc.code}</span>
                      <span className="text-[10px] text-muted-foreground">({loc.zone})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">On-Hand: {loc.onHand}</span>
                      <span className="font-bold text-emerald-500">Avail: {loc.available}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )
      },
    },
    {
      accessorKey: "totalOnHand",
      header: () => renderSortableHeader("Total On Hand", "on_hand", true),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums font-mono text-sm">
          {row.original.totalOnHand}
        </div>
      ),
    },
    {
      accessorKey: "totalAllocated",
      header: () => renderSortableHeader("Total Allocated", "allocated", true),
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground tabular-nums font-mono text-sm">
          {row.original.totalAllocated}
        </div>
      ),
    },
    {
      accessorKey: "totalAvailable",
      header: () => renderSortableHeader("Total Available", "available", true),
      cell: ({ row }) => {
        const available = row.original.totalAvailable
        const dyn = row.original.dynamicThreshold
        return (
          <div className="text-right">
            {getItemAvailableBadge(available, thresholds, dyn, mode)}
          </div>
        )
      },
    },
    {
      accessorKey: "uom",
      header: () => <div className="text-center">UOM</div>,
      cell: ({ row }) => (
        <div className="text-center text-xs font-mono text-muted-foreground">
          {row.original.uom}
        </div>
      ),
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
            placeholder="Search SKU, Item Name, Category, or Rack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm bg-background"
          />
          <Select defaultValue={defaultCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
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
                <h4 className="font-semibold text-sm leading-none flex items-center gap-1.5">
                  <SlidersHorizontal className="size-4 text-primary" />
                  Stock Criteria & Thresholds
                </h4>
                <p className="text-xs text-muted-foreground">
                  Determine how item stock status colors are evaluated.
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
                      Each item calculates its own thresholds using <strong>Daily Outbound Velocity (ADU)</strong> and <strong>Supplier Lead Time</strong> with a 95% service level buffer.
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    Hover over any Available badge in the table to view the breakdown.
                  </p>
                </div>
              ) : (
                /* Manual Mode Configuration */
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="item-low-threshold" className="text-xs font-medium">
                        Low Stock Threshold (Amber)
                      </Label>
                      <Input
                        id="item-low-threshold"
                        type="number"
                        min={1}
                        max={tempThresholds.optimal - 1}
                        value={tempThresholds.low}
                        onChange={(e) =>
                          setTempThresholds((prev) => ({
                            ...prev,
                            low: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="item-optimal-threshold" className="text-xs font-medium">
                        Optimal Stock Threshold (Green)
                      </Label>
                      <Input
                        id="item-optimal-threshold"
                        type="number"
                        min={tempThresholds.low + 1}
                        value={tempThresholds.optimal}
                        onChange={(e) =>
                          setTempThresholds((prev) => ({
                            ...prev,
                            optimal: Math.max(prev.low + 1, parseInt(e.target.value) || prev.low + 1),
                          }))
                        }
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
            title="Export Item Inventory Stock Summary to Excel"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Summary (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No items found matching the criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Status Footer */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing <strong className="font-semibold text-foreground">{startItem}</strong> to{" "}
              <strong className="font-semibold text-foreground">{endItem}</strong> of{" "}
              <strong className="font-semibold text-foreground">{totalCount}</strong> items
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
