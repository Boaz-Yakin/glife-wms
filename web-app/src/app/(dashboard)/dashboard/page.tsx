import * as React from "react"
import {
  getDashboardKpis,
  getInventoryHealth,
  getHourlyPickingProgress,
  getStorageCapacity,
  getLogistixFlowMetrics,
  getInventoryIntelligenceData,
  getExpirationRiskMetrics,
  getWarehouseMapData,
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
import { ExpirationAlertCard } from "@/components/features/dashboard/ExpirationAlertCard"
import { WarehouseMapViewer } from "@/components/features/dashboard/WarehouseMapViewer"
import { Card } from "@/components/ui/card"
import {
  PackageCheck,
  Clock,
  AlertTriangle,
  Boxes,
  DollarSign,
  Warehouse,
  TrendingDown,
  ShoppingCart,
  Layers,
  CalendarClock,
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
  const isOperationsTab = tab === "operations"
  const isIntelligenceTab = tab === "intelligence"
  const isMapTab = tab === "map"

  const [
    kpis,
    inventoryHealth,
    pickingProgress,
    storageCapacity,
    logistixFlow,
    intelligenceData,
    expirationData,
    warehouseMapData,
  ] = await Promise.all([
    isOperationsTab ? getDashboardKpis(period) : null,
    isOperationsTab ? getInventoryHealth() : null,
    isOperationsTab ? getHourlyPickingProgress(period) : null,
    isOperationsTab ? getStorageCapacity() : null,
    isOperationsTab ? getLogistixFlowMetrics(warehouse) : null,
    isIntelligenceTab ? getInventoryIntelligenceData() : null,
    isIntelligenceTab ? getExpirationRiskMetrics() : null,
    isMapTab ? getWarehouseMapData() : null,
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
          {isOperationsTab && <WarehouseSelector />}
          {isOperationsTab && <DashboardPeriodSelector />}
        </div>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <DashboardTabNav />

      {/* TAB 1: OPERATIONS (Real-time Flow & Fulfillment) */}
      {isOperationsTab && kpis && logistixFlow && pickingProgress && storageCapacity && inventoryHealth && (
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

      {/* TAB 2: INVENTORY INTELLIGENCE (Dead Stock, Expiration Risk, Reorder & Slotting) */}
      {isIntelligenceTab && intelligenceData && expirationData && (
        <div className="flex flex-col gap-5">
          {/* Top 4 Intelligence Metric Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-border/80 bg-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  FEFO Near-Expiry Risk
                </span>
                <span className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 font-mono block mt-1">
                  {expirationData.criticalCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">Critical (&le;14d)</span>
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {expirationData.warningCount} Lots Warning (15-45d)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <CalendarClock className="h-5 w-5" />
              </div>
            </Card>

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

          {/* 4 Dedicated Intelligence Action Modules in Responsive Grid */}
          <div className="grid gap-5 lg:grid-cols-2">
            <ExpirationAlertCard data={expirationData} />
            <DeadStockCard data={intelligenceData.deadStock} />
            <SmartReorderQueue data={intelligenceData.reorderQueue} />
            <DynamicSlottingCard data={intelligenceData.slotting} />
          </div>
        </div>
      )}

      {/* TAB 3: 2D DIGITAL WAREHOUSE MAP (Phase 4) */}
      {isMapTab && warehouseMapData && (
        <WarehouseMapViewer data={warehouseMapData} />
      )}
    </div>
  )
}

