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
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/export"

// Types matching the service response
export type InventoryData = {
  id: string
  on_hand_qty: number
  allocated_qty: number
  expiration_date?: string | null
  lot_no?: string | null
  updated_at: string
  created_at?: string
  item: { sku: string; name_en: string; desc_en?: string | null; shelf_life_days?: number | null } | any
  location: { code: string; zone_type: string } | any
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

const columns: ColumnDef<InventoryData>[] = [
  {
    accessorKey: "location.code",
    header: "Location",
    cell: ({ row }) => <div className="font-medium tabular-nums">{row.original.location?.code || 'N/A'}</div>,
  },
  {
    accessorKey: "item.sku",
    header: "SKU",
    cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.item?.sku || 'N/A'}</div>,
  },
  {
    accessorKey: "item.name_en",
    header: "Item Name",
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
    header: "Exp. Date / D-Day",
    cell: ({ row }) => getExpirationBadge(row.original.expiration_date),
  },
  {
    accessorKey: "lot_no",
    header: "Lot No.",
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground tabular-nums">
        {row.original.lot_no || 'N/A'}
      </div>
    ),
  },
  {
    accessorKey: "on_hand_qty",
    header: () => <div className="text-right">On Hand</div>,
    cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.on_hand_qty}</div>,
  },
  {
    accessorKey: "allocated_qty",
    header: () => <div className="text-right">Allocated</div>,
    cell: ({ row }) => <div className="text-right text-muted-foreground tabular-nums">{row.original.allocated_qty}</div>,
  },
  {
    id: "available_qty",
    header: () => <div className="text-right">Available</div>,
    cell: ({ row }) => {
      const available = row.original.on_hand_qty - row.original.allocated_qty
      return (
        <div className="text-right tabular-nums">
          <Badge variant={available <= 0 ? "destructive" : "secondary"}>
            {available}
          </Badge>
        </div>
      )
    },
  },
]

interface InventoryTableProps {
  data: InventoryData[]
  totalCount: number
}

export function InventoryTable({ data, totalCount }: InventoryTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const defaultSearch = searchParams.get("search") || ""
  const defaultZone = searchParams.get("zone") || "ALL"

  const [searchTerm, setSearchTerm] = React.useState(defaultSearch)

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
    const flattened = data.map((d) => ({
      Location: d.location?.code || 'N/A',
      Zone: d.location?.zone_type || 'N/A',
      SKU: d.item?.sku || 'N/A',
      "Item Name": d.item?.desc_en ? `${d.item?.name_en} (${d.item?.desc_en})` : (d.item?.name_en || 'N/A'),
      "Exp. Date": d.expiration_date || 'N/A',
      "Lot No": d.lot_no || 'N/A',
      "On Hand": d.on_hand_qty,
      Allocated: d.allocated_qty,
      Available: d.on_hand_qty - d.allocated_qty,
      "Updated At": d.updated_at ? new Date(d.updated_at).toLocaleString() : '',
    }))
    exportToExcel(flattened, "Inventory_Report")
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input 
            placeholder="Search Item Name, SKU, or Description..." 
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
        <Button variant="outline" className="shrink-0 bg-background" onClick={handleExport}>
          <Download className="mr-2 size-4" />
          Download Excel
        </Button>
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
      
      <div className="text-sm text-muted-foreground">
        Total {totalCount} records
      </div>
    </div>
  )
}

