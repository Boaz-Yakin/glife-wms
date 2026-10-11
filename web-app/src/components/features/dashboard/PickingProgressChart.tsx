"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

export interface PickingProgressItem {
  time: string
  picking: number
  target: number
}

interface PickingProgressChartProps {
  data?: PickingProgressItem[]
}

export function PickingProgressChart({ data = [] }: PickingProgressChartProps) {
  const maxVal = Math.max(...data.map(d => Math.max(d.picking, d.target)), 0)

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Hourly Picking Progress</h3>
          <p className="text-sm text-muted-foreground">Cumulative picking volume per hour today</p>
        </div>
      </div>
      <div className="h-[250px] w-full">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <p className="font-medium text-sm">No picking data recorded today</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Hourly picking trends will appear as orders are processed.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, maxVal > 0 ? 'auto' : 5]}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Actual
                            </span>
                            <span className="font-bold text-blue-500">
                              {payload[0].value}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Target
                            </span>
                            <span className="font-bold text-gray-400">
                              {payload[1]?.value ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="picking"
                name="Actual"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="hsl(var(--muted-foreground)/0.5)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

