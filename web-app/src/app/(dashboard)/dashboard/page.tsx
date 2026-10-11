import * as React from "react"
import {
  getDashboardKpis,
  getInventoryHealth,
  getHourlyPickingProgress,
  getStorageCapacity,
  getLogistixFlowMetrics,
  DashboardPeriod,
} from "@/services/dashboard.service"
import { KpiCard } from "@/components/features/dashboard/KpiCard"
import { PickingProgressChart } from "@/components/features/dashboard/PickingProgressChart"
import { InventoryStatusChart } from "@/components/features/dashboard/InventoryStatusChart"
import { StorageCapacityChart } from "@/components/features/dashboard/StorageCapacityChart"
import { DashboardPeriodSelector } from "@/components/features/dashboard/DashboardPeriodSelector"
import { WarehouseSelector } from "@/components/features/dashboard/WarehouseSelector"
import { LogistixFlowPanel } from "@/components/features/dashboard/LogistixFlowPanel"
import { Card } from "@/components/ui/card"
import {
  PackageCheck,
  Clock,
  AlertTriangle,
  Boxes,
  DollarSign,
  Warehouse,
} from "lucide-react"

interface DashboardPageProps {
  searchParams: Promise<{
    period?: string
    warehouse?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedParams = await searchParams
  const period = (resolvedParams?.period as DashboardPeriod) || "today"
  const warehouse = resolvedParams?.warehouse || "all"

  const [kpis, inventoryHealth, pickingProgress, storageCapacity, logistixFlow] = await Promise.all([
    getDashboardKpis(period),
    getInventoryHealth(),
    getHourlyPickingProgress(period),
    getStorageCapacity(),
    getLogistixFlowMetrics(warehouse),
  ])

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time operations overview and warehouse KPI monitoring.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WarehouseSelector />
          <DashboardPeriodSelector />
        </div>
      </div>

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

      {/* Phase 2: Operations Flow End-to-End Operational Gateways */}
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
    </div>
  )
}
