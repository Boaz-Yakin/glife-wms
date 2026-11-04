import * as React from "react"
import { getTenantSubscription, getBillingInvoices } from "@/services/billing.service"
import { BillingDashboardClient } from "@/components/features/billing/BillingDashboardClient"

export const dynamic = "force-dynamic"

export default async function BillingSettingsPage() {
  const [{ subscription, error: subErr }, { invoices, error: invErr }] = await Promise.all([
    getTenantSubscription(),
    getBillingInvoices(),
  ])

  if (subErr || !subscription) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
        구독 정보를 불러올 수 없습니다: {subErr || "알 수 없는 오류"}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground mt-1">
          B2B SaaS 테넌트 요금제 플랜을 관리하고 결제 주기 및 인보이스 영수증을 확인합니다.
        </p>
      </div>

      <BillingDashboardClient
        subscription={subscription}
        invoices={invoices}
      />
    </div>
  )
}
