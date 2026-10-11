"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

export interface InventoryStatusItem {
  name: string
  value: number
  color: string
}

interface InventoryStatusChartProps {
  data?: InventoryStatusItem[]
}

export function InventoryStatusChart({ data = [] }: InventoryStatusChartProps) {
  const totalUnits = data.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Inventory Health Index</h3>
          <p className="text-sm text-muted-foreground">Ratio of overall inventory status in the warehouse</p>
        </div>
      </div>
      <div className="h-[250px] w-full flex items-center justify-center">
        {totalUnits === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="size-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2">
              <span className="text-sm font-semibold text-muted-foreground">0</span>
            </div>
            <p className="font-medium text-sm text-foreground">No inventory recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
              Available, allocated, and shortage counts will appear here once inventory is registered.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {payload[0].name}
                          </span>
                          <span className="font-bold tabular-nums" style={{ color: payload[0].payload.color }}>
                            {payload[0].value} units
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

