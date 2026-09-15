import * as React from "react"
import { getOrdersList } from "@/services/orders.service"
import { OrdersTable } from "@/components/features/orders/OrdersTable"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const status = typeof params.status === 'string' ? params.status : 'ALL'
  
  const { data, count, error } = await getOrdersList({
    page,
    limit: 20,
    status
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">주문 현황</h2>
        <p className="text-muted-foreground mt-1">
          현재 처리 중인 주문의 피킹 및 출고 상태를 관리합니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          데이터를 불러오지 못했습니다. ({error})
        </div>
      ) : (
        <OrdersTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
