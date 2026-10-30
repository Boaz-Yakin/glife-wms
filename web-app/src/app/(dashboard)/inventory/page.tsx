import * as React from "react"
import Link from "next/link"
import { MapPin, Boxes } from "lucide-react"
import { getInventoryList, getItemInventoryList } from "@/services/inventory.service"
import { InventoryTable } from "@/components/features/inventory/InventoryTable"
import { ItemInventoryTable } from "@/components/features/inventory/ItemInventoryTable"
import { cn } from "@/lib/utils"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  const view = params.view === "item" ? "item" : "location"
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1
  const limit = typeof params.limit === "string" ? Math.max(1, parseInt(params.limit, 10) || 20) : 20
  const search = typeof params.search === "string" ? params.search : ""
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : undefined
  const sortOrder = params.sortOrder === "asc" ? "asc" : params.sortOrder === "desc" ? "desc" : undefined

  let locationResult: Awaited<ReturnType<typeof getInventoryList>> | null = null
  let itemResult: Awaited<ReturnType<typeof getItemInventoryList>> | null = null

  if (view === "item") {
    const category = typeof params.category === "string" ? params.category : "ALL"
    itemResult = await getItemInventoryList({
      page,
      limit,
      search,
      category,
      sortBy,
      sortOrder,
    })
  } else {
    const zone = typeof params.zone === "string" ? params.zone : "ALL"
    locationResult = await getInventoryList({
      page,
      limit,
      search,
      zone,
      sortBy,
      sortOrder,
    })
  }

  const error = view === "item" ? itemResult?.error : locationResult?.error

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Status</h2>
          <p className="text-muted-foreground mt-1">
            {view === "item"
              ? "View aggregated warehouse stock totals and rack distribution per item."
              : "View and manage slot-level inventory across individual warehouse locations."}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center rounded-lg bg-muted p-1 text-muted-foreground self-start sm:self-auto border">
          <Link
            href="/inventory?view=location"
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              view === "location"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "hover:text-foreground text-muted-foreground"
            )}
          >
            <MapPin className="h-4 w-4" />
            <span>By Location (위치별)</span>
          </Link>
          <Link
            href="/inventory?view=item"
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              view === "item"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "hover:text-foreground text-muted-foreground"
            )}
          >
            <Boxes className="h-4 w-4" />
            <span>By Item (품목별 총 재고)</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : view === "item" && itemResult ? (
        <ItemInventoryTable
          data={itemResult.data || []}
          totalCount={itemResult.count}
          categories={itemResult.categories}
          currentPage={page}
          pageSize={limit}
        />
      ) : locationResult ? (
        <InventoryTable
          data={locationResult.data || []}
          totalCount={locationResult.count}
          currentPage={page}
          pageSize={limit}
        />
      ) : null}
    </div>
  )
}
