"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { StorageCapacityData } from "@/services/dashboard.service"
import { AlertTriangle, CheckCircle2, Warehouse } from "lucide-react"

interface StorageCapacityChartProps {
  data: StorageCapacityData
}

export function StorageCapacityChart({ data }: StorageCapacityChartProps) {
  const isHighUtilisation = data.utilizationRate >= 85
  const hasLocations = data.totalLocations > 0

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Warehouse className="h-4 w-4 text-blue-500" />
            <h3 className="text-lg font-semibold tracking-tight">Storage Capacity</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rack utilization vs available slots
          </p>
        </div>
        {hasLocations && (
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isHighUtilisation
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            }`}
          >
            {isHighUtilisation ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                <span>Congestion Risk</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span>Optimal Ratio</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Donut Chart with Center Metric */}
      <div className="relative h-[200px] w-full flex items-center justify-center">
        {!hasLocations ? (
          <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <div className="size-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2">
              <span className="text-sm font-semibold text-muted-foreground">0</span>
            </div>
            <p className="font-medium text-sm text-foreground">No Locations Registered</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Register warehouse racks to view storage capacity.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]
                      const percent = data.totalLocations > 0
                        ? ((Number(item.value) / data.totalLocations) * 100).toFixed(1)
                        : "0"
                      return (
                        <div className="rounded-lg border bg-background p-2.5 shadow-md">
                          <p className="text-xs font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {Number(item.value).toLocaleString()} Bins ({percent}%)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {data.utilizationRate}%
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Occupied
              </span>
            </div>
          </>
        )}
      </div>

      {/* Detail Breakdown */}
      {hasLocations && (
        <div className="space-y-3 pt-2 border-t text-xs">
          {/* Legend row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
              <div className="size-2.5 rounded-full bg-blue-500 shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground">Occupied: </span>
                <span className="font-semibold text-foreground">
                  {data.occupiedLocations.toLocaleString()} Bins
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
              <div className="size-2.5 rounded-full bg-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground">Available: </span>
                <span className="font-semibold text-foreground">
                  {data.availableLocations.toLocaleString()} Bins
                </span>
              </div>
            </div>
          </div>

          {/* Zones breakdown progress */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">Zone A (Ambient)</span>
                <span className="font-semibold text-foreground">
                  {data.zoneA.occupied}/{data.zoneA.total} ({data.zoneA.rate}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, data.zoneA.rate)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">Zone F (Frozen)</span>
                <span className="font-semibold text-foreground">
                  {data.zoneF.occupied}/{data.zoneF.total} ({data.zoneF.rate}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, data.zoneF.rate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
