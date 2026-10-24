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

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(320)

  React.useEffect(() => {
    if (!containerRef.current) return
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 320)
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const getOutsideTooltipStyle = (
    coordinate?: { x?: number; y?: number }
  ): React.CSSProperties => {
    if (!coordinate || coordinate.x == null || coordinate.y == null) {
      return {}
    }

    const cx = containerWidth / 2
    // With bottom legend (36px), the pie center is around y = 107
    const cy = 107
    const dx = coordinate.x - cx
    const dy = coordinate.y - cy

    const canGoLeft = coordinate.x > 130
    const canGoRight = (containerWidth - coordinate.x) > 130

    // Vertical push (top or bottom)
    if (Math.abs(dy) > Math.abs(dx) * 0.8 || (!canGoLeft && dx < 0) || (!canGoRight && dx >= 0)) {
      if (dy < 0) {
        return {
          transform: "translate(-50%, calc(-100% - 20px))",
          whiteSpace: "nowrap",
        }
      } else {
        return {
          transform: "translate(-50%, 20px)",
          whiteSpace: "nowrap",
        }
      }
    }

    // Horizontal push (left or right, away from center)
    if (dx < 0) {
      return {
        transform: "translate(calc(-100% - 20px), -50%)",
        whiteSpace: "nowrap",
      }
    } else {
      return {
        transform: "translate(20px, -50%)",
        whiteSpace: "nowrap",
      }
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Inventory Health Index</h3>
          <p className="text-sm text-muted-foreground">Ratio of overall inventory status in the warehouse</p>
        </div>
      </div>
      <div ref={containerRef} className="h-[250px] w-full flex items-center justify-center">
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
                wrapperStyle={{ zIndex: 60, pointerEvents: "none" }}
                content={({ active, payload, coordinate }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0]
                    const percent = totalUnits > 0
                      ? ((Number(item.value) / totalUnits) * 100).toFixed(1)
                      : "0"
                    const itemColor = (item.payload as any)?.color || item.color || "#10b981"
                    return (
                      <div
                        className="rounded-lg border bg-popover/95 backdrop-blur-xs p-2.5 shadow-lg text-popover-foreground transition-transform duration-75"
                        style={getOutsideTooltipStyle(coordinate)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: itemColor }}
                          />
                          <p className="text-xs font-bold text-foreground">{item.name}</p>
                        </div>
                        <p className="text-xs font-semibold tabular-nums text-muted-foreground mt-1 pl-3.5">
                          {Number(item.value).toLocaleString()} units <span className="font-normal text-[11px]">({percent}%)</span>
                        </p>
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

