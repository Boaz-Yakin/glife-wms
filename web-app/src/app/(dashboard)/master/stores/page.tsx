import * as React from "react"
import { getStores } from "@/services/stores.service"
import { getClients } from "@/services/master.service"
import { getActiveClientAction } from "@/app/actions/client.actions"
import { StoresTable } from "@/components/features/master/StoresTable"

export const dynamic = "force-dynamic"

export default async function MasterStoresPage() {
  const [storesRes, clientsRes, activeClientId] = await Promise.all([
    getStores({ limit: 100 }),
    getClients(),
    getActiveClientAction(),
  ])

  const stores = storesRes.data || []
  const clients = (clientsRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Store Master</h2>
        <p className="text-muted-foreground mt-1">
          Manage client retail branches, shipping destinations, and store contact details.
        </p>
      </div>

      {storesRes.error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
          Failed to load store data: {storesRes.error}
        </div>
      ) : (
        <StoresTable
          data={stores}
          clients={clients}
          activeClientId={activeClientId}
        />
      )}
    </div>
  )
}
