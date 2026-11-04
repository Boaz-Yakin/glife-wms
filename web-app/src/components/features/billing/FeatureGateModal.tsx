"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Lock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeatureKey, PlanTier, PLANS, getRequiredPlanForFeature } from "@/lib/billing/plans"

export interface FeatureGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureKey: FeatureKey
  featureTitle?: string
  featureDesc?: string
}

export function FeatureGateModal({
  open,
  onOpenChange,
  featureKey,
  featureTitle,
  featureDesc,
}: FeatureGateModalProps) {
  const router = useRouter()
  const requiredPlan = getRequiredPlanForFeature(featureKey)
  const planConfig = PLANS[requiredPlan]

  const handleUpgradeClick = () => {
    onOpenChange(false)
    router.push("/settings/billing")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2 text-blue-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {featureTitle || "상위 플랜 전용 기능"}
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            {featureDesc || "이 기능을 사용하시려면 상위 플랜으로 업그레이드가 필요합니다."}
          </DialogDescription>
        </DialogHeader>

        {/* Plan Upgrade Card */}
        <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white font-bold text-xs">
                {planConfig.name}
              </Badge>
              <span className="text-xs font-semibold text-foreground">
                플랜 이상 지원
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-base text-foreground">
                ${planConfig.priceMonthly.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground">/월</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {planConfig.description}
          </p>

          <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
            <span className="font-semibold text-foreground block text-[11px]">
              주요 포함 혜택:
            </span>
            {planConfig.features.slice(0, 3).map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
          <Button
            onClick={handleUpgradeClick}
            className="w-full bg-blue-600 hover:bg-blue-500 font-bold gap-2"
          >
            지금 플랜 업그레이드하기
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs text-muted-foreground"
          >
            다음에 하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
