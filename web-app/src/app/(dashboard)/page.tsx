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
        <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
        <p className="text-muted-foreground mt-1">
          현재 창고의 주요 현황을 실시간으로 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="금일 출고 완료"
          value={`${kpis.dispatchedCount} 건`}
          icon={Truck}
          description="오늘 처리된 총 출고 건수"
        />
        <KpiCard
          title="진행 중 피킹"
          value={`${kpis.pickingCount} 건`}
          icon={Activity}
          description="현재 창고 내 피킹 진행 중"
        />
        <KpiCard
          title="긴급 실사 대기"
          value={`${kpis.cycleCountPending} 건`}
          icon={AlertTriangle}
          description="현장에서 접수된 실사 요청"
        />
        <KpiCard
          title="재고 부족 품목"
          value={`${kpis.lowStockCount} 개`}
          icon={Package}
          description="가용 재고 10개 미만 품목"
        />
      </div>
      
      {/* 차트 섹션 (3-B) */}
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
