"use client"

import * as React from "react"
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
    item: { sku: string; name: string } | any
    location: { barcode: string } | any
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
    accessorKey: "inventory.location.barcode",
    header: "Location",
    cell: ({ row }) => <div className="font-medium">{row.original.inventory?.location?.barcode || 'N/A'}</div>,
  },
  {
    accessorKey: "inventory.item.name",
    header: "Item Name",
    cell: ({ row }) => <div className="truncate max-w-[150px]">{row.original.inventory?.item?.name || 'N/A'}</div>,
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
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Select defaultValue="ALL">
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
        <Button variant="outline" className="shrink-0 bg-background" onClick={() => exportToExcel(data, "Audit_Report")}>
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
