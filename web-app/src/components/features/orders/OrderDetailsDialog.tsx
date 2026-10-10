"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { OrderData, OrderItemData, getOrderDetails } from "@/services/orders.service"

interface OrderDetailsDialogProps {
  order: OrderData
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  PICKED: "default",
  SKIPPED: "destructive",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details: {order.order_no || order.id}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <p className="text-muted-foreground">Invoice No.</p>
            <p className="font-medium">{order.invoice_number || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Store</p>
            <p className="font-medium">{order.store?.name || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Amount</p>
            <p className="font-medium">${order.invoice_amount?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium">{order.status}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name / SKU</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {item.item?.name_en || "Unknown Item"}
                          {item.item?.desc_en && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({item.item.desc_en})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          SKU: {item.item?.sku || item.item_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.uom}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${Number(item.price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {item.qty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-primary">
                        ${(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No line items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
