import * as React from "react"
import { getTenantApiKeys, getTenantWebhooks } from "@/services/developer.service"
import { getTenantSubscription } from "@/services/billing.service"
import { canAccessFeature } from "@/lib/billing/plans"
import { DeveloperSettingsClient } from "@/components/features/developer/DeveloperSettingsClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Developer & Open API | Glife WMS",
  description: "Headless WMS Open REST API 및 실시간 이벤트 Webhook 연동 콘솔",
}

export default async function DeveloperSettingsPage() {
  const [
    { keys, error: keysErr },
    { webhooks, error: whErr },
    { subscription },
  ] = await Promise.all([
    getTenantApiKeys(),
    getTenantWebhooks(),
    getTenantSubscription(),
  ])

  const planTier = subscription?.plan_tier || "PRO"
  const isFeatureAllowed = canAccessFeature(planTier, "OPEN_API_AND_WEBHOOKS")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Developer & Open API</h2>
        <p className="text-muted-foreground mt-1">
          외부 ERP(SAP, 더존 등) 및 자체 쇼핑몰과 Headless WMS 엔진을 직접 연동하기 위한 REST API 키와 실시간 Webhook을 관리합니다.
        </p>
      </div>

      <DeveloperSettingsClient
        initialKeys={keys}
        initialWebhooks={webhooks}
        isFeatureLocked={!isFeatureAllowed}
        currentPlanTier={planTier}
      />
    </div>
  )
}
