"use client"

import * as React from "react"
import { AlertCircle, CalendarClock, ShieldAlert, CheckCircle2, ChevronRight, MapPin, Box } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ExpirationRiskData } from "@/services/dashboard.service"

interface ExpirationAlertCardProps {
  data: ExpirationRiskData
}

export function ExpirationAlertCard({ data }: ExpirationAlertCardProps) {
  const hasCritical = data.criticalCount > 0
  const totalTracked = data.criticalCount + data.warningCount + data.safeCount

  return (
    <Card className="p-5 flex flex-col justify-between border-border/80 h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                FEFO & Expiration Risk
              </h3>
              <p className="text-xs text-muted-foreground">
                Near-expiry alert & First-Expired-First-Out prioritization
              </p>
            </div>
          </div>
          {hasCritical && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
              <ShieldAlert className="h-3 w-3" />
              {data.criticalCount} Critical
            </span>
          )}
        </div>

        {/* 3 Status Summary Pills */}
        <div className="grid grid-cols-3 gap-2 my-4">
          {/* Critical */}
          <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                Critical (&le;14d)
              </span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
            </div>
            <span className="text-xl font-black tracking-tight text-rose-700 dark:text-rose-400 font-mono mt-0.5 block">
              {data.criticalCount}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {data.criticalUnits.toLocaleString()} units
            </span>
          </div>

          {/* Warning */}
          <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Warning (15-45d)
              </span>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <span className="text-xl font-black tracking-tight text-amber-700 dark:text-amber-400 font-mono mt-0.5 block">
              {data.warningCount}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {data.warningUnits.toLocaleString()} units
            </span>
          </div>

          {/* Safe */}
          <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Safe (&gt;45d)
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
              {data.safeCount}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {data.safeUnits.toLocaleString()} units
            </span>
          </div>
        </div>

        {/* Urgent Expiring Items List */}
        <div>
          <span className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
            <span>Urgent Expiration Queue (FEFO)</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Top {data.urgentItems.length} Urgent Slots
            </span>
          </span>

          {data.urgentItems.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="font-semibold text-foreground">All Stock Shelf-Life Healthy</p>
              <p className="text-[11px] mt-0.5">
                No inventory lots expiring within threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {data.urgentItems.map((item) => {
                const isCritical = item.riskLevel === 'critical'
                const isWarning = item.riskLevel === 'warning'
                const dDayLabel = item.daysRemaining <= 0
                  ? (item.daysRemaining === 0 ? 'D-0 Today' : `Expired ${Math.abs(item.daysRemaining)}d`)
                  : `D-${item.daysRemaining}`

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-md border bg-card/60 hover:bg-card transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground truncate">
                          {item.sku}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {item.locationCode}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.lotNo}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={item.name}>
                        {item.name} {item.desc ? `(${item.desc})` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            isCritical
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              : isWarning
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {dDayLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                        {item.onHandQty.toLocaleString()} units
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>FEFO enforcement active</span>
        <span>Total tracked: {totalTracked} lots</span>
      </div>
    </Card>
  )
}
