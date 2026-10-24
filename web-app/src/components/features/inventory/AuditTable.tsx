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
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/export"

export type AuditData = {
  id: string
  previous_qty: number
  new_qty: number
  reason: string | null
  created_at: string
  adjusted_by: string
  inventory: {
    item: { sku: string; name_en: string; desc_en?: string | null } | any
    location: { code: string } | any
  } | any
}

const reasonLabels: Record<string, string> = {
  COUNT_MISMATCH: "Count Mismatch",
  DAMAGED: "Damaged",
  LOST: "Lost",
  FOUND: "Found",
  EXPIRED: "Expired"
}

const columns: ColumnDef<AuditData>[] = [
  {
    accessorKey: "created_at",
    header: "Date/Time",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums">{date.toLocaleString('ko-KR')}</div>
    }
  },
  {
    accessorKey: "inventory.location.code",
    header: "Location",
    cell: ({ row }) => <div className="font-medium">{row.original.inventory?.location?.code || 'N/A'}</div>,
  },
  {
    accessorKey: "inventory.item.name_en",
    header: "Item Name",
    cell: ({ row }) => {
      const name = row.original.inventory?.item?.name_en || 'N/A'
      const desc = row.original.inventory?.item?.desc_en?.trim()
      const fullText = desc ? `${name} (${desc})` : name
      return (
        <div title={fullText}>
          <span className="font-medium">{name}</span>
          {desc ? (
            <span className="text-muted-foreground ml-1 font-normal">({desc})</span>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      const reason = row.original.reason
      return <Badge variant={reason ? "outline" : "secondary"}>{reason ? reasonLabels[reason] || reason : "Manual Adjustment"}</Badge>
    }
  },
  {
    accessorKey: "previous_qty",
    header: () => <div className="text-right">Before Qty</div>,
    cell: ({ row }) => <div className="text-right tabular-nums text-muted-foreground">{row.original.previous_qty}</div>,
  },
  {
    accessorKey: "new_qty",
    header: () => <div className="text-right">After Qty</div>,
    cell: ({ row }) => <div className="text-right tabular-nums font-medium">{row.original.new_qty}</div>,
  },
  {
    id: "diff",
    header: () => <div className="text-right">Diff</div>,
    cell: ({ row }) => {
      const diff = row.original.new_qty - row.original.previous_qty
      const isPositive = diff > 0
      return (
        <div className={`text-right tabular-nums font-bold ${isPositive ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
          {diff > 0 ? '+' : ''}{diff}
        </div>
      )
    },
  },
]

interface AuditTableProps {
  data: AuditData[]
  totalCount: number
}

export function AuditTable({ data, totalCount }: AuditTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const defaultReason = searchParams.get("reason") || "ALL"

  const handleReasonChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== "ALL") {
      params.set("reason", val)
    } else {
      params.delete("reason")
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleExport = () => {
    const flattened = data.map((d) => ({
      "Date/Time": d.created_at ? new Date(d.created_at).toLocaleString('ko-KR') : '',
      Location: d.inventory?.location?.code || 'N/A',
      SKU: d.inventory?.item?.sku || 'N/A',
      "Item Name": d.inventory?.item?.desc_en ? `${d.inventory?.item?.name_en} (${d.inventory?.item?.desc_en})` : (d.inventory?.item?.name_en || 'N/A'),
      Reason: d.reason ? reasonLabels[d.reason] || d.reason : "Manual Adjustment",
      "Before Qty": d.previous_qty,
      "After Qty": d.new_qty,
      Diff: d.new_qty - d.previous_qty,
    }))
    exportToExcel(flattened, "Audit_Report")
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Select defaultValue={defaultReason} onValueChange={handleReasonChange}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Reasons</SelectItem>
              <SelectItem value="COUNT_MISMATCH">Count Mismatch</SelectItem>
              <SelectItem value="DAMAGED">Damaged</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="shrink-0 bg-background" onClick={handleExport}>
          <Download className="mr-2 size-4" />
          Download Audit
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No audit history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
