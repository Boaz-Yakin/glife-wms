import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { TopHeader } from "@/components/TopHeader"
import { getClients } from "@/services/master.service"
import { getActiveClientAction } from "@/app/actions/client.actions"
import { getCurrentTenant } from "@/lib/tenant/context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: clients } = await getClients()
  const activeClientId = await getActiveClientAction()
  const tenant = await getCurrentTenant()

  return (
    <SidebarProvider>
      <AppSidebar tenant={tenant} />
      <SidebarInset>
        <TopHeader tenant={tenant} clients={clients || []} activeClientId={activeClientId} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
