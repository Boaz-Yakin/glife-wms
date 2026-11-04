"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Receipt,
  Download,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TenantSubscription, BillingInvoice } from "@/services/billing.service"
import { PLANS, PlanTier } from "@/lib/billing/plans"
import { changePlanServerAction } from "@/app/(dashboard)/settings/billing/actions"

interface BillingDashboardClientProps {
  subscription: TenantSubscription
  invoices: BillingInvoice[]
}

export function BillingDashboardClient({
  subscription,
  invoices,
}: BillingDashboardClientProps) {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">(
    subscription.billing_cycle || "MONTHLY"
  )
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const currentPlan = subscription.plan_tier || "PRO"
  const currentPlanConfig = PLANS[currentPlan]

  const handlePlanChange = async (tier: PlanTier) => {
    if (tier === currentPlan && billingCycle === subscription.billing_cycle) {
      return
    }

    if (
      !confirm(
        `요금제를 '${PLANS[tier].name}' (${billingCycle === "ANNUAL" ? "연간" : "월간"}) 플랜으로 변경하시겠습니까?`
      )
    ) {
      return
    }

    setLoadingTier(tier)
    const fd = new FormData()
    fd.append("plan_tier", tier)
    fd.append("billing_cycle", billingCycle)

    const res = await changePlanServerAction(fd)
    setLoadingTier(null)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`성공적으로 '${PLANS[tier].name}' 플랜으로 변경되었습니다.`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-8">
      {/* ── 1. Current Subscription Card ── */}
      <Card className="border-border bg-gradient-to-r from-card to-card/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Badge className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5">
                  CURRENT PLAN
                </Badge>
                <h3 className="text-2xl font-black text-foreground">
                  {currentPlanConfig.name} 플랜
                </h3>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {subscription.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                {currentPlanConfig.description}
              </p>
            </div>

            {/* Next Billing & Card HUD */}
            <div className="flex flex-wrap items-center gap-4 bg-muted/40 border border-border/80 rounded-xl p-4 shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  다음 결제 예정일
                </span>
                <span className="font-mono font-bold text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>

              <div className="h-8 w-[1px] bg-border hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  등록된 결제 수단
                </span>
                <span className="font-mono font-semibold text-xs text-foreground flex items-center gap-1.5 mt-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-foreground" />
                  {subscription.card_info?.card_company || "신용카드"} **** {subscription.card_info?.last4 || "8821"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Pricing Tier Comparison ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">요금제 플랜 변경</h3>
            <p className="text-xs text-muted-foreground">
              귀사의 물류 규모와 필요한 기능에 맞는 플랜을 선택하세요.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === "ANNUAL"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>연간 결제</span>
              <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
                15% 할인
              </Badge>
            </button>
          </div>
        </div>

        {/* 3 Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(Object.keys(PLANS) as PlanTier[]).map((tierKey) => {
            const plan = PLANS[tierKey]
            const isCurrent = currentPlan === tierKey
            const price =
              billingCycle === "ANNUAL"
                ? plan.priceAnnualMonthly
                : plan.priceMonthly

            return (
              <div
                key={tierKey}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                  plan.highlight
                    ? "border-blue-500 shadow-lg shadow-blue-500/5 bg-card ring-1 ring-blue-500/20"
                    : "border-border bg-card"
                } ${isCurrent ? "ring-2 ring-emerald-500/40" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white font-bold text-[10px] tracking-wide uppercase px-3 py-1 rounded-full shadow-xs">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg text-foreground">{plan.name}</h4>
                    {isCurrent && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        현재 이용중
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground min-h-[36px] mb-4">
                    {plan.description}
                  </p>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono text-foreground">
                      ${price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      / 월 {billingCycle === "ANNUAL" && "(연간 청구)"}
                    </span>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2.5 pt-4 border-t border-border/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      포함된 기능 & 제약
                    </span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border/40">
                  <Button
                    onClick={() => handlePlanChange(tierKey)}
                    disabled={isCurrent && billingCycle === subscription.billing_cycle || Boolean(loadingTier)}
                    variant={isCurrent ? "outline" : plan.highlight ? "default" : "secondary"}
                    className={`w-full font-bold text-xs h-10 ${
                      plan.highlight && !isCurrent ? "bg-blue-600 hover:bg-blue-500" : ""
                    }`}
                  >
                    {loadingTier === tierKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      "현재 플랜"
                    ) : (
                      `${plan.name} 플랜으로 변경`
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3. Billing Invoices & Receipts ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">결제 내역 및 인보이스</h3>
            <p className="text-xs text-muted-foreground">
              정기 구독료 및 사용량 합산 청구 내역입니다.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">청구 번호</TableHead>
                <TableHead className="text-xs font-semibold">플랜 등급</TableHead>
                <TableHead className="text-xs font-semibold">결제 일시</TableHead>
                <TableHead className="text-xs font-semibold">기본료</TableHead>
                <TableHead className="text-xs font-semibold">추가 사용량</TableHead>
                <TableHead className="text-xs font-semibold">총 결제액</TableHead>
                <TableHead className="text-xs font-semibold">상태</TableHead>
                <TableHead className="text-right text-xs font-semibold">영수증</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {inv.plan_tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      ${Number(inv.base_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      ${Number(inv.usage_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      ${Number(inv.total_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        {inv.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toast.success(`영수증 다운로드: ${inv.invoice_number}`)}
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                    결제 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
