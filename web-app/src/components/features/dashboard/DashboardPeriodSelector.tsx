"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"

export function DashboardPeriodSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPeriod = searchParams.get("period") || "today"

  const periods = [
    { id: "today", label: "Today", sub: "vs Yesterday" },
    { id: "week", label: "This Week", sub: "vs Last Week" },
    { id: "month", label: "This Month", sub: "vs Last Month" },
  ]

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id === "today") {
      params.delete("period")
    } else {
      params.set("period", id)
    }
    const query = params.toString()
    router.push(query ? `?${query}` : window.location.pathname)
  }

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted/60 border rounded-lg text-xs">
      <Calendar className="h-3.5 w-3.5 ml-2 text-muted-foreground shrink-0 hidden sm:inline" />
      {periods.map((p) => {
        const isActive = currentPeriod === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => handleSelect(p.id)}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              isActive
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{p.label}</span>
            <span className="hidden md:inline text-[10px] text-muted-foreground/80 ml-1">
              ({p.sub})
            </span>
          </button>
        )
      })}
    </div>
  )
}
