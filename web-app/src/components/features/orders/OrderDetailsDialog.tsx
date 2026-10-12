"use client"

import * as React from "react"
import { Loader2, Store, Calendar, Receipt, DollarSign, Package } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrderData, OrderItemData, getOrderDetails, getOrderItemEffectivePrice } from "@/services/orders.service"

interface OrderDetailsDialogProps {
  order: OrderData
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  RECEIVED: "secondary",
  ALLOCATED: "outline",
  PICKING: "default",
  PICKED: "default",
  DISPATCHED: "default",
  CANCELED: "destructive",
  PENDING: "secondary",
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const [items, setItems] = React.useState<OrderItemData[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (open && order.id) {
      const loadDetails = async () => {
        setLoading(true)
        const { data } = await getOrderDetails(order.id)
        setItems((data as any) || [])
        setLoading(false)
      }
      loadDetails()
    }
  }, [open, order.id])

  const totalCalculated = items.reduce(
    (acc, cur) => acc + (Number(cur.qty || 0) * getOrderItemEffectivePrice(cur)),
    0
  )
  const totalUnits = items.reduce((acc, cur) => acc + Number(cur.qty || 0), 0)
  const displayAmount = items.length > 0 ? totalCalculated : (order.invoice_amount || 0)

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full p-6 gap-6">
        {/* Header */}
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Order Details
            </DialogTitle>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-muted font-semibold text-foreground">
              {order.order_no || order.id}
            </span>
            <Badge variant={statusBadgeVariants[order.status] || "secondary"} className="ml-auto">
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            View detailed line items and pricing for this dispatch order.
          </p>
        </DialogHeader>

        {/* Order Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Store className="size-3.5" />
              <span>Store</span>
            </div>
            <p className="font-semibold text-sm truncate" title={order.store?.name || "-"}>
              {order.store?.name || "-"}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Receipt className="size-3.5" />
              <span>Invoice No.</span>
            </div>
            <p className="font-mono font-medium text-sm text-foreground">
              {order.invoice_number || "-"}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="size-3.5" />
              <span>Order Date</span>
            </div>
            <p className="text-xs font-medium text-foreground">
              {formattedDate}
            </p>
          </div>

          <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
              <DollarSign className="size-3.5" />
              <span>Total Amount</span>
            </div>
            <p className="text-base font-bold text-primary tabular-nums">
              ${Number(displayAmount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Package className="size-3.5" />
              Ordered Items ({items.length} SKU{items.length !== 1 ? "s" : ""})
            </span>
            <span>Total Units: {totalUnits}</span>
          </div>

          {loading ? (
            <div className="flex h-36 items-center justify-center rounded-lg border bg-background">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border bg-background overflow-hidden max-h-[45vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[10%] text-xs font-semibold">#</TableHead>
                    <TableHead className="w-[45%] text-xs font-semibold">Item Name / Description</TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold text-center">UOM</TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold text-right">Unit Price</TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold text-right">Qty</TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const effectivePrice = getOrderItemEffectivePrice(item)
                      const subtotal = Number(item.qty || 0) * effectivePrice
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-sm text-foreground leading-tight">
                              {item.item?.name_en || "Unknown Item"}
                              {item.item?.desc_en && (
                                <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                                  ({item.item.desc_en})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              SKU: {item.item?.sku || item.item_id}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs font-mono font-medium">
                              {item.uom}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-medium text-muted-foreground">
                            ${effectivePrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-bold text-foreground">
                            {item.qty}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-bold text-primary">
                            ${subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-sm">
                        No line items found for this order.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex sm:justify-between items-center pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Total {items.length} line item(s) • {totalUnits} unit(s)
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
