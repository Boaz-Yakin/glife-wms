"use client"

import React from "react"
import {
  Layers,
  Snowflake,
  Package,
  Truck,
  ShieldAlert,
  Plus,
  Footprints,
} from "lucide-react"
import { StudioNodeType, StudioNode } from "@/types/warehouse-studio"

interface StudioToolboxProps {
  onAddNode: (template: Omit<StudioNode, "id" | "x" | "y">) => void
}

const TEMPLATES: Array<{
  type: StudioNodeType
  label: string
  sublabel: string
  icon: any
  color: string
  defaultProps: Omit<StudioNode, "id" | "x" | "y">
}> = [
  {
    type: "RACK",
    label: "보관 랙 (상온 랙)",
    sublabel: "Zone A • 2단 2열 선반",
    icon: Layers,
    color: "#10b981", // emerald
    defaultProps: {
      type: "RACK",
      label: "Ambient Rack (Zone A)",
      width: 16,
      height: 6,
      rotation: 0,
      zone: "A",
      rackPrefix: "A02",
      bays: 10,
      levels: 2,
      bins: 2,
      temperature: "ROOM",
      color: "#10b981",
    },
  },
  {
    type: "COLD_ZONE",
    label: "저온/냉동 랙",
    sublabel: "Zone F • 냉동/냉장 보관",
    icon: Snowflake,
    color: "#06b6d4", // cyan
    defaultProps: {
      type: "COLD_ZONE",
      label: "Cold Storage (Zone F)",
      width: 16,
      height: 6,
      rotation: 0,
      zone: "F",
      rackPrefix: "F02",
      bays: 10,
      levels: 2,
      bins: 2,
      temperature: "FROZEN",
      color: "#06b6d4",
    },
  },
  {
    type: "STAGING",
    label: "스테이징 바닥 (Floor)",
    sublabel: "Zone S • 바닥 적치 1단",
    icon: Package,
    color: "#f59e0b", // amber
    defaultProps: {
      type: "STAGING",
      label: "Staging Floor (Zone S)",
      width: 12,
      height: 6,
      rotation: 0,
      zone: "S",
      rackPrefix: "S02",
      bays: 10,
      levels: 1,
      bins: 1,
      temperature: "ROOM",
      color: "#f59e0b",
    },
  },
  {
    type: "DOCK",
    label: "입/출고 도크 구역",
    sublabel: "Dock / Packing Zone",
    icon: Truck,
    color: "#64748b", // slate
    defaultProps: {
      type: "DOCK",
      label: "Inbound/Outbound Dock",
      width: 12,
      height: 4,
      rotation: 0,
      zone: "DOCK",
      temperature: "ROOM",
      color: "#64748b",
    },
  },
  {
    type: "OBSTACLE",
    label: "기둥 / 벽체 장애물",
    sublabel: "Pillar / Wall Barrier",
    icon: ShieldAlert,
    color: "#ef4444", // rose
    defaultProps: {
      type: "OBSTACLE",
      label: "Pillar / Wall",
      width: 4,
      height: 4,
      rotation: 0,
      zone: "OBSTACLE",
      temperature: "ROOM",
      color: "#ef4444",
    },
  },
  {
    type: "AISLE",
    label: "통로 / 지게차 동선",
    sublabel: "Walkway / Forklift Lane",
    icon: Footprints,
    color: "#3b82f6", // blue
    defaultProps: {
      type: "AISLE",
      label: "Main Aisle",
      width: 24,
      height: 3,
      rotation: 0,
      zone: "AISLE",
      temperature: "ROOM",
      color: "#3b82f6",
    },
  },
]

export function StudioToolbox({ onAddNode }: StudioToolboxProps) {
  return (
    <div className="w-64 border-r border-border bg-card/60 backdrop-blur flex flex-col h-full select-none">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          창고 컴포넌트 팔레트
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          클릭하여 캔버스에 즉시 배치
        </p>
      </div>

      <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon
          return (
            <button
              key={tmpl.type}
              type="button"
              onClick={() => onAddNode(tmpl.defaultProps)}
              className="w-full text-left p-2.5 rounded-lg border border-border/60 hover:border-emerald-500/60 bg-background/50 hover:bg-accent/40 transition-all group flex items-start gap-2.5 cursor-pointer shadow-xs"
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-white/10"
                style={{ backgroundColor: `${tmpl.color}20`, color: tmpl.color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate group-hover:text-emerald-400">
                    {tmpl.label}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {tmpl.sublabel}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="p-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
        💡 배치 후 우측 패널에서 단수(Levels)와 칸수(Bins)를 세부 설정하세요.
      </div>
    </div>
  )
}
