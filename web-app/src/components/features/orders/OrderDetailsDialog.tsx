"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  Store, 
  Calendar, 
  Receipt, 
  DollarSign, 
  Package, 
  Trash2, 
  Plus, 
  Search, 
  Check, 
  X, 
  AlertCircle,
  Save
} from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { OrderData, OrderItemData, getOrderDetails } from "@/services/orders.service"
import { getOrderItemEffectivePrice } from "@/lib/pricing"
import { updateOrderAction, searchMasterItemsAction } from "@/app/(dashboard)/orders/actions"

interface OrderDetailsDialogProps {
  order: OrderData
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EditableItem {
  id: string
  isNew?: boolean
  item_id: string | null
  custom_item_name?: string | null
  sku: string
  name_en: string
  desc_en?: string | null
  uom: string
  price: number
  qty: number
  unit_price: number
  box_price: number
  pack_price: number
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

const COMMON_UOMS = ["EA", "BOX", "PACK", "CASE", "BAG", "CAN", "BTL"]

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Order Header Form State
  const [orderDateInput, setOrderDateInput] = React.useState("")
  
  // Items State
  const [items, setItems] = React.useState<EditableItem[]>([])
  const [originalItems, setOriginalItems] = React.useState<EditableItem[]>([])
  const [deletedItemIds, setDeletedItemIds] = React.useState<string[]>([])

  // Search & Add Item State
  const [showAddSearch, setShowAddSearch] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Format order date to YYYY-MM-DDTHH:mm for datetime-local input
  const formatForDateTimeInput = (dateStr?: string | null) => {
    if (!dateStr) return ""
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ""
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return ""
    }
  }

  // Load details on open
  React.useEffect(() => {
    if (open && order.id) {
      setErrorMsg(null)
      setSuccessMsg(null)
      setDeletedItemIds([])
      setShowAddSearch(false)
      setSearchQuery("")
      setSearchResults([])

      const initialDate = order.order_date || order.created_at || ""
      setOrderDateInput(formatForDateTimeInput(initialDate))

      const loadDetails = async () => {
        setLoading(true)
        const { data } = await getOrderDetails(order.id)
        const mapped: EditableItem[] = ((data as any[]) || []).map((row) => {
          const effectivePrice = Number(row.price || getOrderItemEffectivePrice(row))
          return {
            id: row.id,
            isNew: false,
            item_id: row.item_id || null,
            custom_item_name: row.custom_item_name || null,
            sku: row.item?.sku || row.item_id || "N/A",
            name_en: row.custom_item_name || row.item?.name_en || "Unknown Item",
            desc_en: row.item?.desc_en || null,
            uom: (row.uom || row.item?.uom || "EA").toUpperCase(),
            price: effectivePrice,
            qty: Number(row.qty || 1),
            unit_price: Number(row.item?.unit_price || 0),
            box_price: Number(row.item?.box_price || 0),
            pack_price: Number(row.item?.pack_price || 0),
          }
        })
        setItems(mapped)
        setOriginalItems(JSON.parse(JSON.stringify(mapped)))
        setLoading(false)
      }
      loadDetails()
    }
  }, [open, order.id, order.order_date, order.created_at])

