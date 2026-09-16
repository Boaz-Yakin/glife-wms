import * as React from "react"
import { getLocations } from "@/services/master.service"
import { LocationsTable } from "@/components/features/master/LocationsTable"

export default async function MasterLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : ''
  
  const { data, error } = await getLocations({ search })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Location Master</h2>
        <p className="text-muted-foreground mt-1">
          View and manage warehouse zones and rack structure data.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : (
        <LocationsTable data={data || []} />
      )}
    </div>
  )
}
