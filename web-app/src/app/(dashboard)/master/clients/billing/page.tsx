import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAllClientsMonthlyOverview } from "@/services/three-pl-billing.service"
import { ThreePlBillingClient } from "@/components/features/master/ThreePlBillingClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "3PL Logistics Billing | Glife WMS",
  description: "3PL 다중 화주사 일일 파렛트/CBM 보관료 및 입출고 작업비 자동 정산 콘솔",
}

export default async function ThreePlBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const now = new Date()
  const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const { summaries, error } = await getAllClientsMonthlyOverview(currentMonth)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/master/clients">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
                화주사 목록
              </Button>
            </Link>
          </div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-600" />
            3PL 다중 화주 물류비 정산 콘솔
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            화주사별 상온/저온 파렛트 점유율(자정 스냅샷)과 일별 입출고 하역·피킹 실적을 자동 집계하여 월간 명세서를 발행합니다.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
          정산 데이터를 불러올 수 없습니다: {error}
        </div>
      ) : (
        <ThreePlBillingClient
          initialSummaries={summaries}
          currentMonth={currentMonth}
        />
      )}
    </div>
  )
}
