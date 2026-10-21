"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Eye, Download, Trash2, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { exportToExcel } from "@/lib/export"
import { OrderData } from "@/services/orders.service"
import { deleteOrderAction } from "@/app/(dashboard)/orders/actions"
import { OrderDetailsDialog } from "./OrderDetailsDialog"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  PICKING: "default",
  PACKED: "outline",
  INVOICED: "default",
  SHIPPED: "secondary",
  CANCELED: "destructive",
  // Legacy compatibility
  RECEIVED: "secondary",
  ALLOCATED: "outline",
  PICKED: "outline",
  DISPATCHED: "secondary",
}

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PICKING: "Picking",
  PACKED: "Packed",
  INVOICED: "Invoiced",
  SHIPPED: "Shipped",
  CANCELED: "Canceled",
  // Legacy compatibility
  RECEIVED: "Received",
  ALLOCATED: "Allocated",
  PICKED: "Picked",
  DISPATCHED: "Dispatched",
}

export interface ClientOption {
  id: string
  name: string
  code: string
}

interface OrdersTableProps {
  data: OrderData[]
  totalCount: number
  currentPage?: number
  pageSize?: number
  clients?: ClientOption[]
}

export function OrdersTable({ 
  data, 
  totalCount,
  currentPage = 1,
  pageSize = 50,
  clients = [],
}: OrdersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const defaultSearch = searchParams.get("search") || ""
  const defaultStatus = searchParams.get("status") || "ALL"
  
  const [searchTerm, setSearchTerm] = React.useState(defaultSearch)
  const [selectedOrder, setSelectedOrder] = React.useState<OrderData | null>(null)
  const [orderToDelete, setOrderToDelete] = React.useState<OrderData | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

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

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return
    setIsDeleting(true)
    try {
      const res = await deleteOrderAction(orderToDelete.id)
      if (res.success) {
        toast.success(`Order ${orderToDelete.order_no || orderToDelete.id} has been deleted.`)
        setOrderToDelete(null)
        if (selectedOrder?.id === orderToDelete.id) {
          setSelectedOrder(null)
        }
      } else {
        toast.error(res.error || "Failed to delete order.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error occurred"
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
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
      accessorKey: "order_no",
      header: "Order No.",
      cell: ({ row }) => (
        <div className="font-semibold tabular-nums text-primary font-mono text-xs">
          {row.original.order_no || row.original.id}
        </div>
      ),
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice No.",
      cell: ({ row }) => {
        const primary = row.original.invoice_number
        const catInvoices = row.original.category_invoices as Record<string, string> | null | undefined
        const entries = Object.entries(catInvoices || {}).filter(([_, num]) => Boolean(num))

        if (!primary && entries.length === 0) {
          return <div className="tabular-nums text-muted-foreground">-</div>
        }

        const extraCount = entries.length > 1 ? entries.length - 1 : 0

        if (entries.length <= 1) {
          return (
            <div className="font-mono tabular-nums text-xs text-foreground font-medium">
              {primary || entries[0]?.[1] || '-'}
            </div>
          )
        }

        return (
          <TooltipProvider delay={100}>
            <Tooltip>
              <TooltipTrigger className="inline-flex items-center gap-1.5 cursor-help bg-transparent border-0 p-0 text-inherit text-left">
                <span className="font-mono tabular-nums text-xs text-foreground font-semibold">
                  {primary || entries[0][1]}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 h-4 font-mono font-semibold bg-muted/60 text-muted-foreground hover:bg-muted"
                >
                  +{extraCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="p-2 space-y-1.5 text-xs bg-popover text-popover-foreground border shadow-md"
              >
                <p className="font-semibold text-[11px] text-muted-foreground border-b pb-1">
                  Invoices by Category ({entries.length})
                </p>
                <div className="space-y-1 font-mono">
                  {entries.map(([cat, num]) => (
                    <div key={cat} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground font-sans font-medium text-[11px] uppercase tracking-wide">
                        {cat}:
                      </span>
                      <span className="font-semibold text-foreground">{num}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      id: "store_name",
      header: "Store",
      cell: ({ row }) => <div className="font-medium text-sm">{row.original.store?.name || '-'}</div>,
    },
    {
      id: "client_name",
      header: "Client",
      cell: ({ row }) => {
        const client = row.original.client
        if (!client?.name) return <span className="text-muted-foreground text-xs">-</span>
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">{client.name}</span>
            {client.code && (
              <span className="text-[10px] text-muted-foreground font-mono">{client.code}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Order Date",
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return (
          <div className="tabular-nums text-xs text-muted-foreground">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )
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
      header: () => <div className="text-right font-medium">Total Amount</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-semibold text-foreground">
          ${Number(row.original.invoice_amount || 0).toFixed(2)}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(row.original)}>
            <Eye className="size-4 mr-1.5" />
            Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5"
            onClick={() => setOrderToDelete(row.original)}
            title="Delete Order"
          >
            <Trash2 className="size-4 text-destructive/80 hover:text-destructive" />
          </Button>
        </div>
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
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PICKING">Picking</SelectItem>
              <SelectItem value="PACKED">Packed</SelectItem>
              <SelectItem value="INVOICED">Invoiced</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
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
      
      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="font-semibold text-foreground">{startItem}</strong> to{" "}
            <strong className="font-semibold text-foreground">{endItem}</strong> of{" "}
            <strong className="font-semibold text-foreground">{totalCount}</strong> orders
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
      
      {selectedOrder && (
        <OrderDetailsDialog 
          order={selectedOrder} 
          open={!!selectedOrder} 
          onOpenChange={(val) => !val && setSelectedOrder(null)} 
          clients={clients}
        />
      )}

      {/* Delete Order Confirmation Dialog */}
      <Dialog 
        open={!!orderToDelete} 
        onOpenChange={(open) => !open && !isDeleting && setOrderToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete Order
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Are you sure you want to delete order{" "}
              <span className="font-semibold text-foreground font-mono">
                {orderToDelete?.order_no || orderToDelete?.id}
              </span>
              {orderToDelete?.store?.name && (
                <>
                  {" "}for <span className="font-semibold text-foreground">{orderToDelete.store.name}</span>
                </>
              )}
              ?
              <br />
              <span className="text-destructive font-medium block mt-2 text-xs">
                Warning: All line items and records associated with this order will be permanently deleted. This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setOrderToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
