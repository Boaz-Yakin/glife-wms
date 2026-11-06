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
  Users,
  Package,
  Gauge,
  TrendingUp,
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
import { UsageMeteringSummary } from "@/services/usage-meter.service"
import { PLANS, PlanTier } from "@/lib/billing/plans"
import { changePlanServerAction } from "@/app/(dashboard)/settings/billing/actions"

interface BillingDashboardClientProps {
  subscription: TenantSubscription
  invoices: BillingInvoice[]
  usage?: UsageMeteringSummary | null
}

export function BillingDashboardClient({
  subscription,
  invoices,
  usage,
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

      {/* ── 2. WMS Resource Metering & Overage Widget ── */}
      {usage && (
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  WMS 핵심 자원 실시간 미터링 (Resource Metering & Overage)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  플랜 기본 제공 한도를 초과하여 사용한 물류 자원은 익월 인보이스에 종량제로 합산 청구됩니다. (카카오 등 외부 부가비용 0원)
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
                당월 정산 기준: {usage.periodMonth}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Metric 1: Worker Seats */}
              <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">현장 작업자 / PDA 계정 (Seats)</h4>
                      <p className="text-[11px] text-muted-foreground">
                        기본 초과 시 1인당 월 ${usage.seatUnitPrice}
                      </p>
                    </div>
                  </div>
                  {usage.seatOverage > 0 ? (
                    <Badge variant="destructive" className="text-[11px] font-bold">
                      +{usage.seatOverage}명 초과 (+${usage.seatOverageCharge}/월)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-medium">
                      한도 내 정상 이용 중
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">현재 활성 계정:</span>
                    <span className="font-bold text-foreground">
                      {usage.activeSeats}명 / {usage.maxSeats === -1 ? "무제한" : `${usage.maxSeats}명`}
                    </span>
                  </div>
                  {usage.maxSeats !== -1 && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          usage.seatOverage > 0
                            ? "bg-rose-500"
                            : (usage.activeSeats / usage.maxSeats) >= 0.8
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((usage.activeSeats / usage.maxSeats) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Metric 2: Monthly Orders */}
              <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">당월 주문 처리량 (Monthly Orders)</h4>
                      <p className="text-[11px] text-muted-foreground">
                        기본 초과 시 건당 ${usage.orderUnitPrice}
                      </p>
                    </div>
                  </div>
                  {usage.orderOverage > 0 ? (
                    <Badge variant="destructive" className="text-[11px] font-bold">
                      +{usage.orderOverage}건 초과 (+${usage.orderOverageCharge})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-medium">
                      한도 내 정상 이용 중
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">당월 처리 건수:</span>
                    <span className="font-bold text-foreground">
                      {usage.monthlyOrders.toLocaleString()}건 / {usage.maxOrders === -1 ? "무제한" : `${usage.maxOrders.toLocaleString()}건`}
                    </span>
                  </div>
                  {usage.maxOrders !== -1 && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          usage.orderOverage > 0
                            ? "bg-rose-500"
                            : (usage.monthlyOrders / usage.maxOrders) >= 0.8
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((usage.monthlyOrders / usage.maxOrders) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Next Invoice Estimated Summary Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">다음 결제 주기 예상 청구 금액 (Estimated Invoice)</h4>
                  <p className="text-[11px] text-slate-400">
                    기본 플랜료(${usage.basePrice}) + 계정 초과(${usage.seatOverageCharge}) + 주문 초과(${usage.orderOverageCharge})
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 self-end sm:self-auto font-mono">
                <span className="text-xs text-slate-400">합산 예상:</span>
                <span className="text-xl font-black text-emerald-400">
                  ${usage.totalEstimatedBill}
                </span>
                <span className="text-[11px] text-slate-400">/월</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 3. Pricing Tier Comparison ── */}
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
