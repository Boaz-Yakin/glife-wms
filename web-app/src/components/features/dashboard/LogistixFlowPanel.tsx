"use client"

import * as React from "react"
import { Activity, ShieldCheck, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LogistixFlowMetrics } from "@/services/dashboard.service"
import { DockToStockGauge } from "./DockToStockGauge"
import { ProcessQualityCard } from "./ProcessQualityCard"

interface LogistixFlowPanelProps {
  metrics: LogistixFlowMetrics
}

export function LogistixFlowPanel({ metrics }: LogistixFlowPanelProps) {
  const stageList = [
    metrics.stages.receiving,
    metrics.stages.placeSmart,
    metrics.stages.guidedPick,
    metrics.stages.packingQc,
    metrics.stages.cycleCount,
  ]

  return (
    <Card className="p-4 sm:p-5 border-border/80 bg-gradient-to-b from-card to-card/70 shadow-xs">
      {/* Panel Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-600 text-white shadow-xs">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                LogistiX Flow™
              </h3>
              <span className="text-xs text-muted-foreground font-normal">
                엔드투엔드 공정 실시간 관제탑 (Dock to Dispatch)
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <ShieldCheck className="h-3 w-3" />
                Live SLA
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time Connected
          </span>
          <span className="text-border">|</span>
          <span>동기화: {metrics.lastUpdated}</span>
        </div>
      </div>

      {/* Main Grid: Left Gauge (4 cols) & Right 5-Stage Process (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Dock-to-Stock Gauge */}
        <div className="lg:col-span-4 xl:col-span-3 p-4 rounded-xl border bg-muted/20 dark:bg-muted/10 flex flex-col justify-between">
          <DockToStockGauge
            minutes={metrics.dockToStock.minutes}
            targetMinutes={metrics.dockToStock.targetMinutes}
            status={metrics.dockToStock.status}
            badgeText={metrics.dockToStock.badgeText}
            benchmarkText={metrics.dockToStock.benchmarkText}
          />
        </div>

        {/* Right: 5 Process Stage Quality Cards */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 h-full">
            {stageList.map((stage, idx) => (
              <ProcessQualityCard
                key={stage.id}
                stage={stage}
                isLast={idx === stageList.length - 1}
              />
            ))}
          </div>

          <div className="mt-2.5 px-3 py-1.5 rounded-md bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-1">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>
                <strong>무종이 2D 가이드 및 실시간 스캔 검수:</strong> 현장 결품(`CMD-SKIP`) 및 실사 오차 자동 감지 적용 중
              </span>
            </span>
            <span className="font-medium text-foreground">
              산업 상위 10% 벤치마크 (WERC/3DLogistiX) 준수
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
