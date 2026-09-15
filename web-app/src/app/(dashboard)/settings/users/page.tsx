import * as React from "react"
import { getUsers } from "@/services/users.service"
import { UsersTable } from "@/components/features/settings/UsersTable"

export default async function SettingsUsersPage() {
  const { data, error } = await getUsers()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">사용자 계정 관리</h2>
        <p className="text-muted-foreground mt-1">
          WMS 시스템에 접근할 수 있는 작업자 및 관리자 계정을 제어합니다. (ADMIN 전용)
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          데이터를 불러오지 못했습니다. ({error})
        </div>
      ) : (
        <UsersTable data={data || []} />
      )}
    </div>
  )
}
