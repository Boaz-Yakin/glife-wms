import * as React from "react"
import {
  getDashboardKpis,
  getInventoryHealth,
  getHourlyPickingProgress,
  getStorageCapacity,
  getLogistixFlowMetrics,
  getInventoryIntelligenceData,
  DashboardPeriod,
} from "@/services/dashboard.service"
import { KpiCard } from "@/components/features/dashboard/KpiCard"
import { PickingProgressChart } from "@/components/features/dashboard/PickingProgressChart"
import { InventoryStatusChart } from "@/components/features/dashboard/InventoryStatusChart"
import { StorageCapacityChart } from "@/components/features/dashboard/StorageCapacityChart"
import { DashboardPeriodSelector } from "@/components/features/dashboard/DashboardPeriodSelector"
import { WarehouseSelector } from "@/components/features/dashboard/WarehouseSelector"
import { LogistixFlowPanel } from "@/components/features/dashboard/LogistixFlowPanel"
import { DashboardTabNav, DashboardTab } from "@/components/features/dashboard/DashboardTabNav"
import { DeadStockCard } from "@/components/features/dashboard/DeadStockCard"
import { SmartReorderQueue } from "@/components/features/dashboard/SmartReorderQueue"
import { DynamicSlottingCard } from "@/components/features/dashboard/DynamicSlottingCard"
import { Card } from "@/components/ui/card"
import {
  PackageCheck,
  Clock,
  AlertTriangle,
  Boxes,
  DollarSign,
  Warehouse,
  MapPin,
  TrendingDown,
  ShoppingCart,
  Layers,
} from "lucide-react"

interface DashboardPageProps {
  searchParams: Promise<{
    period?: string
    warehouse?: string
    tab?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedParams = await searchParams
  const period = (resolvedParams?.period as DashboardPeriod) || "today"
  const warehouse = resolvedParams?.warehouse || "all"
  const tab = (resolvedParams?.tab as DashboardTab) || "operations"

  // Fetch only what is needed for the active tab (or in parallel)
  const isIntelligenceTab = tab === "intelligence"
  const isMapTab = tab === "map"

  const [
    kpis,
    inventoryHealth,
    pickingProgress,
    storageCapacity,
    logistixFlow,
    intelligenceData,
  ] = await Promise.all([
    !isIntelligenceTab ? getDashboardKpis(period) : null,
    !isIntelligenceTab ? getInventoryHealth() : null,
    !isIntelligenceTab ? getHourlyPickingProgress(period) : null,
    !isIntelligenceTab ? getStorageCapacity() : null,
    !isIntelligenceTab ? getLogistixFlowMetrics(warehouse) : null,
    isIntelligenceTab ? getInventoryIntelligenceData() : null,
  ])

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title and Global Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Operational gateways, fulfillment SLA tracking, and stock intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WarehouseSelector />
          {!isIntelligenceTab && <DashboardPeriodSelector />}
        </div>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <DashboardTabNav />

      {/* TAB 1: OPERATIONS (Real-time Flow & Fulfillment) */}
      {tab === "operations" && kpis && logistixFlow && pickingProgress && storageCapacity && inventoryHealth && (
        <>
          {/* 6 Core KPI Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title="Total Inventory Value"
              value={kpis.inventoryValueFormatted}
              description="Active on-hand valuation"
              icon={DollarSign}
              trend={kpis.inventoryValueTrend}
            />
            <KpiCard
              title="Storage Utilisation"
              value={kpis.storageUtilisationFormatted}
              description={`${kpis.storageOccupiedBins} / ${kpis.storageTotalBins} Bins in use`}
              icon={Warehouse}
              trend={
                kpis.storageUtilisationRate >= 85
                  ? { value: "High Load", isPositive: false }
                  : undefined
              }
            />
            <KpiCard
              title="Dispatched"
              value={kpis.dispatchedCount}
              description={`Orders completed (${period})`}
              icon={PackageCheck}
              trend={kpis.dispatchedTrend}
            />
            <KpiCard
              title="Active Picking"
              value={kpis.pickingCount}
              description="Orders currently in progress"
              icon={Clock}
            />
            <KpiCard
              title="Low Stock Alert"
              value={kpis.lowStockCount}
              description="Items below threshold (<10)"
              icon={Boxes}
            />
            <KpiCard
              title="Pending Audit"
              value={kpis.cycleCountPending}
              description="Urgent stock audit requests"
              icon={AlertTriangle}
            />
          </div>

          {/* Operations Flow: 3 Distinct Tracks */}
          <LogistixFlowPanel metrics={logistixFlow} />

          {/* Core Operational Charts Grid */}
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-6 p-6">
              <PickingProgressChart data={pickingProgress} />
            </Card>
            <Card className="lg:col-span-3 p-6">
              <StorageCapacityChart data={storageCapacity} />
            </Card>
            <Card className="lg:col-span-3 p-6">
              <InventoryStatusChart data={inventoryHealth} />
            </Card>
          </div>
        </>
      )}

      {/* TAB 2: INVENTORY INTELLIGENCE (Phase 3: Dead Stock & Smart Reorder) */}
      {isIntelligenceTab && intelligenceData && (
        <div className="flex flex-col gap-5">
          {/* Top 3 Intelligence Metric Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 border-border/80 bg-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Dead Stock Value (60+ Days)
                </span>
                <span className="text-2xl font-black tracking-tight text-foreground font-mono block mt-1">
                  {intelligenceData.deadStock.formattedDeadStockValue}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {intelligenceData.deadStock.deadStockQty.toLocaleString()} units stagnant
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 border-border/80 bg-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Replenishment Capital Needed
                </span>
                <span className="text-2xl font-black tracking-tight text-foreground font-mono block mt-1">
                  {intelligenceData.reorderQueue.formattedEstimatedCost}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Across {intelligenceData.reorderQueue.totalItemsToReorder} low-stock SKUs
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 border-border/80 bg-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Slotting Relocation Proposals
                </span>
                <span className="text-2xl font-black tracking-tight text-foreground font-mono block mt-1">
                  {intelligenceData.slotting.totalRecommendations} Racks
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Optimized for picking travel time
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* 3 Dedicated Intelligence Action Modules */}
          <div className="grid gap-5 lg:grid-cols-3">
            <DeadStockCard data={intelligenceData.deadStock} />
            <SmartReorderQueue data={intelligenceData.reorderQueue} />
            <DynamicSlottingCard data={intelligenceData.slotting} />
          </div>
        </div>
      )}

      {/* TAB 3: 2D WAREHOUSE MAP (Phase 4 Placeholder) */}
      {isMapTab && (
        <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center justify-center">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3">
            <MapPin className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            2D Digital Warehouse Layout Map
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Interactive top-down floor map and rack elevation views are scheduled for{" "}
            <strong>Phase 4</strong>. Real-time rack occupancy heatmaps and aisle traffic monitoring will be rendered here.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border">
            <span>SVG / Canvas 60fps Lightweight Engine</span>
          </div>
        </Card>
      )}
    </div>
  )
}
