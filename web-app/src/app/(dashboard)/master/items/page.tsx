import * as React from "react"
import { getItems } from "@/services/master.service"
import { ItemsTable } from "@/components/features/master/ItemsTable"

export default async function MasterItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const search = typeof params.search === 'string' ? params.search : ''
  
  const { data, count, error } = await getItems({
    page,
    limit: 20,
    search
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">상품(SKU) 마스터 관리</h2>
        <p className="text-muted-foreground mt-1">
          물류 창고에 등록된 모든 상품 정보를 조회하고 관리합니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          데이터를 불러오지 못했습니다. ({error})
        </div>
      ) : (
        <ItemsTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
