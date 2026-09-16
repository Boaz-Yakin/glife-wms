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
        <h2 className="text-2xl font-bold tracking-tight">Orders Status</h2>
        <p className="text-muted-foreground mt-1">
          Manage the picking and dispatch status of orders currently being processed.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : (
        <OrdersTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
