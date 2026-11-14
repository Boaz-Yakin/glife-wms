"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  Store, 
  Building2,
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
  Save,
  Pencil,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Ban
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrderData, OrderItemData, getOrderDetails, parseCancelledCategories } from "@/services/orders.service"
import { getOrderItemEffectivePrice } from "@/lib/pricing"
import { 
  updateOrderAction, 
  searchMasterItemsAction, 
  deleteOrderAction,
  cancelOrderCategoryAction,
  uncancelOrderCategoryAction 
} from "@/app/(dashboard)/orders/actions"
import { toAtlantaDateString, validateInvoiceDate } from "@/lib/date"
import { toast } from "sonner"
import { OrderStatusBadge } from "./OrderStatusBadge"

interface OrderDetailsDialogProps {
  order: OrderData
  open: boolean
  onOpenChange: (open: boolean) => void
  clients?: { id: string; name: string; code: string }[]
}

interface EditableItem {
  id: string
  isNew?: boolean
  item_id: string | null
  custom_item_name?: string | null
  sku: string
  name_en: string
  desc_en?: string | null
  category?: string | null
  uom: string
  price: number
  qty: number
  order_qty?: number
  picked_qty?: number | null
  unit_price: number
  box_price: number
  pack_price: number
  requested_uom?: string | null
}

const COMMON_UOMS = ["EA", "BOX", "PACK", "CASE", "BAG", "CAN", "BTL"]

const AVAILABLE_STATUSES = [
  "PENDING",
  "PICKING",
  "PACKED",
  "INVOICED",
  "SHIPPED",
  "CANCELED",
] as const

// 인보이스가 이미 발행된 것으로 간주되는 상태 (TRD 6.3)
const ISSUED_INVOICE_STATUSES = ["INVOICED", "SHIPPED"]

// DATE(YYYY-MM-DD) 문자열을 시간대 변환 없이 표시용으로 포맷
const formatDateOnlyForDisplay = (value: string) => {
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export interface ParsedReturnItem {
  itemName: string
  qty: number
  uom: string
  reason: string
  creditAmount: number
}

export function parseOrderReturns(rawNote?: string | null): {
  returns: ParsedReturnItem[]
  totalReturnQty: number
  totalCreditAmount: number
  rawReturnsText: string
  customerNote: string
} {
  if (!rawNote) {
    return { returns: [], totalReturnQty: 0, totalCreditAmount: 0, rawReturnsText: "", customerNote: "" }
  }

  let text = String(rawNote)
  text = text.replace(/\[\s*백오더(?:\s*발생)?[^\]]*\]/gi, "")
  text = text.replace(/\[\s*(?:알람|알림|경고|시스템|안내|NOTICE|ALERT|ALARM|SYSTEM|WARNING)[^\]]*\]/gi, "")

  const returnsMatch = text.match(/\[Returns:\s*([\s\S]*?)\]/i)
  let rawReturnsText = ""
  const returns: ParsedReturnItem[] = []

  if (returnsMatch) {
    rawReturnsText = returnsMatch[1].trim()
    text = text.replace(returnsMatch[0], "").trim()

    const itemRegex = /(?:^|,\s*)(.+?)\s+x(\d+)([A-Za-z]+)?\s*\(([^,)]+),\s*-\$?([0-9.]+)\)/g
    let m: RegExpExecArray | null
    while ((m = itemRegex.exec(rawReturnsText)) !== null) {
      returns.push({
        itemName: m[1].trim(),
        qty: parseInt(m[2], 10),
        uom: m[3] ? m[3].toUpperCase() : "EA",
        reason: m[4].trim(),
        creditAmount: parseFloat(m[5]),
      })
    }
  }

  const totalReturnQty = returns.reduce((sum, r) => sum + r.qty, 0)
  const totalCreditAmount = returns.reduce((sum, r) => sum + r.creditAmount, 0)

  return {
    returns,
    totalReturnQty,
    totalCreditAmount: Math.round(totalCreditAmount * 100) / 100,
    rawReturnsText,
    customerNote: text.trim(),
  }
}

