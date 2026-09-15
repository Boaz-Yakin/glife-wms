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
  updated_at: string
  item: { sku: string; name: string } | any
  location: { barcode: string; zone_type: string } | any
}

const columns: ColumnDef<InventoryData>[] = [
  {
    accessorKey: "location.barcode",
    header: "로케이션",
    cell: ({ row }) => <div className="font-medium tabular-nums">{row.original.location?.barcode || 'N/A'}</div>,
  },
  {
    accessorKey: "item.sku",
    header: "SKU",
    cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.item?.sku || 'N/A'}</div>,
  },
  {
    accessorKey: "item.name",
    header: "상품명",
    cell: ({ row }) => <div className="font-semibold truncate max-w-[200px]" title={row.original.item?.name}>{row.original.item?.name || 'N/A'}</div>,
  },
  {
    accessorKey: "on_hand_qty",
    header: () => <div className="text-right">실재고</div>,
    cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.on_hand_qty}</div>,
  },
  {
    accessorKey: "allocated_qty",
    header: () => <div className="text-right">할당재고</div>,
    cell: ({ row }) => <div className="text-right text-muted-foreground tabular-nums">{row.original.allocated_qty}</div>,
  },
  {
    id: "available_qty",
    header: () => <div className="text-right">가용재고</div>,
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
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Filters (Client Side placeholder for now) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input placeholder="상품명 또는 SKU 검색..." className="max-w-sm bg-background" />
          <Select defaultValue="ALL">
            <SelectTrigger className="w-[120px] bg-background">
              <SelectValue placeholder="구역(Zone)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 구역</SelectItem>
              <SelectItem value="A">A 구역</SelectItem>
              <SelectItem value="F">F 구역</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="shrink-0 bg-background" onClick={() => exportToExcel(data, "Inventory_Report")}>
          <Download className="mr-2 size-4" />
          엑셀 다운로드
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
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        총 {totalCount} 건의 데이터
      </div>
    </div>
  )
}
