import * as React from "react"
import { getClients } from "@/services/master.service"
import { getActiveClientAction } from "@/app/actions/client.actions"
import { ClientsTable } from "@/components/features/master/ClientsTable"

export const dynamic = "force-dynamic"

export default async function MasterClientsPage() {
  const [clientsRes, activeClientId] = await Promise.all([
    getClients({ withStats: true }),
    getActiveClientAction(),
  ])

  const clients = clientsRes.data || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">3PL Client Master</h2>
        <p className="text-muted-foreground mt-1">
          Manage 3PL client tenant companies, corporate codes, and operational status for multi-tenant warehousing.
        </p>
      </div>

      {clientsRes.error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
          Failed to load client data: {clientsRes.error}
        </div>
      ) : (
        <ClientsTable data={clients} activeClientId={activeClientId} />
      )}
    </div>
  )
}
