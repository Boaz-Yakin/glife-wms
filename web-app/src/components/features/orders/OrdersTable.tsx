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
  PENDING: "대기",
  ALLOCATED: "할당됨",
  PICKING: "피킹 중",
  PICKED: "피킹 완료",
  DISPATCHED: "출고 완료",
  CANCELED: "취소됨",
}

const columns: ColumnDef<OrderData>[] = [
  {
    accessorKey: "id",
    header: "주문 번호",
    cell: ({ row }) => <div className="font-medium tabular-nums">{row.original.id.slice(0, 8).toUpperCase()}</div>,
  },
  {
    accessorKey: "created_at",
    header: "주문 일시",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums">{date.toLocaleString('ko-KR')}</div>
    }
  },
  {
    accessorKey: "status",
    header: "주문 상태",
    cell: ({ row }) => {
      const status = row.original.status
      const variant = statusColors[status] || "secondary"
      const label = statusLabels[status] || status
      return <Badge variant={variant as any}>{label}</Badge>
    }
  },
  {
    accessorKey: "updated_at",
    header: "최근 변경",
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
          <Input placeholder="주문 번호 검색..." className="max-w-sm bg-background" />
          <Select defaultValue="ALL">
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="주문 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 상태</SelectItem>
              <SelectItem value="PENDING">대기</SelectItem>
              <SelectItem value="ALLOCATED">할당됨</SelectItem>
              <SelectItem value="PICKING">피킹 중</SelectItem>
              <SelectItem value="PICKED">피킹 완료</SelectItem>
              <SelectItem value="DISPATCHED">출고 완료</SelectItem>
              <SelectItem value="CANCELED">취소됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="shrink-0 bg-background" onClick={() => exportToExcel(data, "Orders_Report")}>
          <Download className="mr-2 size-4" />
          엑셀 다운로드
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
                  주문 내역이 없습니다.
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