export function OrderDetailsDialog({ 
  order, 
  open, 
  onOpenChange,
  clients = [],
}: OrderDetailsDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Order Header Form State
  const initialClientId = order.client_id || order.client?.id || ""
  const [selectedClientId, setSelectedClientId] = React.useState(initialClientId)
  const [selectedStatus, setSelectedStatus] = React.useState(order.status)
  const [orderDateInput, setOrderDateInput] = React.useState("")
  const [isEditingDate, setIsEditingDate] = React.useState(false)
  // "" = NULL (Not set)
  const [invoiceDateInput, setInvoiceDateInput] = React.useState("")
  const [isEditingInvoiceDate, setIsEditingInvoiceDate] = React.useState(false)
  
  // Items State
  const [items, setItems] = React.useState<EditableItem[]>([])
  const [originalItems, setOriginalItems] = React.useState<EditableItem[]>([])
  const [deletedItemIds, setDeletedItemIds] = React.useState<string[]>([])

  // Search & Add Item State
  const [showAddSearch, setShowAddSearch] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Delete Order State
  const [isDeletingOrder, setIsDeletingOrder] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  const handleDeleteOrder = async () => {
    setIsDeletingOrder(true)
    try {
      const res = await deleteOrderAction(order.id)
      if (res.success) {
        toast.success(`Order ${order.order_no || order.id} has been moved to Trash.`)
        setShowDeleteConfirm(false)
        onOpenChange(false)
      } else {
        toast.error(res.error || "Failed to delete order.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error occurred"
      toast.error(msg)
    } finally {
      setIsDeletingOrder(false)
    }
  }

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

  // Format for clean display
  const formattedDisplayDate = React.useMemo(() => {
    if (!orderDateInput) return "-"
    try {
      const d = new Date(orderDateInput)
      if (isNaN(d.getTime())) return orderDateInput
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return orderDateInput
    }
  }, [orderDateInput])

  // Load details on open
  React.useEffect(() => {
    if (open && order.id) {
      setErrorMsg(null)
      setSuccessMsg(null)
      setDeletedItemIds([])
      setShowAddSearch(false)
      setSearchQuery("")
      setSearchResults([])
      setIsEditingDate(false)
      setIsEditingInvoiceDate(false)

      const initialDate = order.order_date || order.created_at || ""
      setOrderDateInput(formatForDateTimeInput(initialDate))
      setInvoiceDateInput(order.invoice_date || "")
      setSelectedClientId(order.client_id || order.client?.id || "")
      setSelectedStatus(order.status)

      const loadDetails = async () => {
        setLoading(true)
        const { data } = await getOrderDetails(order.id)
        const mapped: EditableItem[] = ((data as any[]) || []).map((row) => {
          const effectivePrice = getOrderItemEffectivePrice(row)
          const effectiveQty = row.picked_qty != null ? Number(row.picked_qty) : Number(row.qty || 1)
          return {
            id: row.id,
            isNew: false,
            item_id: row.item_id || null,
            custom_item_name: row.custom_item_name || null,
            sku: row.item?.sku || row.item_id || "N/A",
            name_en: row.custom_item_name || row.item?.name_en || "Unknown Item",
            desc_en: row.item?.desc_en || null,
            category: row.item?.category || null,
            uom: (row.uom || row.item?.uom || "EA").toUpperCase(),
            price: effectivePrice,
            qty: effectiveQty,
            order_qty: Number(row.qty || 0),
            picked_qty: row.picked_qty != null ? Number(row.picked_qty) : null,
            unit_price: Number(row.item?.unit_price || 0),
            box_price: Number(row.item?.box_price || 0),
            pack_price: Number(row.item?.pack_price || 0),
            requested_uom: row.requested_uom ? row.requested_uom.toUpperCase() : null,
          }
        })
        setItems(mapped)
        setOriginalItems(JSON.parse(JSON.stringify(mapped)))
        setLoading(false)
      }
      loadDetails()
    }
  }, [open, order.id, order.status, order.order_date, order.created_at, order.invoice_date, order.client_id, order.client?.id])

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
      } else if (cur.uom === "EA" && cur.unit_price > 0) {
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
      copy[idx].qty = Math.max(0, num)
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
      category: master.category || null,
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

  // Cancelled Categories parsing (TRD 6.8)
  const cancelledCategories = React.useMemo(() => {
    return parseCancelledCategories(order.note, order.cancelled_categories)
  }, [order.note, order.cancelled_categories])

  const getItemCategory = React.useCallback((item: any): "GROCERY" | "GENERAL" | "FROZEN" => {
    const raw = (item.item?.category || item.category || "").toUpperCase()
    if (raw.includes("FROZEN")) return "FROZEN"
    if (raw.includes("GENERAL")) return "GENERAL"
    return "GROCERY"
  }, [])

  // Active items (excluding cancelled categories)
  const activeItems = React.useMemo(() => {
    return items.filter((it) => !cancelledCategories.includes(getItemCategory(it)))
  }, [items, cancelledCategories, getItemCategory])

  // Calculation: All vs Active
  const totalCalculated = items.reduce(
    (acc, cur) => acc + (Number(cur.qty || 0) * Number(cur.price || 0)),
    0
  )
  const totalUnits = items.reduce((acc, cur) => acc + Number(cur.qty || 0), 0)

  const activeTotalCalculated = React.useMemo(() => {
    return activeItems.reduce(
      (acc, cur) => acc + (Number(cur.qty || 0) * Number(cur.price || 0)),
      0
    )
  }, [activeItems])

  const activeTotalUnits = React.useMemo(() => {
    return activeItems.reduce((acc, cur) => acc + Number(cur.qty || 0), 0)
  }, [activeItems])

  // Credit calculation from order.category_credits
  const categoryCredits = React.useMemo(() => {
    return (order.category_credits && typeof order.category_credits === "object")
      ? (order.category_credits as Record<string, number>)
      : {}
  }, [order.category_credits])

  const totalCreditAmount = React.useMemo(() => {
    return Object.values(categoryCredits).reduce((sum, val) => sum + (Number(val) || 0), 0)
  }, [categoryCredits])

  const netTotalCalculated = Math.max(0, activeTotalCalculated - totalCreditAmount)

  // Category breakdown for tab filtering and cancel actions
  const categoryBreakdown = React.useMemo(() => {
    const map: Record<"GROCERY" | "GENERAL" | "FROZEN", { count: number; subtotal: number; isCancelled: boolean }> = {
      GROCERY: { count: 0, subtotal: 0, isCancelled: cancelledCategories.includes("GROCERY") },
      GENERAL: { count: 0, subtotal: 0, isCancelled: cancelledCategories.includes("GENERAL") },
      FROZEN: { count: 0, subtotal: 0, isCancelled: cancelledCategories.includes("FROZEN") },
    }
    for (const it of items) {
      const cat = getItemCategory(it)
      map[cat].count++
      map[cat].subtotal += (Number(it.qty) || 0) * (Number(it.price) || 0)
    }
    return map
  }, [items, cancelledCategories, getItemCategory])

  const [selectedCatTab, setSelectedCatTab] = React.useState<"ALL" | "GROCERY" | "GENERAL" | "FROZEN">("ALL")
  const [categoryToCancel, setCategoryToCancel] = React.useState<string | null>(null)
  const [isProcessingCategory, setIsProcessingCategory] = React.useState(false)

  const handleCancelCategory = async (cat: string) => {
    try {
      setIsProcessingCategory(true)
      const res = await cancelOrderCategoryAction(order.id, cat)
      if (res.success) {
        toast.success(`${cat} category has been cancelled. Invoice is marked as VOID (결번).`)
        setCategoryToCancel(null)
      } else {
        toast.error(res.error || `Failed to cancel ${cat} category`)
      }
    } finally {
      setIsProcessingCategory(false)
    }
  }

  const handleUncancelCategory = async (cat: string) => {
    try {
      setIsProcessingCategory(true)
      const res = await uncancelOrderCategoryAction(order.id, cat)
      if (res.success) {
        toast.success(`${cat} category has been restored.`)
      } else {
        toast.error(res.error || `Failed to restore ${cat} category`)
      }
    } finally {
      setIsProcessingCategory(false)
    }
  }

  // Parse itemized returns and customer note from order.note
  const parsedReturns = React.useMemo(() => {
    return parseOrderReturns(order.note)
  }, [order.note])

  const hasCreditInfo =
    totalCreditAmount > 0 ||
    parsedReturns.returns.length > 0 ||
    Boolean(parsedReturns.rawReturnsText)

  const [showCreditDetails, setShowCreditDetails] = React.useState<boolean>(() => {
    return (
      Boolean(order.category_credits && Object.keys(order.category_credits).length > 0) ||
      Boolean(order.note && order.note.includes("[Returns:"))
    )
  })

  // Header change tracking
  const isOrderDateChanged =
    orderDateInput !== formatForDateTimeInput(order.order_date || order.created_at)
  const isInvoiceDateChanged = invoiceDateInput !== (order.invoice_date || "")
  const isClientChanged = selectedClientId !== initialClientId
  const isStatusChanged = selectedStatus !== order.status
  const isInvoiceIssued =
    Boolean(order.invoice_number) || ISSUED_INVOICE_STATUSES.includes(order.status)

  // 주문일(NY 기준 날짜) — 인보이스 날짜 최소값
  const orderDay = React.useMemo(
    () => toAtlantaDateString(orderDateInput ? new Date(orderDateInput) : order.order_date || order.created_at),
    [orderDateInput, order.order_date, order.created_at]
  )

  // 인보이스 날짜 검증 (서버와 동일 규칙). 날짜가 바뀐 경우에만 차단
  const invoiceDateError = React.useMemo(() => {
    if (!isOrderDateChanged && !isInvoiceDateChanged) return null
    return validateInvoiceDate(
      invoiceDateInput || null,
      orderDateInput ? new Date(orderDateInput) : order.order_date || order.created_at
    )
  }, [isOrderDateChanged, isInvoiceDateChanged, invoiceDateInput, orderDateInput, order.order_date, order.created_at])

  // Check if form is dirty
  const isDirty = React.useMemo(() => {
    if (isOrderDateChanged || isInvoiceDateChanged || isClientChanged || isStatusChanged) return true
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
  }, [isOrderDateChanged, isInvoiceDateChanged, isClientChanged, isStatusChanged, deletedItemIds, items, originalItems])

  const [showInvoiceDateConfirm, setShowInvoiceDateConfirm] = React.useState(false)

  // Save changes execution
  const executeSaveChanges = async () => {
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

      // ISO conversion for orderDate — only send when changed
      let formattedOrderDate: string | undefined = undefined
      if (isOrderDateChanged && orderDateInput) {
        const d = new Date(orderDateInput)
        if (!isNaN(d.getTime())) {
          formattedOrderDate = d.toISOString()
        }
      }

      const result = await updateOrderAction({
        orderId: order.id,
        status: isStatusChanged ? selectedStatus : undefined,
        orderDate: formattedOrderDate,
        invoiceDate: isInvoiceDateChanged ? invoiceDateInput || null : undefined,
        clientId: isClientChanged ? selectedClientId || null : undefined,
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

  const handleSaveChanges = () => {
    if (invoiceDateError) {
      setErrorMsg(invoiceDateError)
      return
    }
    if (isInvoiceDateChanged && isInvoiceIssued) {
      setShowInvoiceDateConfirm(true)
      return
    }
    executeSaveChanges()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-full p-6 gap-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-1.5 shrink-0 pr-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <DialogTitle className="text-xl font-bold tracking-tight">
                Order Details & Item Management
              </DialogTitle>
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-muted font-semibold text-foreground">
                {order.order_no || order.id}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">Status:</span>
              {isStatusChanged && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                  Modified
                </Badge>
              )}
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  if (val) setSelectedStatus(val)
                }}
              >
                <SelectTrigger className="h-7 min-w-[130px] text-xs font-semibold gap-1.5 bg-background p-1">
                  <OrderStatusBadge status={selectedStatus} className="text-[10px] px-2 py-0 h-4.5" />
                </SelectTrigger>
                <SelectContent align="end">
                  {AVAILABLE_STATUSES.map((st) => (
                    <SelectItem key={st} value={st} className="text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={st} className="text-[10px] px-2 py-0 h-4.5 font-semibold" />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Edit order status, date, adjust item quantities and UOM, or add/remove products in real-time.
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

        {/* Summary Info Cards (Structured 3-Panel High-Visibility Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 shrink-0">
          {/* Panel 1: Store & Client */}
          <div className="rounded-xl border bg-card p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
            {/* Store Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <Store className="size-3.5 text-primary" />
                  <span className="font-semibold text-foreground/80">Store</span>
                </div>
                {order.store?.price_tier && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-bold bg-primary/10 text-primary border-primary/20">
                    {order.store.price_tier}
                  </Badge>
                )}
              </div>
              <p className="font-bold text-sm text-foreground leading-snug break-words" title={order.store?.name || "-"}>
                {order.store?.name || "-"}
              </p>
              {order.store?.credit_limit !== undefined && order.store.credit_limit > 0 && (
                <span className="text-[11px] font-mono text-muted-foreground block">
                  Credit Limit: ₩{order.store.credit_limit.toLocaleString()}
                </span>
              )}
            </div>

            {/* Client Section */}
            <div className="pt-2 border-t border-border/60 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" />
                  <span>Client</span>
                </div>
                {isClientChanged && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                    Modified
                  </Badge>
                )}
              </div>
              {clients && clients.length > 0 ? (
                <Select value={selectedClientId} onValueChange={(val) => setSelectedClientId(val || "")}>
                  <SelectTrigger className="h-7 text-xs bg-background font-medium px-2 py-0 border-muted-foreground/30 focus-visible:ring-primary w-full">
                    <SelectValue placeholder="Select Client">
                      {clients.find((c) => c.id === selectedClientId)?.name || order.client?.name || "Select Client"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1 font-mono">({c.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-semibold text-xs text-foreground truncate" title={order.client?.name || "-"}>
                  {order.client?.name || "-"}
                </p>
              )}
            </div>
          </div>

          {/* Panel 2: Schedule & Invoices */}
          <div className="rounded-xl border bg-card p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
            {/* Dates: 2-column grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Order Date */}
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-2 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                  <Calendar className="size-3" />
                  <span>Order Date</span>
                </div>
                {isEditingDate ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="datetime-local"
                      value={orderDateInput}
                      onChange={(e) => setOrderDateInput(e.target.value)}
                      autoFocus
                      className="h-6 text-[11px] bg-background font-mono px-1.5 py-0 border-primary/40 focus-visible:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingDate(false)}
                      className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                      title="Done editing date"
                    >
                      <Check className="size-3 text-primary" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDate(true)}
                    className="flex items-center justify-between cursor-pointer group hover:bg-primary/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                    title="Click to edit order date"
                  >
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {formattedDisplayDate}
                    </p>
                    <span className="text-[9px] text-primary/70 group-hover:text-primary font-medium flex items-center gap-0.5 shrink-0 ml-0.5">
                      <Pencil className="size-2" />
                      Edit
                    </span>
                  </div>
                )}
              </div>

              {/* Invoice Date */}
              <div
                className={`rounded-lg border p-2 space-y-1 ${
                  invoiceDateError ? "border-destructive/50 bg-destructive/5" : "border-primary/25 bg-primary/5"
                }`}
              >
                <div
                  className={`flex items-center gap-1 text-[11px] font-semibold ${
                    invoiceDateError ? "text-destructive" : "text-primary"
                  }`}
                >
                  <CalendarCheck className="size-3" />
                  <span>Invoice Date</span>
                </div>
                {isEditingInvoiceDate ? (
                  <div className="flex items-center gap-1">
                    <Input
                      id="invoice-date-input"
                      type="date"
                      value={invoiceDateInput}
                      min={orderDay || undefined}
                      onChange={(e) => setInvoiceDateInput(e.target.value)}
                      autoFocus
                      className="h-6 text-[11px] bg-background font-mono px-1.5 py-0 border-primary/40 focus-visible:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingInvoiceDate(false)}
                      className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                      title="Done editing invoice date"
                    >
                      <Check className="size-3 text-primary" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingInvoiceDate(true)}
                    className="flex items-center justify-between cursor-pointer group hover:bg-primary/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                    title="Click to edit invoice date"
                  >
                    {invoiceDateInput ? (
                      <p className="text-[11px] font-medium text-foreground truncate tabular-nums">
                        {formatDateOnlyForDisplay(invoiceDateInput)}
                      </p>
                    ) : (
                      <p className="text-[11px] italic text-muted-foreground truncate">Not set</p>
                    )}
                    <span className="flex items-center gap-0.5 shrink-0 ml-0.5">
                      {invoiceDateInput && (
                        <button
                          id="invoice-date-clear"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInvoiceDateInput("")
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Clear invoice date"
                        >
                          <X className="size-2.5" />
                        </button>
                      )}
                      <span className="text-[9px] text-primary/70 group-hover:text-primary font-medium flex items-center gap-0.5">
                        <Pencil className="size-2" />
                        Edit
                      </span>
                    </span>
                  </div>
                )}
                {invoiceDateError && (
                  <p className="text-[9px] leading-tight text-destructive">
                    Must be on or after {orderDay}
                  </p>
                )}
              </div>
            </div>

            {/* Invoices List */}
            <div className="pt-2 border-t border-border/60 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-primary" />
                  <span>Invoice Numbers</span>
                </div>
                {order.category_invoices && Object.keys(order.category_invoices).length > 1 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold">
                    {Object.keys(order.category_invoices).length} Invoices
                  </Badge>
                )}
              </div>
              {order.category_invoices && Object.keys(order.category_invoices).length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {Object.entries(order.category_invoices).map(([cat, num]) => {
                    const isVoid = cancelledCategories.includes(cat.toUpperCase())
                    return (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border shadow-2xs ${
                          isVoid
                            ? "bg-destructive/10 border-destructive/30 text-destructive line-through decoration-destructive/60"
                            : "bg-muted/40 text-foreground"
                        }`}
                        title={isVoid ? `${cat} Invoice (VOID / 결번)` : `${cat} Invoice`}
                      >
                        <span className="text-[9.5px] font-bold text-muted-foreground uppercase">{cat.slice(0, 3)}:</span>
                        <span className="font-semibold">{num}</span>
                        {isVoid && (
                          <span className="text-[8px] font-bold bg-destructive text-destructive-foreground px-1 py-0 rounded not-italic no-underline">
                            VOID
                          </span>
                        )}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="font-mono font-medium text-xs text-foreground">
                  {order.invoice_number || "-"}
                </p>
              )}
            </div>
          </div>

          {/* Panel 3: Billing & Net Total */}
          <div className="rounded-xl border border-primary/25 bg-card p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5" />
                  <span>Billing Summary</span>
                </div>
                {hasCreditInfo && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold">
                    Credit Applied
                  </Badge>
                )}
              </div>

              {hasCreditInfo || cancelledCategories.length > 0 ? (
                <div className="space-y-1 pt-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Active Subtotal:</span>
                    <span className="font-semibold tabular-nums text-foreground/80 line-through decoration-muted-foreground/60">
                      ${activeTotalCalculated.toFixed(2)}
                    </span>
                  </div>
                  {cancelledCategories.length > 0 && (
                    <div className="flex items-baseline justify-between text-xs text-destructive font-medium">
                      <span>Voided:</span>
                      <span className="font-semibold font-mono text-[11px]">
                        {cancelledCategories.join(", ")} (Excluded)
                      </span>
                    </div>
                  )}
                  {hasCreditInfo && (
                    <>
                      <div className="flex items-baseline justify-between text-xs text-destructive font-semibold">
                        <span className="flex items-center gap-1">
                          <RotateCcw className="size-3" />
                          Total Credit:
                        </span>
                        <span className="font-bold tabular-nums">
                          -${totalCreditAmount.toFixed(2)}
                        </span>
                      </div>
                      {Object.entries(categoryCredits).filter(([_, v]) => Number(v) > 0).length > 0 && (
                        <div className="flex flex-wrap gap-1 py-0.5">
                          {Object.entries(categoryCredits).filter(([_, v]) => Number(v) > 0).map(([cat, val]) => (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded border border-destructive/30 bg-destructive/10 text-destructive font-semibold shadow-2xs"
                            >
                              <span className="font-bold">{cat}:</span>
                              <span>-${Number(val).toFixed(2)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="pt-2 text-xs text-muted-foreground">
                  Standard invoice without return deductions.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/60">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {hasCreditInfo ? "Net Payable Total" : "Total Amount"}
                  </span>
                  {hasCreditInfo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreditDetails((prev) => !prev)}
                      className="h-6 px-1.5 mt-0.5 text-[11px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10 -ml-1 gap-1"
                    >
                      <RotateCcw className="size-3" />
                      <span>{showCreditDetails ? "Hide Credit Details" : "View Credit Items"}</span>
                      {showCreditDetails ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </Button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-primary tabular-nums tracking-tight">
                    ${(hasCreditInfo ? netTotalCalculated : activeTotalCalculated).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit & Returns Breakdown Panel (Expands when toggled) */}
        {hasCreditInfo && showCreditDetails && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-3 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-destructive" />
                <h4 className="text-xs font-bold text-destructive tracking-wide uppercase">
                  Credit & Return Items Breakdown (반품 및 크레딧 상세 명세)
                </h4>
                {parsedReturns.returns.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-destructive/40 text-destructive font-mono">
                    {parsedReturns.returns.length} Return Item{parsedReturns.returns.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-destructive font-mono">
                  Total Deducted: -${totalCreditAmount.toFixed(2)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  onClick={() => setShowCreditDetails(false)}
                  title="Close credit breakdown"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Itemized Table */}
            {parsedReturns.returns.length > 0 ? (
              <div className="rounded-lg border border-destructive/20 bg-background overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-destructive/10 text-[10px] uppercase font-bold text-destructive border-b border-destructive/20">
                    <tr>
                      <th className="py-1.5 px-3 w-10 text-center">#</th>
                      <th className="py-1.5 px-3">Return Item Name</th>
                      <th className="py-1.5 px-3 w-28 text-center">Returned Qty</th>
                      <th className="py-1.5 px-3 w-28 text-center">Reason</th>
                      <th className="py-1.5 px-3 w-32 text-right">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedReturns.returns.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-1.5 px-3 text-center font-mono text-[11px] text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-foreground">
                          {ret.itemName}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-medium">
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                            {ret.qty} {ret.uom}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 bg-amber-500/10 font-medium">
                            {ret.reason}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-destructive tabular-nums">
                          {ret.creditAmount > 0 ? `-$${ret.creditAmount.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-destructive/5 font-bold border-t border-destructive/20 text-xs">
                    <tr>
                      <td colSpan={2} className="py-1.5 px-3 text-muted-foreground">
                        Total Returned Items
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono">
                        {parsedReturns.totalReturnQty} EA
                      </td>
                      <td></td>
                      <td className="py-1.5 px-3 text-right font-mono text-destructive">
                        -${totalCreditAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : parsedReturns.rawReturnsText ? (
              <div className="rounded-lg border border-destructive/20 bg-background p-2.5 text-xs">
                <span className="font-semibold text-destructive block mb-1">Raw Return Notes:</span>
                <p className="font-mono text-foreground/90 whitespace-pre-wrap">{parsedReturns.rawReturnsText}</p>
              </div>
            ) : null}

            {/* Customer Memo if present */}
            {parsedReturns.customerNote && (
              <div className="rounded-lg border border-border/80 bg-background/80 p-2.5 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Customer Memo (주문자 추가 메모)
                </span>
                <p className="text-foreground italic">{parsedReturns.customerNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Customer Note Callout when Credit panel is closed */}
        {!showCreditDetails && parsedReturns.customerNote && (
          <div className="rounded-lg border bg-muted/40 p-2.5 text-xs flex items-start gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">
              Memo:
            </span>
            <p className="text-foreground/90 italic">{parsedReturns.customerNote}</p>
          </div>
        )}

        {/* Ordered Line Items Section */}
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold px-1 shrink-0">
            <span className="flex items-center gap-1.5 text-foreground">
              <Package className="size-4 text-primary" />
              Ordered Items ({activeItems.length !== items.length ? `${activeItems.length}/${items.length}` : items.length} SKUs)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">
                Active Units: {activeTotalUnits} {activeTotalUnits !== totalUnits && `(Total: ${totalUnits})`}
              </span>
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

          {/* Category Filter & Partial Cancellation Bar (TRD 6.8) */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/70 text-xs shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">Category:</span>
              {(["ALL", "GROCERY", "GENERAL", "FROZEN"] as const).map((cat) => {
                const count = cat === "ALL" ? items.length : categoryBreakdown[cat].count
                if (cat !== "ALL" && count === 0) return null
                const isCatCancelled = cat !== "ALL" && categoryBreakdown[cat].isCancelled
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCatTab(cat)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      selectedCatTab === cat
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-background text-foreground hover:bg-muted border border-border/80"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1 rounded font-mono ${
                      selectedCatTab === cat ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                    {isCatCancelled && (
                      <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1 rounded uppercase">
                        VOID
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Category Partial Cancellation & Restore Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["GROCERY", "GENERAL", "FROZEN"] as const).map((cat) => {
                const info = categoryBreakdown[cat]
                if (info.count === 0) return null
                if (info.isCancelled) {
                  return (
                    <Button
                      key={cat}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isProcessingCategory}
                      onClick={() => handleUncancelCategory(cat)}
                      className="h-6 text-[10.5px] px-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 font-semibold gap-1"
                      title={`Restore ${cat} category items and reactivate invoice`}
                    >
                      <RotateCcw className="size-2.5" />
                      Restore {cat}
                    </Button>
                  )
                }
                return (
                  <Button
                    key={cat}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessingCategory}
                    onClick={() => setCategoryToCancel(cat)}
                    className="h-6 text-[10.5px] px-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold gap-1"
                    title={`Cancel all ${info.count} items in ${cat} and mark invoice as VOID`}
                  >
                    <Ban className="size-2.5" />
                    Cancel {cat}
                  </Button>
                )
              })}
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
                  {(selectedCatTab === "ALL" ? items : items.filter((it) => getItemCategory(it) === selectedCatTab)).length > 0 ? (
                    (selectedCatTab === "ALL" ? items : items.filter((it) => getItemCategory(it) === selectedCatTab)).map((item, idx) => {
                      const itemCat = getItemCategory(item)
                      const isItemCancelled = cancelledCategories.includes(itemCat)
                      const subtotal = Number(item.qty || 0) * Number(item.price || 0)
                      const orig = originalItems.find((o) => o.id === item.id)

                      // 1. Qty 변경 여부: 원래 주문 수량(order_qty)과 다르거나 현재 다이얼로그 세션에서 변경된 경우
                      const isQtyModifiedFromOrder = item.order_qty !== undefined && item.order_qty !== item.qty
                      const isQtyChanged = isQtyModifiedFromOrder || Boolean(!item.isNew && orig && orig.qty !== item.qty)

                      // 2. Price 변경 여부: 해당 UOM의 카탈로그 표준 단가와 다르거나 현재 다이얼로그 세션에서 변경된 경우
                      let standardMasterPrice = 0
                      if (item.uom === "BOX" && item.box_price > 0) standardMasterPrice = item.box_price
                      else if (item.uom === "PACK" && item.pack_price > 0) standardMasterPrice = item.pack_price
                      else if (item.unit_price > 0) standardMasterPrice = item.unit_price

                      const isPriceModifiedFromCatalog = standardMasterPrice > 0 && Math.abs(item.price - standardMasterPrice) > 0.001
                      const isPriceChanged = isPriceModifiedFromCatalog || Boolean(!item.isNew && orig && Math.abs(orig.price - item.price) > 0.0001)

                      // 3. UOM 변경 여부: 원래 요청된 단위(requested_uom)와 다르거나 현재 다이얼로그 세션에서 변경된 경우
                      const isUomModifiedFromOrder = Boolean(item.requested_uom && item.requested_uom !== item.uom)
                      const isUomChanged = isUomModifiedFromOrder || Boolean(!item.isNew && orig && orig.uom !== item.uom)

                      return (
                        <TableRow 
                          key={item.id} 
                          className={`hover:bg-muted/30 transition-colors ${
                            isItemCancelled 
                              ? "opacity-55 bg-destructive/5 line-through decoration-destructive/50" 
                              : (item.isNew ? "bg-primary/5" : "")
                          }`}
                        >
                          <TableCell className="text-xs text-muted-foreground font-mono text-center">
                            {idx + 1}
                          </TableCell>
                          
                          {/* Item Name / Description */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-foreground leading-tight">
                                {item.name_en}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono font-bold uppercase">
                                {itemCat}
                              </Badge>
                              {isItemCancelled && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 font-bold no-underline not-italic">
                                  CANCELLED ({itemCat})
                                </Badge>
                              )}
                              {item.isNew && (
                                <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-emerald-600">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            {item.desc_en && (
                              <div className="text-[11px] text-muted-foreground font-medium line-clamp-1 mt-0.5">
                                {item.desc_en}
                              </div>
                            )}
                          </TableCell>

                          {/* Editable UOM Select */}
                          <TableCell className="text-center">
                            <select
                              value={item.uom}
                              disabled={isItemCancelled}
                              onChange={(e) => handleUomChange(idx, e.target.value)}
                              title={isUomChanged && orig ? `Original: ${orig.uom}` : undefined}
                              className={`h-8 w-20 text-xs font-mono font-bold rounded px-1.5 focus:outline-none focus:ring-1 text-center cursor-pointer shadow-sm transition-colors ${
                                isUomChanged
                                  ? "border-blue-500 text-blue-600 bg-blue-50/70 dark:text-blue-400 dark:bg-blue-950/30 focus:ring-blue-500"
                                  : "bg-background border border-input text-foreground focus:ring-primary"
                              }`}
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
                              disabled={isItemCancelled}
                              value={item.price}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              title={isPriceChanged && orig ? `Original: $${orig.price.toFixed(2)}` : undefined}
                              className={`h-8 w-24 ml-auto text-right font-mono text-xs tabular-nums transition-colors ${
                                isPriceChanged
                                  ? "border-blue-500 text-blue-600 font-bold bg-blue-50/70 dark:text-blue-400 dark:bg-blue-950/30 focus-visible:ring-blue-500"
                                  : "bg-background"
                              }`}
                            />
                          </TableCell>

                          {/* Editable Qty */}
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <Input
                                type="number"
                                min="0"
                                disabled={isItemCancelled}
                                value={item.qty}
                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                title={isQtyChanged && orig ? `Original: ${orig.qty}` : undefined}
                                className={`h-8 w-16 ml-auto text-right font-mono font-bold text-xs tabular-nums transition-colors ${
                                  item.qty === 0
                                    ? "border-destructive text-destructive bg-destructive/10 focus-visible:ring-destructive"
                                    : isQtyChanged
                                    ? "border-blue-500 text-blue-600 bg-blue-50/70 dark:text-blue-400 dark:bg-blue-950/30 focus-visible:ring-blue-500"
                                    : "bg-background"
                                  }`}
                              />
                              {(isQtyChanged || item.qty === 0 || (item.order_qty !== undefined && item.order_qty !== item.qty)) && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium" title={`Original ordered quantity: ${orig?.qty ?? item.order_qty}`}>
                                  Ord: {orig?.qty ?? item.order_qty}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Subtotal */}
                          <TableCell className="text-right tabular-nums text-xs font-bold text-primary">
                            {isItemCancelled ? (
                              <span className="text-muted-foreground line-through decoration-destructive text-[11px]">
                                ${subtotal.toFixed(2)}
                              </span>
                            ) : (
                              `$${subtotal.toFixed(2)}`
                            )}
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
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-3 pt-3 border-t shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
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

            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || isDeletingOrder}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 text-xs h-7 px-2"
              title="Delete this order"
            >
              <Trash2 className="size-3" />
              Delete Order
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isSaving || isDeletingOrder}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              disabled={isSaving || !isDirty || Boolean(invoiceDateError) || isDeletingOrder}
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

      {/* Delete Order Confirmation Dialog */}
      <Dialog 
        open={showDeleteConfirm} 
        onOpenChange={(open) => !open && !isDeletingOrder && setShowDeleteConfirm(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Move Order to Trash
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Are you sure you want to move order{" "}
              <span className="font-semibold text-foreground font-mono">
                {order.order_no || order.id}
              </span>
              {order.store?.name && (
                <>
                  {" "}for <span className="font-semibold text-foreground">{order.store.name}</span>
                </>
              )}
              {" "}to the Trash?
              <br />
              <span className="text-muted-foreground font-medium block mt-2 text-xs">
                ℹ️ The order ({items.length} line items) will be hidden from active lists and warehouse picking. You can restore it anytime from the Trash tab.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingOrder}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={isDeletingOrder}
              className="gap-1.5"
            >
              {isDeletingOrder ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Moving to Trash...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Move to Trash
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Date Change Confirmation */}
      <ConfirmDialog
        open={showInvoiceDateConfirm}
        onOpenChange={(open) => !isSaving && setShowInvoiceDateConfirm(open)}
        title="Change Issued Invoice Date"
        description="This invoice has already been issued. Are you sure you want to change the invoice date?"
        confirmText="Change Date"
        onConfirm={() => {
          setShowInvoiceDateConfirm(false)
          executeSaveChanges()
        }}
        isPending={isSaving}
      />

      {/* Category Partial Cancellation Confirmation (TRD 6.8) */}
      <ConfirmDialog
        open={Boolean(categoryToCancel)}
        onOpenChange={(open) => !isProcessingCategory && !open && setCategoryToCancel(null)}
        title={`Cancel ${categoryToCancel} Category`}
        description={`Are you sure you want to cancel the ${categoryToCancel} category? All items in this category will be excluded from active billing and warehouse picking. The invoice number will be permanently preserved as VOID (결번) for audit compliance.`}
        confirmText={`Cancel ${categoryToCancel}`}
        variant="destructive"
        onConfirm={() => {
          if (categoryToCancel) {
            handleCancelCategory(categoryToCancel)
          }
        }}
        isPending={isProcessingCategory}
      />
    </Dialog>
  )
}
