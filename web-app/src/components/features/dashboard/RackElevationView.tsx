"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RackElevationData, RackSlotItem } from "@/services/dashboard.service"
import {
  Layers,
  Sparkles,
  Package,
  Boxes,
  ThermometerSnowflake,
  SunMedium,
  CheckCircle2,
  AlertTriangle,
  ArrowDownToDot,
} from "lucide-react"

interface RackElevationViewProps {
  rack: RackElevationData | null
  open: boolean
  onClose: () => void
}

export function RackElevationView({ rack, open, onClose }: RackElevationViewProps) {
  if (!rack) return null

  const isColdZone = rack.zoneType === "F"

  const statusBadge = () => {
    switch (rack.status) {
      case "congested":
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Congested ({rack.occupancyPercent}%)
          </Badge>
        )
      case "optimal":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Optimal ({rack.occupancyPercent}%)
          </Badge>
        )
      case "available":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Available ({rack.occupancyPercent}%)
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            Empty (0%)
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  isColdZone
                    ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Rack Bay {rack.rackCode}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Aisle {rack.aisleNumber.toString().padStart(2, "0")} • Bay{" "}
                  {rack.bayNumber.toString().padStart(2, "0")} • 4-Tier Vertical Elevation
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">{statusBadge()}</div>
          </div>
        </DialogHeader>

        {/* Rack Meta Summary Strip */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Storage Zone</span>
            <div className="flex items-center gap-1 font-semibold text-foreground mt-0.5">
              {isColdZone ? (
                <>
                  <ThermometerSnowflake className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Zone F (Cold Storage)</span>
                </>
              ) : (
                <>
                  <SunMedium className="h-3.5 w-3.5 text-amber-500" />
                  <span>Zone A (Ambient)</span>
                </>
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Occupancy Ratio</span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {rack.occupancyPercent}% in use
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Total Stock In Bay</span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {rack.totalUnits.toLocaleString()} units
            </span>
          </div>
        </div>

        {/* 4-Tier Rack Shelf Graphic (Level D down to Level A) */}
        <div className="space-y-3 mt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Vertical Shelf Tier</span>
            <span>Slot Allocations (Bin 01 / Bin 02)</span>
          </div>

          <div className="space-y-2.5">
            {rack.levels.map((lvl) => {
              const isGoldenZone = lvl.level === "A"
              const slot01 = lvl.slots.find((s) => s.bin === "01")
              const slot02 = lvl.slots.find((s) => s.bin === "02")

              return (
                <div
                  key={lvl.level}
                  className={`p-3 rounded-xl border transition-all ${
                    isGoldenZone
                      ? "border-amber-500/40 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5"
                      : "border-border/80 bg-card"
                  }`}
                >
                  {/* Tier Title Bar */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground border">
                        Level {lvl.level}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {lvl.levelName.replace(`Level ${lvl.level}`, "").replace(/[()]/g, "")}
                      </span>
                    </div>

                    {isGoldenZone && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Sparkles className="h-3 w-3" />
                        Golden Zone (Fast Pick)
                      </span>
                    )}
                  </div>

                  {/* 2 Bins Side-by-Side (Bin 01 and Bin 02) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <SlotCell
                      binLabel="Bin 01"
                      slot={slot01}
                      expectedCode={`LOC-${rack.zoneType}${rack.aisleNumber.toString().padStart(2, "0")}${rack.bayNumber.toString().padStart(2, "0")}${lvl.level}01`}
                    />
                    <SlotCell
                      binLabel="Bin 02"
                      slot={slot02}
                      expectedCode={`LOC-${rack.zoneType}${rack.aisleNumber.toString().padStart(2, "0")}${rack.bayNumber.toString().padStart(2, "0")}${lvl.level}02`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Standard Bay Dimensions: 4 Shelves × 2 Bins = 8 Capacity</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Elevation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SlotCell({
  binLabel,
  slot,
  expectedCode,
}: {
  binLabel: string
  slot?: RackSlotItem
  expectedCode: string
}) {
  if (!slot) {
    return (
      <div className="flex flex-col justify-between p-2.5 rounded-lg border border-dashed border-border/80 bg-muted/20 min-h-[78px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            {binLabel}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70">
            {expectedCode}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs py-1">
          <ArrowDownToDot className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span>Available for Putaway</span>
        </div>
      </div>
    )
  }

  const itemTotalValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(slot.onHandQty * slot.unitPrice)

  return (
    <div className="flex flex-col justify-between p-2.5 rounded-lg border bg-card/90 hover:border-primary/40 transition-colors shadow-xs min-h-[78px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          {binLabel}
        </span>
        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
          {slot.sku}
        </Badge>
      </div>

      <div className="my-1">
        <p className="font-semibold text-xs text-foreground truncate" title={slot.name}>
          {slot.name}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
        <span className="font-medium text-foreground">
          {slot.onHandQty.toLocaleString()} units
        </span>
        <span>{itemTotalValue}</span>
      </div>
    </div>
  )
}
