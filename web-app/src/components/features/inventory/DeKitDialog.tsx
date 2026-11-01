"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Boxes, Loader2, PackageCheck, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { dekitBundleAction } from "@/app/actions/bin-inventory.actions"

export interface DeKitDialogProps {
  isOpen: boolean
  onClose: () => void
  parentItem: {
    id: string
    sku: string
    name: string
    desc?: string | null
    available: number
  } | null
  childSku?: string
  conversionRatio?: number
  targetLocation?: string
  onSuccess?: () => void
}

export function DeKitDialog({
  isOpen,
  onClose,
  parentItem,
  childSku,
  conversionRatio = 5,
  targetLocation = "LOC-S0105A01",
  onSuccess,
}: DeKitDialogProps) {
  const [qty, setQty] = React.useState<number>(1)
  const [isLoading, setIsLoading] = React.useState(false)

  // Reset quantity when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setQty(1)
      setIsLoading(false)
    }
  }, [isOpen])

  if (!parentItem) return null

  const maxQty = Math.max(0, parentItem.available)
  const singlesToProduce = qty * conversionRatio
  const isValid = qty > 0 && qty <= maxQty

  const handleConfirm = async () => {
    if (!isValid || isLoading) return

    setIsLoading(true)
    try {
      const res = await dekitBundleAction({
        parentItemId: parentItem.id,
        qty,
      })

      if (res.success) {
        toast.success(res.message || "De-kitting completed successfully.")
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || "Failed to de-kit bundle.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">De-kit Bundle (번들 해체)</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Convert Multi 5pk ramen into Single units for order fulfillment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item details card */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Parent Multi Item</span>
              <Badge variant="outline" className="font-mono text-[11px] font-bold">
                {parentItem.sku}
              </Badge>
            </div>
            <div className="font-medium text-sm text-foreground">
              {parentItem.name}
              {parentItem.desc && (
                <span className="text-muted-foreground ml-1.5 font-normal text-xs">
                  ({parentItem.desc})
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Available Multi Stock:</span>
              <span className="font-bold text-foreground font-mono">
                {parentItem.available} pk
              </span>
            </div>
          </div>

          {/* Conversion visual */}
          <div className="grid grid-cols-11 items-center gap-2 rounded-lg border border-border/70 p-3 bg-background">
            <div className="col-span-4 text-center space-y-1">
              <div className="text-[11px] text-muted-foreground">Deduct Multi</div>
              <div className="text-base font-bold text-destructive font-mono">
                -{qty} pk
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">{parentItem.sku}</div>
            </div>

            <div className="col-span-3 flex flex-col items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
              <span className="text-[10px] font-mono mt-0.5">×{conversionRatio} ratio</span>
            </div>

            <div className="col-span-4 text-center space-y-1">
              <div className="text-[11px] text-muted-foreground">Produce Single</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                +{singlesToProduce} EA
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">{childSku || "Single"}</div>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="dekit-qty" className="text-xs font-medium">
                Packs to De-kit (해체할 팩 수)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Max available: <b className="text-foreground">{maxQty}</b> pk
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="dekit-qty"
                type="number"
                min={1}
                max={maxQty}
                value={qty || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setQty(isNaN(val) ? 0 : Math.min(Math.max(0, val), maxQty))
                }}
                disabled={isLoading || maxQty <= 0}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQty(1)}
                disabled={isLoading || maxQty < 1}
                className="text-xs"
              >
                1 pk
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQty(Math.min(5, maxQty))}
                disabled={isLoading || maxQty < 5}
                className="text-xs"
              >
                5 pk
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQty(maxQty)}
                disabled={isLoading || maxQty <= 0}
                className="text-xs"
              >
                All
              </Button>
            </div>
          </div>

          {/* Target location callout */}
          <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-foreground flex items-start gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-medium text-emerald-800 dark:text-emerald-300">
                Target Dedicated Location: <span className="font-mono font-bold">{targetLocation}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Singles will be stored in {targetLocation} and logged in inventory adjustments audit.
              </div>
            </div>
          </div>

          {maxQty <= 0 && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No available Multi packs in stock to de-kit.</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || isLoading || maxQty <= 0}
            className="text-xs gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>De-kitting...</span>
              </>
            ) : (
              <>
                <Boxes className="h-3.5 w-3.5" />
                <span>Confirm De-kit (-{qty} pk → +{singlesToProduce} EA)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
