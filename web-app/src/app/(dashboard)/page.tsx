import { getDashboardKpis } from "@/services/dashboard.service"
import { KpiCard } from "@/components/features/dashboard/KpiCard"
import { PickingProgressChart } from "@/components/features/dashboard/PickingProgressChart"
import { InventoryStatusChart } from "@/components/features/dashboard/InventoryStatusChart"
import { Package, Truck, AlertTriangle, Activity } from "lucide-react"

export default async function DashboardPage() {
  const kpis = await getDashboardKpis()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          View key warehouse metrics in real-time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Dispatched Today"
          value={`${kpis.dispatchedCount} orders`}
          icon={Truck}
          description="Total orders dispatched today"
        />
        <KpiCard
          title="Picking in Progress"
          value={`${kpis.pickingCount} orders`}
          icon={Activity}
          description="Currently picking in warehouse"
        />
        <KpiCard
          title="Urgent Audit Pending"
          value={`${kpis.cycleCountPending} requests`}
          icon={AlertTriangle}
          description="Audit requests from the floor"
        />
        <KpiCard
          title="Low Stock Items"
          value={`${kpis.lowStockCount} items`}
          icon={Package}
          description="Items with less than 10 available"
        />
      </div>
      
      {/* Chart Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <PickingProgressChart />
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <InventoryStatusChart />
        </div>
      </div>
    </div>
  )
}
