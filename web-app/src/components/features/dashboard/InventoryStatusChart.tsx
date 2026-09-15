"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const data = [
  { name: "가용 재고", value: 450, color: "#10b981" },
  { name: "할당(출고대기)", value: 200, color: "#f59e0b" },
  { name: "부족/파손", value: 35, color: "#ef4444" },
]

export function InventoryStatusChart() {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">재고 건전성 지표</h3>
          <p className="text-sm text-muted-foreground">현재 창고 내 전체 재고 상태 비율</p>
        </div>
      </div>
      <div className="h-[250px] w-full flex items-center justify-center">
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
                          {payload[0].value} 개
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
      </div>
    </div>
  )
}
