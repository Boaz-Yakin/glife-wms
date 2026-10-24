import * as React from "react"
import { cn } from "@/lib/utils"

export type OrderStatusType =
  | "PENDING"
  | "PICKING"
  | "PACKED"
  | "INVOICED"
  | "SHIPPED"
  | "CANCELED"
  | "RECEIVED"
  | "ALLOCATED"
  | "PICKED"
  | "DISPATCHED"
  | string

export interface OrderStatusConfig {
  label: string
  color: string // Tailwind classes for background, text, border
  dotColor: string
  pulse?: boolean
}

export const ORDER_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
    dotColor: "bg-amber-500",
  },
  PICKING: {
    label: "Picking",
    color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
    dotColor: "bg-blue-500",
    pulse: true,
  },
  PACKED: {
    label: "Packed",
    color: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40",
    dotColor: "bg-purple-500",
  },
  INVOICED: {
    label: "Invoiced",
    color: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40",
    dotColor: "bg-indigo-500",
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
    dotColor: "bg-emerald-500",
  },
  CANCELED: {
    label: "Canceled",
    color: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
    dotColor: "bg-rose-500",
  },
  // Legacy / Fallbacks
  RECEIVED: {
    label: "Received",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
    dotColor: "bg-amber-500",
  },
  ALLOCATED: {
    label: "Allocated",
    color: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
    dotColor: "bg-sky-500",
  },
  PICKED: {
    label: "Picked",
    color: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/40",
    dotColor: "bg-teal-500",
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
    dotColor: "bg-emerald-500",
  },
}

export interface OrderStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: OrderStatusType | null | undefined
  showDot?: boolean
  className?: string
}

export function OrderStatusBadge({
  status,
  showDot = true,
  className,
  ...props
}: OrderStatusBadgeProps) {
  const normStatus = (status || "").toUpperCase()
  const config = ORDER_STATUS_CONFIG[normStatus] || {
    label: status || "Unknown",
    color: "bg-muted text-muted-foreground border-muted-foreground/20",
    dotColor: "bg-muted-foreground",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors shadow-2xs whitespace-nowrap",
        config.color,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            config.dotColor,
            config.pulse && "animate-pulse"
          )}
        />
      )}
      <span>{config.label}</span>
    </span>
  )
}
