import * as React from "react"
import { getOrders } from "@/services/orders.service"
import { getClients } from "@/services/master.service"
import { OrdersTable } from "@/components/features/orders/OrdersTable"

export const dynamic = "force-dynamic"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10)) : 1
  const limit = typeof params.limit === 'string' ? Math.max(10, parseInt(params.limit, 10)) : 50
  const search = typeof params.search === 'string' ? params.search : ''
  const status = typeof params.status === 'string' && params.status !== 'ALL' ? params.status : ''
  
  const [{ data, count, error }, { data: clients }] = await Promise.all([
    getOrders({
      page,
      limit,
      search,
      status
    }),
    getClients(),
  ])

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
        <OrdersTable 
          data={data || []} 
          totalCount={count || 0}
          currentPage={page}
          pageSize={limit}
          clients={clients || []}
        />
      )}
    </div>
  )
}
