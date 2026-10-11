"use client"

import * as React from "react"
import { Activity, ShieldCheck, Zap, ArrowDownToLine, Truck, RotateCcw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LogistixFlowMetrics } from "@/services/dashboard.service"
import { DockToStockGauge } from "./DockToStockGauge"
import { ProcessQualityCard } from "./ProcessQualityCard"

interface LogistixFlowPanelProps {
  metrics: LogistixFlowMetrics
}

export function LogistixFlowPanel({ metrics }: LogistixFlowPanelProps) {
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
                Operations Flow
              </h3>
              <span className="text-xs text-muted-foreground font-normal">
                End-to-End Fulfillment Control (Inbound · Outbound · Audit)
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
          <span>Synced: {metrics.lastUpdated}</span>
        </div>
      </div>

      {/* Main Grid: Left Gauge (3 cols) & Right 3 Operational Tracks (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Dock-to-Stock Gauge */}
        <div className="lg:col-span-4 xl:col-span-3 p-4 rounded-xl border bg-muted/20 dark:bg-muted/10 flex flex-col justify-between">
          <DockToStockGauge
            minutes={metrics.dockToStock.minutes}
            targetMinutes={metrics.dockToStock.targetMinutes}
            status={metrics.dockToStock.status}
            badgeText={metrics.dockToStock.badgeText}
            benchmarkText={metrics.dockToStock.benchmarkText}
            hasRealData={metrics.dockToStock.hasRealData}
          />
        </div>

        {/* Right: 3 Distinct Operational Tracks */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3 h-full items-stretch">
            {/* Track 1: Inbound Operations (Dock to Rack) */}
            <div className="xl:col-span-5 p-2.5 rounded-xl border border-border/70 bg-muted/20 dark:bg-muted/10 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-blue-500" />
                  <span>Inbound Track</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Dock ➔ Rack
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 h-full">
                <ProcessQualityCard
                  stage={metrics.stages.receiving}
                  trackBadge="INBOUND"
                  showArrow={true}
                />
                <ProcessQualityCard
                  stage={metrics.stages.placeSmart}
                  trackBadge="INBOUND"
                  showArrow={false}
                />
              </div>
            </div>

            {/* Track 2: Outbound Fulfillment (Pick to Ship) */}
            <div className="xl:col-span-5 p-2.5 rounded-xl border border-border/70 bg-muted/20 dark:bg-muted/10 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Truck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Outbound Track</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Pick ➔ Ship
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 h-full">
                <ProcessQualityCard
                  stage={metrics.stages.guidedPick}
                  trackBadge="OUTBOUND"
                  showArrow={true}
                />
                <ProcessQualityCard
                  stage={metrics.stages.packingQc}
                  trackBadge="OUTBOUND"
                  showArrow={false}
                />
              </div>
            </div>

            {/* Track 3: Stock Control & Audit Loop */}
            <div className="sm:col-span-2 xl:col-span-2 p-2.5 rounded-xl border border-border/70 bg-muted/20 dark:bg-muted/10 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Audit Loop</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider shrink-0">
                  Feedback
                </span>
              </div>
              <div className="h-full flex flex-col">
                <ProcessQualityCard
                  stage={metrics.stages.cycleCount}
                  trackBadge="AUDIT"
                  showArrow={false}
                />
              </div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-1">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500 shrink-0" />
              <span>
                <strong>Closed-Loop Operational Integrity:</strong> Pick skips (`CMD-SKIP`) trigger Urgent Cycle Counts to auto-correct ledger discrepancies.
              </span>
            </span>
            <span className="font-medium text-foreground">
              Warehouse Operations SLA Compliant
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
