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
  type WarehouseStructureConfig,
  DEFAULT_WAREHOUSE_CONFIG,
} from "@/types/warehouse-layout"
import {
  applyWarehouseStructureAction,
  getWarehouseStructureConfigAction,
} from "@/app/actions/warehouse-layout.actions"
import {
  Settings2,
  SunMedium,
  ThermometerSnowflake,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

interface WarehouseStructureModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function WarehouseStructureModal({
  open,
  onClose,
  onSuccess,
}: WarehouseStructureModalProps) {
  const [config, setConfig] = React.useState<WarehouseStructureConfig>(DEFAULT_WAREHOUSE_CONFIG)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [fetching, setFetching] = React.useState<boolean>(false)
  const [inventoryAction, setInventoryAction] = React.useState<'preserve' | 'seed' | 'wipe'>('preserve')

  // Load current structure config on open
  React.useEffect(() => {
    if (open) {
      setFetching(true)
      getWarehouseStructureConfigAction()
        .then((res) => {
          if (res.success && res.config) {
            setConfig(res.config)
          }
        })
        .finally(() => setFetching(false))
    }
  }, [open])

  const calcZoneLocations = (aisles: number, bays: number, levels: number, bins: number) => {
    return Math.max(1, aisles || 1) * Math.max(1, bays || 1) * Math.max(1, levels || 1) * Math.max(1, bins || 1)
  }

  const zoneATotal = calcZoneLocations(
    config.zoneA.aisles,
    config.zoneA.bays,
    config.zoneA.levels,
    config.zoneA.bins
  )

  const zoneFTotal = calcZoneLocations(
    config.zoneF.aisles,
    config.zoneF.bays,
    config.zoneF.levels,
    config.zoneF.bins
  )

  const grandTotal = zoneATotal + zoneFTotal

  const handleApplyPreset120 = () => {
    setConfig(DEFAULT_WAREHOUSE_CONFIG)
    toast.info("Applied preset: 1 Aisle, 10 Bays, 3 Levels, 2 Bins (120 total)")
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await applyWarehouseStructureAction(config, {
        seedDemoData: inventoryAction === 'seed',
        wipeAllInventory: inventoryAction === 'wipe',
      })
      if (res.success) {
        toast.success(res.message || "Warehouse structure updated successfully!")
        if (onSuccess) onSuccess()
        onClose()
      } else {
        toast.error(res.error || "Failed to update warehouse layout.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Warehouse Structure Configuration
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Configure warehouse zones, aisle corridors, rack bays, tiers, and bin slots.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {fetching ? (
          <div className="flex flex-col items-center justify-center p-8 gap-2 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading current warehouse configuration...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-2">
            {/* Quick Preset Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 text-xs">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">
                  Target: <strong>1 Aisle • 10 Bays • 3 Tiers (A-C) • 2 Bins</strong>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyPreset120}
                className="text-xs h-7"
              >
                Apply Preset
              </Button>
            </div>

            {/* Zone A: Ambient Configuration Card */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <SunMedium className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                    Zone A (Ambient Storage)
                  </span>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-mono">
                  {zoneATotal} Bins
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Aisles</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={config.zoneA.aisles}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneA: { ...config.zoneA, aisles: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Bays</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={config.zoneA.bays}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneA: { ...config.zoneA, bays: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Tiers (Levels)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={config.zoneA.levels}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneA: { ...config.zoneA, levels: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[9px] text-muted-foreground block">
                    {config.zoneA.levels === 3 ? "A, B, C (3 Tiers)" : `${config.zoneA.levels} Tiers`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Bins / Tier</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={config.zoneA.bins}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneA: { ...config.zoneA, bins: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Zone F: Cold Storage Configuration Card */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <ThermometerSnowflake className="h-4 w-4 text-cyan-500" />
                  <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                    Zone F (Cold Chamber)
                  </span>
                </div>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[11px] font-mono">
                  {zoneFTotal} Bins
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Aisles</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={config.zoneF.aisles}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneF: { ...config.zoneF, aisles: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Bays</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={config.zoneF.bays}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneF: { ...config.zoneF, bays: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Tiers (Levels)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={config.zoneF.levels}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneF: { ...config.zoneF, levels: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[9px] text-muted-foreground block">
                    {config.zoneF.levels === 3 ? "A, B, C (3 Tiers)" : `${config.zoneF.levels} Tiers`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Bins / Tier</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={config.zoneF.bins}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        zoneF: { ...config.zoneF, bins: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Summary & Inventory Action Settings */}
            <div className="flex flex-col gap-3.5 p-4 rounded-xl border bg-muted/40">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Total Locations To Generate:
                  </span>
                </div>
                <span className="font-mono font-bold text-sm text-primary">
                  {grandTotal} Storage Bins
                </span>
              </div>

              {/* 3 Explicit Inventory Modes */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Inventory Handling Policy:
                </span>

                {/* Option 1: Preserve (Default Safe) */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="inventoryAction"
                    value="preserve"
                    checked={inventoryAction === "preserve"}
                    onChange={() => setInventoryAction("preserve")}
                    className="mt-0.5 text-primary focus:ring-primary size-4"
                  />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Preserve Real Inventory (Safe & Default)</span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Never deletes real inventory. Any items in deprecated/resized racks will be safely re-routed.
                    </span>
                  </div>
                </label>

                {/* Option 2: Seed Demo Data */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="inventoryAction"
                    value="seed"
                    checked={inventoryAction === "seed"}
                    onChange={() => setInventoryAction("seed")}
                    className="mt-0.5 text-primary focus:ring-primary size-4"
                  />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Seed Demo Inventory</span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Populates 14 sample SKUs across select bays to test the 2D heatmap and elevation viewer.
                    </span>
                  </div>
                </label>

                {/* Option 3: Wipe All (Dangerous Reset) */}
                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  inventoryAction === "wipe"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                    : "bg-background hover:bg-muted/30"
                }`}>
                  <input
                    type="radio"
                    name="inventoryAction"
                    value="wipe"
                    checked={inventoryAction === "wipe"}
                    onChange={() => setInventoryAction("wipe")}
                    className="mt-0.5 text-rose-500 focus:ring-rose-500 size-4"
                  />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Danger: Factory Reset (Wipe All Inventory)</span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Deletes all inventory ledger records. All 120 rack bays will be reset to 0 units (Empty).
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || fetching}
            className="gap-2 text-xs font-semibold shadow-xs"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Applying Layout & Locations...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Apply & Re-generate Locations</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
