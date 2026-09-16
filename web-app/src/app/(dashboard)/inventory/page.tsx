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
        <InventoryTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
