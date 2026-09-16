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
import { Input } from "@/components/ui/input"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/export"

export type OrderData = {
  id: string
  status: string
  created_at: string
  updated_at: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ALLOCATED: "outline",
  PICKING: "default",
  PICKED: "default",
  DISPATCHED: "default",
  CANCELED: "destructive",
}

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  ALLOCATED: "Allocated",
  PICKING: "Picking",
  PICKED: "Picked",
  DISPATCHED: "Dispatched",
  CANCELED: "Canceled",
}

const columns: ColumnDef<OrderData>[] = [
  {
    accessorKey: "id",
    header: "Order No.",
    cell: ({ row }) => <div className="font-medium tabular-nums">{row.original.id.slice(0, 8).toUpperCase()}</div>,
  },
  {
    accessorKey: "created_at",
    header: "Order Date",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums">{date.toLocaleString('ko-KR')}</div>
    }
  },
  {
    accessorKey: "status",
    header: "Order Status",
    cell: ({ row }) => {
      const status = row.original.status
      const variant = statusColors[status] || "secondary"
      const label = statusLabels[status] || status
      return <Badge variant={variant as any}>{label}</Badge>
    }
  },
  {
    accessorKey: "updated_at",
    header: "Last Changed",
    cell: ({ row }) => {
      const date = new Date(row.original.updated_at)
      return <div className="text-muted-foreground tabular-nums">{date.toLocaleString('ko-KR')}</div>
    }
  },
]

interface OrdersTableProps {
  data: OrderData[]
  totalCount: number
}

export function OrdersTable({ data, totalCount }: OrdersTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input placeholder="Search Order No..." className="max-w-sm bg-background" />
          <Select defaultValue="ALL">
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ALLOCATED">Allocated</SelectItem>
              <SelectItem value="PICKING">Picking</SelectItem>
              <SelectItem value="PICKED">Picked</SelectItem>
              <SelectItem value="DISPATCHED">Dispatched</SelectItem>
              <SelectItem value="CANCELED">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="shrink-0 bg-background" onClick={() => exportToExcel(data, "Orders_Report")}>
          <Download className="mr-2 size-4" />
          Download Excel
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
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Total {totalCount} orders
      </div>
    </div>
  )
}
