import * as React from "react"
import { getWaves } from "@/services/wave.service"
import { getOrders } from "@/services/orders.service"
import { WaveConsoleTable } from "@/components/features/orders/WaveConsoleTable"

export const dynamic = "force-dynamic"

export default async function WaveOrdersPage() {
  const [wavesRes, pendingOrdersRes] = await Promise.all([
    getWaves({ limit: 100 }),
    getOrders({ status: "PENDING", limit: 100 }),
  ])

  const waves = wavesRes.data || []
  const pendingOrders = pendingOrdersRes.data || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Wave Picking Console</h2>
        <p className="text-muted-foreground mt-1">
          다중 매장 주문을 최적 권역 및 온도대별로 자동 군집화하여 피킹 카트 토트(Pick-to-Tote 1~8)에 분배하는 파동 출고 플래너입니다.
        </p>
      </div>

      {wavesRes.error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
          웨이브 데이터를 불러오지 못했습니다: {wavesRes.error}
        </div>
      ) : (
        <WaveConsoleTable
          waves={waves}
          pendingOrders={pendingOrders}
        />
      )}
    </div>
  )
}
