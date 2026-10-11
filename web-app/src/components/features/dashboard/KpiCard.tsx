import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function KpiCard({ title, value, description, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-md p-1.5 bg-muted/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-4 text-center">
        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            {trend && (
              <span className={trend.isPositive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
