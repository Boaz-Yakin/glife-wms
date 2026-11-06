import * as React from "react"
import { getTenantAuditLogs } from "@/services/audit-log.service"
import { getTenantSubscription } from "@/services/billing.service"
import { canAccessFeature } from "@/lib/billing/plans"
import { AuditLogsClient } from "@/components/features/audit-logs/AuditLogsClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Audit Logs | Glife WMS Enterprise",
  description: "전사 불변 보안 감사 로그 및 ISO-27001 규정 준수 보고서",
}

export default async function AuditLogsPage() {
  const [{ logs, totalCount }, { subscription }] = await Promise.all([
    getTenantAuditLogs({ limit: 50 }),
    getTenantSubscription(),
  ])

  const planTier = subscription?.plan_tier || "PRO"
  const isFeatureAllowed = canAccessFeature(planTier, "AUDIT_LOGS")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security Audit Logs</h2>
        <p className="text-muted-foreground mt-1">
          재고 조정, 주문 상태 변경, 마스터 삭제 등 작업자의 전수 보안 행위를 불변 감사 원장에 기록하고 추적합니다.
        </p>
      </div>

      <AuditLogsClient
        initialLogs={logs}
        totalCount={totalCount}
        isFeatureLocked={!isFeatureAllowed}
        currentPlanTier={planTier}
      />
    </div>
  )
}
