"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  searchAssignableItemsAction,
  assignItemToBinAction,
  clearBinInventoryAction,
  AssignableItem,
} from "@/app/actions/bin-inventory.actions"
import {
  PackagePlus,
  Search,
  Package,
  Layers,
  Sparkles,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

interface BinAssignModalProps {
  open: boolean
  locationCode: string
  currentSku?: string
  currentName?: string
  currentQty?: number
  onClose: () => void
  onSuccess?: () => void
}

export function BinAssignModal({
  open,
  locationCode,
  currentSku,
  currentName,
  currentQty = 0,
  onClose,
  onSuccess,
}: BinAssignModalProps) {
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [searchResults, setSearchResults] = React.useState<AssignableItem[]>([])
  const [searching, setSearching] = React.useState<boolean>(false)
  const [selectedItem, setSelectedItem] = React.useState<AssignableItem | null>(null)
  const [qty, setQty] = React.useState<number>(currentQty > 0 ? currentQty : 50)
  const [loading, setLoading] = React.useState<boolean>(false)

  // Fetch initial items when modal opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("")
      setQty(currentQty > 0 ? currentQty : 50)
      setSearching(true)
      searchAssignableItemsAction("")
        .then((res) => {
          if (res.success) {
            setSearchResults(res.items)
            // If currently stored SKU exists, pre-select it
            if (currentSku) {
              const matched = res.items.find((it) => it.sku === currentSku)
              if (matched) setSelectedItem(matched)
            } else {
              setSelectedItem(res.items[0] || null)
            }
          }
        })
        .finally(() => setSearching(false))
    }
  }, [open, currentSku, currentQty])

  // Handle dynamic search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSearching(true)
    searchAssignableItemsAction(query)
      .then((res) => {
        if (res.success) {
          setSearchResults(res.items)
        }
      })
      .finally(() => setSearching(false))
  }

  const handleSave = async () => {
    if (!selectedItem) {
      toast.error("Please select an item to assign.")
      return
    }

    if (qty <= 0) {
      toast.error("Quantity must be greater than zero. Use Clear Bin to remove stock.")
      return
    }

    setLoading(true)
    try {
      const res = await assignItemToBinAction({
        locationCode,
        itemId: selectedItem.id,
        qty,
        replaceExisting: true,
      })

      if (res.success) {
        toast.success(res.message || `Assigned ${qty} units of ${selectedItem.sku} to ${locationCode}.`)
        if (onSuccess) onSuccess()
        onClose()
      } else {
        toast.error(res.error || "Failed to assign item to bin.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    setLoading(true)
    try {
      const res = await clearBinInventoryAction(locationCode)
      if (res.success) {
        toast.success(`Bin ${locationCode} cleared to 0 units.`)
        if (onSuccess) onSuccess()
        onClose()
      } else {
        toast.error(res.error || "Failed to clear bin.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Assign Stock to Bin Slot
              </DialogTitle>
              <DialogDescription className="text-xs font-mono mt-0.5 text-primary font-semibold">
                {locationCode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Current Bin Status Strip */}
          <div className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current Slot Status:</span>
            {currentQty > 0 && currentSku ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1 font-mono">
                <CheckCircle2 className="h-3 w-3" />
                <span>{currentSku} ({currentQty} units)</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1">
                Empty (0 units)
              </Badge>
            )}
          </div>

          {/* Item Search Bar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">1. Search & Select Item</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU or item name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>
          </div>

          {/* Search Result List */}
          <div className="border rounded-xl p-1.5 max-h-44 overflow-y-auto divide-y bg-background">
            {searching ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Searching items...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No items found. Try a different SKU or name.
              </div>
            ) : (
              searchResults.map((it) => {
                const isSelected = selectedItem?.id === it.id
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedItem(it)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {it.sku}
                        </span>
                        {it.category && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {it.category}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                        {it.name_en}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-semibold block">
                        ${it.unit_price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{it.uom}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Selected Item Preview Card */}
          {selectedItem && (
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-mono font-bold text-foreground block">
                    {selectedItem.sku}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[260px] block">
                    {selectedItem.name_en}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                ${selectedItem.unit_price.toFixed(2)} / {selectedItem.uom}
              </Badge>
            </div>
          )}

          {/* Quantity Input with Quick increment buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">2. Stock Quantity To Allocate</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={9999}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="font-mono text-sm font-bold text-center h-10 w-32"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {[10, 25, 50, 100].map((step) => (
                  <Button
                    key={step}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQty((prev) => prev + step)}
                    className="text-xs h-8 px-2 font-mono"
                  >
                    +{step}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t">
          <div>
            {currentQty > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleClear}
                disabled={loading}
                className="gap-1.5 text-xs h-8 w-full sm:w-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Bin</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={loading || !selectedItem}
              className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Assign Stock</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
