"use client"

import * as React from "react"
import { WarehouseMapData, RackElevationData } from "@/services/dashboard.service"
import { RackElevationView } from "./RackElevationView"
import { WarehouseStructureModal } from "./WarehouseStructureModal"
import { seedStandardWarehouseLocationsAction } from "@/app/actions/warehouse-layout.actions"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Warehouse,
  MapPin,
  Route,
  Layers,
  ThermometerSnowflake,
  SunMedium,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Settings2,
} from "lucide-react"

interface WarehouseMapViewerProps {
  data: WarehouseMapData
}

export function WarehouseMapViewer({ data }: WarehouseMapViewerProps) {
  const [selectedZone, setSelectedZone] = React.useState<"all" | "A" | "F">("all")
  const [showPickPath, setShowPickPath] = React.useState<boolean>(true)
  const [selectedRack, setSelectedRack] = React.useState<RackElevationData | null>(null)
  const [isSeeding, setIsSeeding] = React.useState<boolean>(false)
  const [isStructureModalOpen, setIsStructureModalOpen] = React.useState<boolean>(false)

  const handleSeedLocations = async () => {
    setIsSeeding(true)
    try {
      const res = await seedStandardWarehouseLocationsAction()
      if (res.success) {
        toast.success(res.message || "Standard warehouse layout initialized successfully!")
      } else {
        toast.error(res.error || "Failed to initialize warehouse layout.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsSeeding(false)
    }
  }

  // Handle Empty State when no locations are registered in Supabase
  if (!data.hasData || data.totalLocations === 0) {
    return (
      <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center justify-center bg-card">
        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
          <Warehouse className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          No Warehouse Locations Configured
        </h3>
        <p className="text-sm text-muted-foreground max-w-lg mt-2 leading-relaxed">
          The 2D digital floor map visualizes real-time rack occupancy heatmaps, aisle corridors,
          and optimized S-Shape pick paths directly from the PostgreSQL <code>locations</code> and{" "}
          <code>inventory</code> tables. No location bins have been initialized yet.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={handleSeedLocations}
            disabled={isSeeding}
            className="gap-2 font-semibold shadow-xs"
          >
            {isSeeding ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generating Layout Grid...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Initialize Standard Warehouse Grid</span>
              </>
            )}
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl w-full pt-6 border-t">
          <div className="p-3 rounded-lg bg-muted/40 border">
            <span className="text-xs font-semibold text-foreground block">
              Zone A (Ambient)
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              3 Serpentine Aisles × 3 Bay Racks × 4 Tiers (72 Bins)
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border">
            <span className="text-xs font-semibold text-foreground block">
              Zone F (Cold Storage)
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              1 Isolated Chamber × 2 Bay Racks × 4 Tiers (16 Bins)
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border">
            <span className="text-xs font-semibold text-foreground block">
              Path Optimization
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Serpentine S-Shape pick routing from Dock to Dispatch
            </span>
          </div>
        </div>
      </Card>
    )
  }

  // Filter aisles based on selected zone
  const showZoneA = selectedZone === "all" || selectedZone === "A"
  const showZoneF = selectedZone === "all" || selectedZone === "F"

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Map Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
        {/* Left: Zone Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Zone Filter:</span>
          <div className="inline-flex items-center rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedZone("all")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                selectedZone === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Zones ({data.totalRacks} Racks)
            </button>
            <button
              type="button"
              onClick={() => setSelectedZone("A")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                selectedZone === "A"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SunMedium className="h-3.5 w-3.5 text-amber-500" />
              <span>Zone A (Ambient)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedZone("F")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                selectedZone === "F"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ThermometerSnowflake className="h-3.5 w-3.5 text-cyan-500" />
              <span>Zone F (Cold Chamber)</span>
            </button>
          </div>
        </div>

        {/* Right: Pick Path Toggle & Heatmap Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStructureModalOpen(true)}
            className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Structure Settings</span>
          </Button>

          <Button
            variant={showPickPath ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPickPath(!showPickPath)}
            className="gap-1.5 text-xs h-8"
          >
            <Route className="h-3.5 w-3.5" />
            <span>{showPickPath ? "Hide Pick Path" : "Show S-Shape Pick Path"}</span>
          </Button>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-3 text-xs bg-muted/50 px-3 py-1.5 rounded-lg border">
            <span className="text-muted-foreground font-medium text-[11px]">Occupancy:</span>
            <div className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-emerald-500" />
              <span className="text-muted-foreground text-[11px]">&lt;50% Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-amber-500" />
              <span className="text-muted-foreground text-[11px]">50-85% Optimal</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-rose-500" />
              <span className="text-muted-foreground text-[11px]">&gt;85% Congested</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-muted-foreground/30 border border-muted-foreground/40" />
              <span className="text-muted-foreground text-[11px]">Empty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Total Storage Bins</span>
          <span className="text-xl font-bold font-mono text-foreground block mt-1">
            {data.totalLocations.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Across {data.totalRacks} standard rack bays
          </span>
        </div>

        <div className="p-3.5 rounded-xl border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Occupied Rack Bays</span>
          <span className="text-xl font-bold font-mono text-foreground block mt-1">
            {data.occupiedRacks} / {data.totalRacks}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {data.overallOccupancyRate}% Bay Utilization
          </span>
        </div>

        <div className="p-3.5 rounded-xl border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Zone A Utilization</span>
          <span className="text-xl font-bold font-mono text-foreground block mt-1">
            {data.zoneA.rate}%
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {data.zoneA.occupiedRacks} of {data.zoneA.totalRacks} Ambient bays active
          </span>
        </div>

        <div className="p-3.5 rounded-xl border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Zone F (Cold) Utilization</span>
          <span className="text-xl font-bold font-mono text-foreground block mt-1">
            {data.zoneF.rate}%
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {data.zoneF.occupiedRacks} of {data.zoneF.totalRacks} Cold bays active
          </span>
        </div>
      </div>

      {/* 2D Digital Floor Plan Canvas */}
      <Card className="p-6 relative overflow-hidden bg-card border-border/80 shadow-sm">
        {/* Floor Map Layout Container */}
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          {/* 1. NORTH: INBOUND RECEIVING DOCK & STAGING */}
          <div className="relative rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold tracking-tight text-foreground uppercase">
                    Inbound Receiving Dock
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">
                    Gate 01 - 03
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Goods receipt inspection, pallet de-consolidation, and putaway staging
                </p>
              </div>
            </div>

            {/* Inbound staging bays indicators */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded bg-background border text-[11px] font-mono text-muted-foreground font-medium">
                Dock 01: Clear
              </div>
              <div className="px-2.5 py-1 rounded bg-background border text-[11px] font-mono text-muted-foreground font-medium">
                Dock 02: Unloading
              </div>
            </div>
          </div>

          {/* S-Shape Pick Path Visual Indicator Banner */}
          {showPickPath && (
            <div className="px-3.5 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 shrink-0" />
                <span className="font-semibold">
                  Serpentine S-Shape Picking Route Active:
                </span>
                <span className="text-muted-foreground">
                  Traverses Aisle 01 (South to North) ➔ Aisle 02 (North to South) ➔ Aisle 03 (South to North) ➔ Dispatch.
                </span>
              </div>
              <Badge variant="outline" className="border-indigo-500/30 text-[10px]">
                Travel Time Optimized
              </Badge>
            </div>
          )}

          {/* 2. CENTER: STORAGE AISLES & RACK BAYS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Zone A: Ambient Storage Aisles */}
            {showZoneA && (
              <div className="lg:col-span-12 flex flex-col gap-5">
                <div className="flex items-center justify-between pb-1 border-b">
                  <div className="flex items-center gap-2">
                    <SunMedium className="h-4 w-4 text-amber-500" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Zone A — Ambient Storage Aisles
                    </h5>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Click any rack bay to inspect vertical shelf elevation
                  </span>
                </div>

                {/* Render each Aisle in Zone A */}
                <div className="flex flex-col gap-4">
                  {data.zoneA.aisles.map((aisle, aisleIdx) => {
                    const isEvenAisle = aisleIdx % 2 === 1
                    return (
                      <div
                        key={aisle.aisleNumber}
                        className="p-3.5 rounded-xl border bg-muted/20 flex flex-col gap-2 relative"
                      >
                        {/* Aisle Corridor Label & Directional Arrow */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border text-[11px]">
                              Aisle {aisle.aisleNumber.toString().padStart(2, "0")}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {aisle.racks.length} Storage Bays
                            </span>
                          </div>

                          {showPickPath && (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-500 font-medium">
                              <span>Pick Direction:</span>
                              <span className="font-bold">
                                {isEvenAisle ? "North ➔ South ↓" : "South ➔ North ↑"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Rack Bay Cards in this Aisle: responsive 5 columns for up to 10 bays */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2.5">
                          {aisle.racks.map((rack) => (
                            <RackBayCard
                              key={rack.rackId}
                              rack={rack}
                              onSelect={() => setSelectedRack(rack)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Zone F: Cold Storage Chamber */}
            {showZoneF && (
              <div className="lg:col-span-12 p-4 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/5 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <ThermometerSnowflake className="h-4 w-4 text-cyan-500" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Zone F — Cold Storage Chamber
                      </h5>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                        -18°C ~ 4°C Controlled
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-cyan-500/30 text-[10px] text-cyan-600">
                    Air Curtain Seal
                  </Badge>
                </div>

                <div className="flex flex-col gap-3">
                  {data.zoneF.aisles.map((aisle) => (
                    <div key={aisle.aisleNumber} className="flex flex-col gap-2">
                      <span className="text-[11px] font-mono font-medium text-muted-foreground">
                        Chamber Aisle {aisle.aisleNumber.toString().padStart(2, "0")} • {aisle.racks.length} Storage Bays
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {aisle.racks.map((rack) => (
                          <RackBayCard
                            key={rack.rackId}
                            rack={rack}
                            onSelect={() => setSelectedRack(rack)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. SOUTH: OUTBOUND DISPATCH & PACKING BAY */}
          <div className="relative rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold tracking-tight text-foreground uppercase">
                    Outbound Dispatch Bay & Packing Station
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                    SLA Buffer Zone
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order packing, dispatch QC validation, carrier handover, and shipping manifest generation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded bg-background border text-[11px] font-mono text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                <span>Ready for Shippers</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Interactive Rack Elevation Drawer / Modal */}
      <RackElevationView
        rack={selectedRack}
        open={!!selectedRack}
        onClose={() => setSelectedRack(null)}
      />

      {/* Warehouse Structure Configuration Modal */}
      <WarehouseStructureModal
        open={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}

function RackBayCard({
  rack,
  onSelect,
}: {
  rack: RackElevationData
  onSelect: () => void
}) {
  const getStatusColor = () => {
    switch (rack.status) {
      case "congested":
        return "border-rose-500/40 bg-rose-500/10 hover:border-rose-500 hover:shadow-rose-500/10"
      case "optimal":
        return "border-amber-500/40 bg-amber-500/10 hover:border-amber-500 hover:shadow-amber-500/10"
      case "available":
        return "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500 hover:shadow-emerald-500/10"
      default:
        return "border-border/80 bg-card hover:border-primary/50"
    }
  }

  const getStatusDot = () => {
    switch (rack.status) {
      case "congested":
        return "bg-rose-500"
      case "optimal":
        return "bg-amber-500"
      case "available":
        return "bg-emerald-500"
      default:
        return "bg-muted-foreground/40"
    }
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col justify-between p-3 rounded-lg border text-left transition-all cursor-pointer shadow-xs hover:shadow-md ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${getStatusDot()}`} />
          <span className="font-mono font-bold text-xs text-foreground group-hover:text-primary transition-colors">
            {rack.rackCode}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Bay {rack.bayNumber.toString().padStart(2, "0")}
        </span>
      </div>

      {/* Occupancy progress bar */}
      <div className="my-2.5 w-full">
        <div className="flex items-center justify-between text-[10px] mb-1 text-muted-foreground">
          <span>Occupancy</span>
          <span className="font-mono font-semibold text-foreground">
            {rack.occupancyPercent}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              rack.occupancyPercent > 85
                ? "bg-rose-500"
                : rack.occupancyPercent >= 50
                ? "bg-amber-500"
                : rack.occupancyPercent > 0
                ? "bg-emerald-500"
                : "bg-transparent"
            }`}
            style={{ width: `${Math.min(100, rack.occupancyPercent)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between w-full text-[11px] pt-1.5 border-t border-border/40 text-muted-foreground">
        <span>{rack.totalUnits.toLocaleString()} units</span>
        <span className="text-[10px] font-medium group-hover:text-foreground flex items-center gap-0.5">
          <span>Elevation</span>
          <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </div>
    </button>
  )
}
