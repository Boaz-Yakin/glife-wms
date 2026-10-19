"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LocationData } from "@/services/master.service"
import { WarehouseStructureModal } from "@/components/features/dashboard/WarehouseStructureModal"
import {
  SunMedium,
  ThermometerSnowflake,
  Sparkles,
  Package,
  Search,
  CheckCircle2,
  Inbox,
  Clock,
  Settings2,
} from "lucide-react"

const columns: ColumnDef<LocationData>[] = [
  {
    accessorKey: "code",
    header: "Location Code",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border text-foreground">
          {row.original.code}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "zone",
    header: "Zone",
    cell: ({ row }) => {
      const isCold = row.original.zone_type === "F"
      return (
        <Badge
          variant="outline"
          className={`gap-1 font-medium text-xs ${
            isCold
              ? "border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10"
              : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          }`}
        >
          {isCold ? (
            <ThermometerSnowflake className="h-3 w-3" />
          ) : (
            <SunMedium className="h-3 w-3" />
          )}
          <span>{row.original.zone}</span>
        </Badge>
      )
    },
  },
  {
    accessorKey: "aisle",
    header: "Aisle",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-foreground font-medium">
        {row.original.aisle}
      </span>
    ),
  },
  {
    accessorKey: "bay",
    header: "Bay",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-foreground font-medium">
        {row.original.bay}
      </span>
    ),
  },
  {
    accessorKey: "level",
    header: "Shelf Level",
    cell: ({ row }) => {
      const isGolden = row.original.isGoldenZone
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-foreground">
            {row.original.tier}
          </span>
          {isGolden && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0 h-4">
              <Sparkles className="h-2.5 w-2.5" />
              Golden Zone
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "bin",
    header: "Bin Slot",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground font-medium">
        {row.original.bin}
      </span>
    ),
  },
  {
    accessorKey: "onHandQty",
    header: "Current Stock",
    cell: ({ row }) => {
      const qty = row.original.onHandQty
      const sku = row.original.storedItemSku
      const name = row.original.storedItemName

      if (qty > 0 && sku) {
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1 px-1.5 py-0 h-5 font-mono">
                <Package className="h-3 w-3" />
                {qty.toLocaleString()} units
              </Badge>
              <span className="font-mono text-[11px] font-semibold text-foreground">
                {sku}
              </span>
            </div>
            {name && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={name}>
                {name}
              </span>
            )}
          </div>
        )
      }

      return (
        <span className="text-xs text-muted-foreground/70 flex items-center gap-1 italic">
          <Inbox className="h-3 w-3" />
          Empty Slot
        </span>
      )
    },
  },
  {
    accessorKey: "createdAtFormatted",
    header: "Registered (Atlanta Time)",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 text-muted-foreground/60" />
        <span className="tabular-nums font-mono">{row.original.createdAtFormatted}</span>
      </div>
    ),
  },
]

interface LocationsTableProps {
  data: LocationData[]
}

export function LocationsTable({ data }: LocationsTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [zoneFilter, setZoneFilter] = React.useState<"all" | "A" | "F">("all")

  const filteredData = React.useMemo(() => {
    let list = data
    if (zoneFilter !== "all") {
      list = list.filter((item) => item.zone_type === zoneFilter)
    }
    return list
  }, [data, zoneFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const [isStructureModalOpen, setIsStructureModalOpen] = React.useState<boolean>(false)

  const totalCount = data.length
  const occupiedCount = data.filter((d) => d.onHandQty > 0).length

  return (
    <div className="space-y-4">
      {/* Search & Zone Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code, aisle, SKU..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 bg-background h-9 text-xs"
            />
          </div>

          <div className="inline-flex items-center rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setZoneFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                zoneFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Zones ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setZoneFilter("A")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                zoneFilter === "A"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SunMedium className="h-3 w-3 text-amber-500" />
              <span>Zone A</span>
            </button>
            <button
              type="button"
              onClick={() => setZoneFilter("F")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                zoneFilter === "F"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ThermometerSnowflake className="h-3 w-3 text-cyan-500" />
              <span>Zone F</span>
            </button>
          </div>
        </div>

        {/* Quick Occupancy Stat & Structure Settings Button */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="px-2.5 py-1 rounded bg-muted/60 border text-muted-foreground font-mono">
            Occupied: <strong className="text-foreground">{occupiedCount}</strong> / {totalCount}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStructureModalOpen(true)}
            className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Configure Structure</span>
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold">
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
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    <p className="font-medium text-sm text-foreground">No locations found</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search or zone filter.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1">
        <div>
          Showing page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount() || 1} ({table.getFilteredRowModel().rows.length} total filtered locations)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 text-xs"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 text-xs"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Warehouse Structure Configuration Modal */}
      <WarehouseStructureModal
        open={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}
