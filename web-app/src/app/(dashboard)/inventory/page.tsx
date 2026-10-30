import * as React from "react"
import { getInventoryList } from "@/services/inventory.service"
import { InventoryTable } from "@/components/features/inventory/InventoryTable"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1
  const limit = typeof params.limit === 'string' ? Math.max(1, parseInt(params.limit, 10) || 20) : 20
  const search = typeof params.search === 'string' ? params.search : ''
  const zone = typeof params.zone === 'string' ? params.zone : 'ALL'
  const sortBy = typeof params.sortBy === 'string' ? params.sortBy : undefined
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : params.sortOrder === 'desc' ? 'desc' : undefined
  
  const { data, count, error } = await getInventoryList({
    page,
    limit,
    search,
    zone,
    sortBy,
    sortOrder,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory Status</h2>
        <p className="text-muted-foreground mt-1">
          View and manage the overall inventory status of the warehouse.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : (
        <InventoryTable 
          data={data || []} 
          totalCount={count} 
          currentPage={page}
          pageSize={limit}
        />
      )}
    </div>
  )
}
