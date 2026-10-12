"use client"

import * as React from "react"
import { ArrowRight, CheckCircle2, Layers, MoveRight, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SlottingOptimizationData } from "@/services/dashboard.service"
import { toast } from "sonner"

interface DynamicSlottingCardProps {
  data: SlottingOptimizationData
}

export function DynamicSlottingCard({ data }: DynamicSlottingCardProps) {
  const hasRecommendations = data.items.length > 0

  const handleQueueTransfer = (sku: string, fromLoc: string, targetZone: string) => {
    toast.success(`Bin Transfer Task Queued: ${sku}`, {
      description: `Task assigned to transfer from ${fromLoc} to recommended ${targetZone}.`,
    })
  }

  return (
    <Card className="p-5 flex flex-col justify-between border-border/80 h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                Slotting & Zone Optimization
              </h3>
              <p className="text-xs text-muted-foreground">
                AI-guided rack relocation proposals for velocity & temperature compliance
              </p>
            </div>
          </div>
          {hasRecommendations && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" />
              {data.totalRecommendations} Actionable Transfers
            </span>
          )}
        </div>

        {/* High-level Summary */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Mismatched / Suboptimal Slots
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground font-mono mt-0.5 block">
              {data.totalRecommendations}{" "}
              <span className="text-xs font-normal text-muted-foreground">Racks</span>
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Zone temperature or height variance
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Efficiency Gain
            </span>
            <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              +18% - 24%
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Estimated pick travel time reduction
            </span>
          </div>
        </div>

        {/* Recommendations List */}
        <div>
          <span className="text-xs font-semibold text-foreground mb-2 block">
            Relocation Proposals
          </span>

          {!hasRecommendations ? (
            <div className="p-6 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <p className="font-semibold text-foreground">Optimal Slotting Alignment</p>
              <p className="text-[11px] mt-0.5">
                All stored items comply with zone temperatures and picking velocity.
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
                      <span className="text-[10px] text-muted-foreground">
                        Loc: <strong>{item.currentLocationCode}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1 text-[10.5px] mt-1">
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        {item.currentZone}
                      </span>
                      <MoveRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {item.recommendedZone}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQueueTransfer(item.sku, item.currentLocationCode, item.recommendedZone)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] transition-colors shadow-2xs cursor-pointer"
                    >
                      <ArrowRight className="h-3 w-3" />
                      Transfer
                    </button>
                    <span className="text-[9.5px] text-muted-foreground block mt-1">
                      {item.dispatchFrequency} units stored
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
        <span>Golden Zone Rule: Fast-moving SKUs to Lower Front Racks</span>
        <span className="font-semibold text-foreground">Forklift Transfer Task</span>
      </div>
    </Card>
  )
}
