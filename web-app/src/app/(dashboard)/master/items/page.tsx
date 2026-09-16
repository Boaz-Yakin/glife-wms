import * as React from "react"
import { getItems, getPartners } from "@/services/master.service"
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

  const { data: partners } = await getPartners()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Item (SKU) Master</h2>
        <p className="text-muted-foreground mt-1">
          View and manage all product items registered in the warehouse.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : (
        <ItemsTable data={data || []} totalCount={count} partners={partners || []} />
      )}
    </div>
  )
}
