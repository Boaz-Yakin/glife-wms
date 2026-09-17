"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Eye } from "lucide-react"

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
import { OrderData } from "@/services/orders.service"
import { OrderDetailsDialog } from "./OrderDetailsDialog"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  RECEIVED: "secondary",
  ALLOCATED: "outline",
  PICKING: "default",
  PICKED: "default",
  DISPATCHED: "default",
  CANCELED: "destructive",
}

const statusLabels: Record<string, string> = {
  RECEIVED: "Received",
  ALLOCATED: "Allocated",
  PICKING: "Picking",
  PICKED: "Picked",
  DISPATCHED: "Dispatched",
  CANCELED: "Canceled",
}

interface OrdersTableProps {
  data: OrderData[]
  totalCount: number
}

export function OrdersTable({ data, totalCount }: OrdersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const defaultSearch = searchParams.get("search") || ""
  const defaultStatus = searchParams.get("status") || "ALL"
  
  const [searchTerm, setSearchTerm] = React.useState(defaultSearch)
  const [selectedOrder, setSelectedOrder] = React.useState<OrderData | null>(null)

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

  const handleStatusChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== 'ALL') {
      params.set("status", val)
    } else {
      params.delete("status")
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const columns: ColumnDef<OrderData>[] = [
    {
      accessorKey: "id",
      header: "Order No.",
      cell: ({ row }) => <div className="font-medium tabular-nums">{row.original.id}</div>,
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice No.",
      cell: ({ row }) => <div className="tabular-nums text-muted-foreground">{row.original.invoice_number || '-'}</div>,
    },
    {
      id: "store_name",
      header: "Store",
      cell: ({ row }) => <div>{row.original.store?.name || '-'}</div>,
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
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        const variant = statusColors[status] || "secondary"
        const label = statusLabels[status] || status
        return <Badge variant={variant as any}>{label}</Badge>
      }
    },
    {
      accessorKey: "invoice_amount",
      header: () => <div className="text-right">Total Amount</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${row.original.invoice_amount?.toFixed(2)}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(row.original)}>
          <Eye className="size-4 mr-2" />
          Details
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input 
            placeholder="Search Order No or Invoice..." 
            className="max-w-sm bg-background" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={defaultStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
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
      
      {selectedOrder && (
        <OrderDetailsDialog 
          order={selectedOrder} 
          open={!!selectedOrder} 
          onOpenChange={(val) => !val && setSelectedOrder(null)} 
        />
      )}
    </div>
  )
}
