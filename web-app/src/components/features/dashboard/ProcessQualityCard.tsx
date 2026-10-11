"use client"

import * as React from "react"
import {
  QrCode,
  MapPin,
  ScanBarcode,
  CheckSquare2,
  RefreshCw,
  ChevronRight,
  TrendingUp,
} from "lucide-react"
import { ProcessStageQuality } from "@/services/dashboard.service"

import type { LucideIcon } from "lucide-react"

const STAGE_ICONS: Record<string, LucideIcon> = {
  receiving: QrCode,
  placeSmart: MapPin,
  guidedPick: ScanBarcode,
  packingQc: CheckSquare2,
  cycleCount: RefreshCw,
}

interface ProcessQualityCardProps {
  stage: ProcessStageQuality
  isLast?: boolean
}

export function ProcessQualityCard({ stage, isLast = false }: ProcessQualityCardProps) {
  const StageIcon = STAGE_ICONS[stage.id] || ScanBarcode

  // 상태별 테마
  const statusTheme = {
    optimal: {
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      progressBg: "bg-emerald-500",
      indicator: "text-emerald-500",
    },
    warning: {
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      progressBg: "bg-amber-500",
      indicator: "text-amber-500",
    },
    critical: {
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      progressBg: "bg-rose-500",
      indicator: "text-rose-500",
    },
  }[stage.status]

  return (
    <div className="relative group flex-1 min-w-[130px] p-3 rounded-lg border bg-card/60 hover:bg-card hover:shadow-sm transition-all flex flex-col justify-between">
      {/* Step Header */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            STEP {stage.stepNumber}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border inline-flex items-center ${statusTheme.badge}`}
          >
            {stage.badgeText}
          </span>
        </div>

        {/* Title & Icon */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="p-1 rounded bg-muted/80 text-foreground shrink-0">
            <StageIcon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-foreground truncate">
            {stage.name}
          </span>
        </div>

        {/* Label & Description */}
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-foreground/90">
            {stage.label}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {stage.description}
          </p>
        </div>
      </div>

      {/* Main Metric & Mini Progress Bar */}
      <div className="mt-3 pt-2 border-t border-border/50">
        <div className="flex items-baseline justify-between mb-1">
          <span
            className="text-lg font-black tracking-tight text-foreground font-mono"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {stage.rate}%
          </span>
          <span className="text-[9.5px] font-medium text-muted-foreground" title="벤치마크 기준">
            {stage.benchmark}
          </span>
        </div>

        {/* Thin Progress Line */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusTheme.progressBg}`}
            style={{ width: `${Math.min(100, Math.max(0, stage.rate))}%` }}
          />
        </div>
      </div>

      {/* Connecting Flow Arrow for desktop */}
      {!isLast && (
        <div className="hidden 2xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors pointer-events-none">
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
