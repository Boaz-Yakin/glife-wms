"use client"

import * as React from "react"
import { AlertCircle, Archive, ArrowRight, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { DeadStockAnalysisData } from "@/services/dashboard.service"

interface DeadStockCardProps {
  data: DeadStockAnalysisData
}

export function DeadStockCard({ data }: DeadStockCardProps) {
  const hasDeadStock = data.deadItems.length > 0

  return (
    <Card className="p-5 flex flex-col justify-between border-border/80 h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Archive className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                Dead Stock Analysis (60+ Days)
              </h3>
              <p className="text-xs text-muted-foreground">
                Slow-moving inventory with zero dispatched orders in 60 days
              </p>
            </div>
          </div>
          {hasDeadStock && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-3 w-3" />
              {data.deadStockRatio}% of Stock Value
            </span>
          )}
        </div>

        {/* High-level Metrics */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Tied-up Capital
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground font-mono mt-0.5 block">
              {data.formattedDeadStockValue}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Non-liquid asset value
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Idle Quantities
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground font-mono mt-0.5 block">
              {data.deadStockQty.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">units</span>
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Across {data.deadItems.length} affected SKUs
            </span>
          </div>
        </div>

        {/* Top Dead Items List */}
        <div>
          <span className="text-xs font-semibold text-foreground mb-2 block">
            Top Idle Items
          </span>

          {!hasDeadStock ? (
            <div className="p-6 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Healthy Inventory Flow</p>
              <p className="text-[11px] mt-0.5">
                No items have been stagnant for over 60 days.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {data.deadItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-md border bg-card/60 hover:bg-card transition-colors flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground truncate">
                        {item.sku}
                      </span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                        Zone {item.zoneType}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-foreground">
                      ${item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {item.qty} units @ ${item.unitPrice}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between mt-3">
        <span>Action: Transfer to rear racks or discount</span>
        <span className="font-semibold text-foreground">Real-time DB Audited</span>
      </div>
    </Card>
  )
}
