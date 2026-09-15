import * as React from "react"
import { getInventoryAudit } from "@/services/audit.service"
import { AuditTable } from "@/components/features/inventory/AuditTable"

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const reason = typeof params.reason === 'string' ? params.reason : 'ALL'
  
  const { data, count, error } = await getInventoryAudit({
    page,
    limit: 20,
    reason
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">재고 변동 이력</h2>
        <p className="text-muted-foreground mt-1">
          창고에서 발생한 모든 재고 조정 및 실사 내역을 확인합니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          데이터를 불러오지 못했습니다. ({error})
        </div>
      ) : (
        <AuditTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