  // Debounced Item Search
  React.useEffect(() => {
    if (!showAddSearch || !searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchMasterItemsAction(searchQuery)
      setSearchResults(results)
      setIsSearching(false)
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, showAddSearch])

  // Handle UOM Change and suggest default price
  const handleUomChange = (idx: number, newUom: string) => {
    setItems((prev) => {
      const copy = [...prev]
      const cur = copy[idx]
      cur.uom = newUom.toUpperCase()

      // Suggest master price based on selected UOM if available
      if (cur.uom === "BOX" && cur.box_price > 0) {
        cur.price = cur.box_price
      } else if (cur.uom === "PACK" && cur.pack_price > 0) {
        cur.price = cur.pack_price
      } else if (cur.unit_price > 0) {
        cur.price = cur.unit_price
      }
      return copy
    })
  }

  // Handle Price Change
  const handlePriceChange = (idx: number, val: string) => {
    const num = parseFloat(val) || 0
    setItems((prev) => {
      const copy = [...prev]
      copy[idx].price = num
      return copy
    })
  }

  // Handle Qty Change
  const handleQtyChange = (idx: number, val: string) => {
    const num = parseInt(val, 10) || 0
    setItems((prev) => {
      const copy = [...prev]
      copy[idx].qty = Math.max(1, num)
      return copy
    })
  }

  // Handle Delete Item
  const handleDeleteItem = (idx: number) => {
    const target = items[idx]
    if (!target.isNew) {
      setDeletedItemIds((prev) => [...prev, target.id])
    }
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // Handle Add Master Item to Order
  const handleSelectMasterItem = (master: any) => {
    const defaultUom = (master.uom || "EA").toUpperCase()
    let defaultPrice = master.unit_price || master.box_price || master.pack_price || 0
    if (defaultUom === "BOX" && master.box_price > 0) defaultPrice = master.box_price
    if (defaultUom === "PACK" && master.pack_price > 0) defaultPrice = master.pack_price

    const newItem: EditableItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isNew: true,
      item_id: master.id,
      custom_item_name: master.name_en,
      sku: master.sku,
      name_en: master.name_en,
      desc_en: master.desc_en,
      uom: defaultUom,
      price: defaultPrice,
      qty: 1,
      unit_price: master.unit_price || 0,
      box_price: master.box_price || 0,
      pack_price: master.pack_price || 0,
    }

    setItems((prev) => [...prev, newItem])
    setSearchQuery("")
    setSearchResults([])
    setShowAddSearch(false)
  }

  // Calculation
  const totalCalculated = items.reduce(
    (acc, cur) => acc + (Number(cur.qty || 0) * Number(cur.price || 0)),
    0
  )
  const totalUnits = items.reduce((acc, cur) => acc + Number(cur.qty || 0), 0)

  // Check if form is dirty
  const isDirty = React.useMemo(() => {
    const originalDateFormatted = formatForDateTimeInput(order.order_date || order.created_at)
    if (orderDateInput !== originalDateFormatted) return true
    if (deletedItemIds.length > 0) return true
    if (items.some((it) => it.isNew)) return true
    if (items.length !== originalItems.length) return true

    for (const item of items) {
      const orig = originalItems.find((o) => o.id === item.id)
      if (!orig) return true
      if (item.qty !== orig.qty || item.uom !== orig.uom || item.price !== orig.price) {
        return true
      }
    }
    return false
  }, [orderDateInput, deletedItemIds, items, originalItems, order.order_date, order.created_at])

  // Save changes
  const handleSaveChanges = async () => {
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const itemsToUpdate = items
        .filter((it) => !it.isNew)
        .map((it) => ({
          id: it.id,
          qty: it.qty,
          uom: it.uom,
          price: it.price,
        }))

      const itemsToAdd = items
        .filter((it) => it.isNew)
        .map((it) => ({
          item_id: it.item_id,
          custom_item_name: it.custom_item_name || it.name_en,
          qty: it.qty,
          uom: it.uom,
          price: it.price,
        }))

      // ISO conversion for orderDate if changed
      let formattedOrderDate: string | undefined = undefined
      if (orderDateInput) {
        const d = new Date(orderDateInput)
        if (!isNaN(d.getTime())) {
          formattedOrderDate = d.toISOString()
        }
      }

      const result = await updateOrderAction({
        orderId: order.id,
        orderDate: formattedOrderDate,
        itemsToUpdate,
        itemsToAdd,
        itemIdsToDelete: deletedItemIds,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to update order")
      }

      setSuccessMsg("Order details and line items updated successfully.")
      router.refresh()
      
      // Close dialog after short delay to show success
      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving changes.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full p-6 gap-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Order Details & Item Management
            </DialogTitle>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-muted font-semibold text-foreground">
              {order.order_no || order.id}
            </span>
            <Badge variant={statusBadgeVariants[order.status] || "secondary"} className="ml-auto">
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Edit order date, adjust item quantities and UOM, or add/remove products in real-time.
          </p>
        </DialogHeader>

        {/* Notifications */}
        {errorMsg && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="rounded-md bg-green-500/15 p-3 text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Summary Info Cards (Editable Header) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
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

          {/* Editable Order Date */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
              <Calendar className="size-3.5" />
              <span>Order Date (Editable)</span>
            </div>
            <Input
              type="datetime-local"
              value={orderDateInput}
              onChange={(e) => setOrderDateInput(e.target.value)}
              className="h-7 text-xs bg-background font-mono px-2 py-0 border-primary/30 focus-visible:ring-primary"
            />
          </div>

          <div className="rounded-lg border bg-primary/10 border-primary/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
              <DollarSign className="size-3.5" />
              <span>Total Amount</span>
            </div>
            <p className="text-base font-extrabold text-primary tabular-nums">
              ${totalCalculated.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Ordered Line Items Section */}
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold px-1 shrink-0">
            <span className="flex items-center gap-1.5 text-foreground">
              <Package className="size-4 text-primary" />
              Ordered Items ({items.length} SKU{items.length !== 1 ? "s" : ""})
            </span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">Total Units: {totalUnits}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs border-dashed border-primary/50 text-primary hover:bg-primary/5"
                onClick={() => setShowAddSearch(!showAddSearch)}
              >
                {showAddSearch ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                {showAddSearch ? "Cancel" : "Add Item"}
              </Button>
            </div>
          </div>

          {/* Add Item Search Box Dropdown */}
          {showAddSearch && (
            <div className="p-3 border rounded-lg bg-muted/40 space-y-2 shrink-0 animate-in fade-in duration-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search master item by SKU or product name to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-md bg-background max-h-48 overflow-y-auto divide-y shadow-md">
                  {searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => handleSelectMasterItem(res)}
                      className="p-2.5 hover:bg-accent/50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{res.name_en}</span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {res.sku}
                          </span>
                        </div>
                        {res.desc_en && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{res.desc_en}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-primary tabular-nums">
                          ${(res.unit_price || res.box_price || 0).toFixed(2)}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">UOM: {res.uom}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No matching master items found.
                </p>
              )}
            </div>
          )}

          {/* Table Container */}
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-lg border bg-background">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border bg-background overflow-hidden flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[6%] text-xs font-semibold text-center">#</TableHead>
                    <TableHead className="w-[36%] text-xs font-semibold">Item Name / Description</TableHead>
                    <TableHead className="w-[14%] text-xs font-semibold text-center">UOM</TableHead>
                    <TableHead className="w-[16%] text-xs font-semibold text-right">Unit Price ($)</TableHead>
                    <TableHead className="w-[12%] text-xs font-semibold text-right">Qty</TableHead>
                    <TableHead className="w-[12%] text-xs font-semibold text-right">Subtotal</TableHead>
                    <TableHead className="w-[4%] text-xs font-semibold text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const subtotal = Number(item.qty || 0) * Number(item.price || 0)
                      return (
                        <TableRow 
                          key={item.id} 
                          className={`hover:bg-muted/30 transition-colors ${item.isNew ? 'bg-primary/5' : ''}`}
                        >
                          <TableCell className="text-xs text-muted-foreground font-mono text-center">
                            {idx + 1}
                          </TableCell>
                          
                          {/* Item Name / SKU */}
                          <TableCell>
                            <div className="font-semibold text-xs text-foreground leading-tight">
                              {item.name_en}
                              {item.isNew && (
                                <Badge variant="default" className="ml-1.5 text-[9px] px-1 py-0 h-4 bg-emerald-600">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              SKU: {item.sku}
                            </div>
                          </TableCell>

                          {/* Editable UOM Select */}
                          <TableCell className="text-center">
                            <select
                              value={item.uom}
                              onChange={(e) => handleUomChange(idx, e.target.value)}
                              className="h-8 w-20 text-xs font-mono font-bold bg-background border border-input rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-center cursor-pointer shadow-sm"
                            >
                              {Array.from(new Set([item.uom, ...COMMON_UOMS])).map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </TableCell>

                          {/* Editable Unit Price */}
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              className="h-8 w-24 ml-auto text-right font-mono text-xs tabular-nums bg-background"
                            />
                          </TableCell>

                          {/* Editable Qty */}
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              className="h-8 w-16 ml-auto text-right font-mono font-bold text-xs tabular-nums bg-background"
                            />
                          </TableCell>

                          {/* Subtotal */}
                          <TableCell className="text-right tabular-nums text-xs font-bold text-primary">
                            ${subtotal.toFixed(2)}
                          </TableCell>

                          {/* Delete Action */}
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(idx)}
                              title="Delete Item"
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm">
                        No line items found. Use "Add Item" button above to add products.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex sm:justify-between items-center pt-3 border-t shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Total {items.length} item(s)</span>
            <span>•</span>
            <span className="font-semibold text-foreground">{totalUnits} units</span>
            <span>•</span>
            <span className="font-bold text-primary text-sm">${totalCalculated.toFixed(2)}</span>
            {isDirty && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                Unsaved changes
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              disabled={isSaving || !isDirty}
              onClick={handleSaveChanges}
              className="gap-1.5 bg-primary font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
