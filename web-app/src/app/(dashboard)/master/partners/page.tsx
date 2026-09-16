import * as React from "react"
import { createClient } from "@/lib/supabase/server"
import { PartnersTable, PartnerData } from "@/components/features/master/PartnersTable"

export default async function MasterPartnersPage() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Partner Master</h2>
        <p className="text-muted-foreground mt-1">
          Manage manufacturers and suppliers for inventory items.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error.message})
        </div>
      ) : (
        <PartnersTable data={(data as PartnerData[]) || []} />
      )}
    </div>
  )
}
