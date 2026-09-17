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
          <DialogTitle>Order Details: {order.id}</DialogTitle>
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
                  <TableHead>Item / SKU</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Picked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Picker</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.item?.name_en}</div>
                        <div className="text-xs text-muted-foreground">{item.item?.sku}</div>
                      </TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{item.qty}</TableCell>
                      <TableCell className="text-right tabular-nums text-primary">{item.picked_qty}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[item.status] || "secondary"}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.picker?.email || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
