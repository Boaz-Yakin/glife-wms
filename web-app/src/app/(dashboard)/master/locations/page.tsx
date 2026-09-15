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
        <h2 className="text-2xl font-bold tracking-tight">로케이션 마스터 관리</h2>
        <p className="text-muted-foreground mt-1">
          창고 내 구역 및 랙(Rack) 구조 데이터를 조회하고 추가합니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          데이터를 불러오지 못했습니다. ({error})
        </div>
      ) : (
        <LocationsTable data={data || []} />
      )}
    </div>
  )
}
