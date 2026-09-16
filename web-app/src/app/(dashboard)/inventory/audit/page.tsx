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
        <h2 className="text-2xl font-bold tracking-tight">Inventory Audit History</h2>
        <p className="text-muted-foreground mt-1">
          Check all inventory adjustments and audit histories in the warehouse.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : (
        <AuditTable data={data || []} totalCount={count} />
      )}
    </div>
  )
}
