"use client"

import * as React from "react"
import { Timer, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"
import { QualityStatus } from "@/services/dashboard.service"

interface DockToStockGaugeProps {
  minutes: number
  targetMinutes: number
  status: QualityStatus
  badgeText: string
  benchmarkText: string
}

export function DockToStockGauge({
  minutes,
  targetMinutes = 30,
  status,
  badgeText,
  benchmarkText,
}: DockToStockGaugeProps) {
  // 0 ~ 60분 범위로 게이지 각도 정규화 (180도 반원)
  const maxMinutes = 60
  const clampedMinutes = Math.min(Math.max(minutes, 0), maxMinutes)
  const progressRatio = clampedMinutes / maxMinutes // 0 ~ 1
  const targetRatio = targetMinutes / maxMinutes // 0.5 (30분)

  // 반원 호 둘레 계산 (반지름 r = 75)
  // 반원 호 길이 = PI * r ≈ 235.619
  const radius = 75
  const arcLength = Math.PI * radius
  const strokeDashoffset = arcLength * (1 - progressRatio)

  // 상태별 색상
  const statusColors = {
    optimal: {
      stroke: "#10b981", // emerald-500
      bgBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      icon: CheckCircle2,
    },
    warning: {
      stroke: "#f59e0b", // amber-500
      bgBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: AlertTriangle,
    },
    critical: {
      stroke: "#ef4444", // rose-500
      bgBadge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      icon: AlertCircle,
    },
  }[status]

  const StatusIcon = statusColors.icon

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Timer className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Dock-to-Stock Time</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColors.bgBadge}`}
        >
          <StatusIcon className="h-3 w-3" />
          {badgeText}
        </span>
      </div>

      {/* SVG Semi-Circle Gauge */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <svg viewBox="0 0 200 115" className="w-full max-w-[210px] overflow-visible">
          {/* Background Arc (180 deg) */}
          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            className="text-muted/40 dark:text-muted/25"
          />

          {/* Progress Arc */}
          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke={statusColors.stroke}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />

          {/* Target 30m Marker (Top center at 90 deg) */}
          <line
            x1="100"
            y1="13"
            x2="100"
            y2="25"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="2 2"
            className="text-muted-foreground/60"
          />

          {/* Center Value Text */}
          <text
            x="100"
            y="82"
            textAnchor="middle"
            className="fill-foreground text-3xl font-black tracking-tight"
            style={{ fontSize: "28px", fontWeight: "800", fontVariantNumeric: "tabular-nums" }}
          >
            {minutes}
            <tspan dx="3" dy="-4" className="text-xs font-medium fill-muted-foreground" style={{ fontSize: "12px" }}>
              min
            </tspan>
          </text>

          {/* Target Label below number */}
          <text
            x="100"
            y="98"
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] font-medium"
            style={{ fontSize: "9.5px" }}
          >
            Target: &le;{targetMinutes}m
          </text>
        </svg>

        {/* Axis Scale Labels */}
        <div className="flex w-full max-w-[210px] justify-between text-[10px] font-medium text-muted-foreground px-4 -mt-2">
          <span>0m</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">30m (Target)</span>
          <span>60m+</span>
        </div>
      </div>

      {/* Footer Benchmark Note */}
      <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
        <span>차량 하차 ➔ 랙 적치 완료</span>
        <span className="font-semibold text-foreground">{benchmarkText}</span>
      </div>
    </div>
  )
}
