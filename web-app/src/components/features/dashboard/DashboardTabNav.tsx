"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Activity, Brain, Map } from "lucide-react"

export type DashboardTab = "operations" | "intelligence" | "map"

export function DashboardTabNav() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get("tab") as DashboardTab) || "operations"

  const tabs = [
    {
      id: "operations",
      label: "Operations",
      description: "Live SLA & Fulfillment",
      icon: Activity,
    },
    {
      id: "intelligence",
      label: "Inventory Intelligence",
      description: "Dead Stock & Smart Reorder",
      icon: Brain,
    },
    {
      id: "map",
      label: "2D Layout Map",
      description: "Digital Floorplan",
      icon: Map,
      badge: "Phase 4",
    },
  ]

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id === "operations") {
      params.delete("tab")
    } else {
      params.set("tab", id)
    }
    const query = params.toString()
    router.push(query ? `?${query}` : window.location.pathname)
  }

  return (
    <div className="flex border-b border-border/60 pb-px">
      <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50 text-xs w-full sm:w-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                }`}
              />
              <div className="text-left">
                <span className="block leading-none text-xs">{tab.label}</span>
                <span className="hidden md:block text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {tab.description}
                </span>
              </div>
              {tab.badge && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted-foreground/15 text-muted-foreground border border-border/60 uppercase">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
