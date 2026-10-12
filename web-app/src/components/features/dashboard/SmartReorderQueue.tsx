"use client"

import * as React from "react"
import { AlertTriangle, Boxes, CheckCircle2, ShoppingCart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ReorderQueueData } from "@/services/dashboard.service"
import { toast } from "sonner"

interface SmartReorderQueueProps {
  data: ReorderQueueData
}

export function SmartReorderQueue({ data }: SmartReorderQueueProps) {
  const hasReorderItems = data.items.length > 0

  const handleGeneratePO = (sku: string, qty: number) => {
    toast.success(`Purchase Order Draft Created: ${sku}`, {
      description: `Draft order for ${qty} units has been queued for vendor approval.`,
    })
  }

  return (
    <Card className="p-5 flex flex-col justify-between border-border/80 h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                Smart Reorder Queue
              </h3>
              <p className="text-xs text-muted-foreground">
                Automated replenishment alerts for stock below safety threshold
              </p>
            </div>
          </div>
          {data.criticalStockouts > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-3 w-3" />
              {data.criticalStockouts} Critical Stockout
            </span>
          )}
        </div>

        {/* High-level Summary */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Items to Replenish
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground font-mono mt-0.5 block">
              {data.totalItemsToReorder}{" "}
              <span className="text-xs font-normal text-muted-foreground">SKUs</span>
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Below configured min safety stock
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Estimated PO Cost
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground font-mono mt-0.5 block">
              {data.formattedEstimatedCost}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Target 2x buffer replenishment
            </span>
          </div>
        </div>

        {/* Reorder Items List */}
        <div>
          <span className="text-xs font-semibold text-foreground mb-2 block">
            Replenishment Proposals
          </span>

          {!hasReorderItems ? (
            <div className="p-6 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <p className="font-semibold text-foreground">All Stock Levels Healthy</p>
              <p className="text-[11px] mt-0.5">
                No items are currently below minimum safety stock.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-md border bg-card/60 hover:bg-card transition-colors flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground truncate">
                        {item.sku}
                      </span>
                      <span
                        className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded border ${
                          item.isCritical
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {item.isCritical ? "Stockout (0)" : "Low Stock"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground mt-1 font-mono">
                      <span>Stock: <strong>{item.currentStock}</strong>/{item.minStock}</span>
                      <span>•</span>
                      <span>Suggest: <strong className="text-foreground">+{item.suggestedReorderQty}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <button
                      type="button"
                      onClick={() => handleGeneratePO(item.sku, item.suggestedReorderQty)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors shadow-2xs cursor-pointer"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      PO Draft
                    </button>
                    <span className="text-[10px] text-muted-foreground block mt-1 font-mono">
                      ${item.estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between mt-3">
        <span>Dynamic Formula: ROP Buffer = 2x Safety Stock</span>
        <span className="font-semibold text-foreground">1-Click Purchase Ready</span>
      </div>
    </Card>
  )
}
