import * as React from "react"
import { getDashboardKpis, getInventoryHealth } from "@/services/dashboard.service"
import { KpiCard } from "@/components/features/dashboard/KpiCard"
import { PickingProgressChart } from "@/components/features/dashboard/PickingProgressChart"
import { InventoryStatusChart } from "@/components/features/dashboard/InventoryStatusChart"
import { Card } from "@/components/ui/card"
import { PackageCheck, Clock, AlertTriangle, Boxes } from "lucide-react"

export default async function DashboardPage() {
  const [kpis, inventoryHealth] = await Promise.all([
    getDashboardKpis(),
    getInventoryHealth(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Real-time operations overview and warehouse KPI monitoring.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Dispatched Today"
          value={kpis.dispatchedCount}
          description="Orders shipped today"
          icon={PackageCheck}
        />
        <KpiCard
          title="Active Picking"
          value={kpis.pickingCount}
          description="Orders currently in progress"
          icon={Clock}
        />
        <KpiCard
          title="Pending Cycle Count"
          value={kpis.cycleCountPending}
          description="Urgent stock audit requests"
          icon={AlertTriangle}
        />
        <KpiCard
          title="Low Stock Alert"
          value={kpis.lowStockCount}
          description="Items below threshold (<10)"
          icon={Boxes}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 p-6">
          <PickingProgressChart />
        </Card>
        <Card className="lg:col-span-3 p-6">
          <InventoryStatusChart data={inventoryHealth} />
        </Card>
      </div>
    </div>
  )
}

