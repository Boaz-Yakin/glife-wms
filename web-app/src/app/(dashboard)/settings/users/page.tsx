import * as React from "react"
import { getUsers } from "@/services/users.service"
import { UsersTable } from "@/components/features/settings/UsersTable"

export const dynamic = "force-dynamic"

export default async function SettingsUsersPage() {
  const { data, error } = await getUsers()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage worker and administrator accounts for the WMS system. (ADMIN Only)
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          Failed to load data. ({error})
        </div>
      ) : (
        <UsersTable data={data || []} />
      )}
    </div>
  )
}
