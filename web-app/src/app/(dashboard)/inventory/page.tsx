import * as React from "react"
import { getInventoryList } from "@/services/inventory.service"
import { InventoryTable } from "@/components/features/inventory/InventoryTable"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const search = typeof params.search === 'string' ? params.search : ''
  const zone = typeof params.zone === 'string' ? params.zone : 'ALL'
  
  const { data, count, error } = await getInventoryList({
    page,
    limit: 20,
    search,
    zone
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">재고 현황</h2>
        <p className="text-muted-foreground mt-1">
          현재 창고의 전체 재고 현황을 조회하고 관리합니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          데이터를 불러오지 못했습니다. ({error})
        </div>
      ) : (
        <InventoryTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
