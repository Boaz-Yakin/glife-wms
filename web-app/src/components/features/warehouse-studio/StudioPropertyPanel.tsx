"use client"

import React from "react"
import {
  RotateCw,
  Copy,
  Trash2,
  X,
  Layers,
  Thermometer,
  Grid,
  Info,
} from "lucide-react"
import { StudioNode, StudioTemperatureZone } from "@/types/warehouse-studio"

interface StudioPropertyPanelProps {
  selectedNode: StudioNode | null
  totalNodesCount: number
  totalCapacity: number
  onUpdateNode: (updated: StudioNode) => void
  onDeleteNode: (id: string) => void
  onDuplicateNode: (node: StudioNode) => void
  onDeselect: () => void
}

const COLOR_PRESETS = [
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // rose
  "#64748b", // slate
]

export function StudioPropertyPanel({
  selectedNode,
  totalNodesCount,
  totalCapacity,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onDeselect,
}: StudioPropertyPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-72 border-l border-border bg-card/60 backdrop-blur flex flex-col h-full select-none p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b border-border">
          <Info className="w-4 h-4 text-emerald-500" />
          창고 레이아웃 요약
        </div>

        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg border border-border bg-background/50">
            <span className="text-xs text-muted-foreground block">총 배치 요소 수</span>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {totalNodesCount}
              <span className="text-xs font-normal text-muted-foreground ml-1">개 구역/랙</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-emerald-500/10 border-emerald-500/30">
            <span className="text-xs text-emerald-400 block font-medium">총 보관 가용 슬롯 (Bins)</span>
            <span className="text-2xl font-bold tracking-tight text-emerald-300">
              {totalCapacity.toLocaleString()}
              <span className="text-xs font-normal text-emerald-400 ml-1">로케이션</span>
            </span>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed pt-2">
            캔버스의 랙 또는 구역을 마우스로 클릭하면 상세 규격(단수, 칸수, 바코드 프리픽스, 온도대)을 즉시 수정할 수 있습니다.
          </div>
        </div>
      </div>
    )
  }

  const isStorageNode =
    selectedNode.type === "RACK" ||
    selectedNode.type === "STAGING" ||
    selectedNode.type === "COLD_ZONE"

  const nodeCapacity = isStorageNode
    ? (selectedNode.bays || 1) * (selectedNode.levels || 1) * (selectedNode.bins || 1)
    : 0

  const handleRotate = () => {
    const nextRot = (((selectedNode.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270
    onUpdateNode({ ...selectedNode, rotation: nextRot })
  }

  return (
    <div className="w-80 border-l border-border bg-card/70 backdrop-blur flex flex-col h-full select-none overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedNode.color || "#10b981" }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {selectedNode.type} 속성 설정
          </span>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Name / Label */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            구역/랙 명칭 (Label)
          </label>
          <input
            type="text"
            value={selectedNode.label}
            onChange={(e) => onUpdateNode({ ...selectedNode, label: e.target.value })}
            className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Color Presets */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            테마 컬러
          </label>
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateNode({ ...selectedNode, color: c })}
                className={`w-6 h-6 rounded-md border transition-transform ${
                  selectedNode.color === c
                    ? "scale-110 border-white ring-2 ring-emerald-500"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Storage Specific Specs */}
        {isStorageNode && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Layers className="w-3.5 h-3.5" />
              보관 랙 및 로케이션 세부 규격
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">
                  구역 코드 (Zone)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={selectedNode.zone}
                  onChange={(e) =>
                    onUpdateNode({ ...selectedNode, zone: e.target.value.toUpperCase() })
                  }
                  className="w-full text-xs font-mono uppercase bg-background border border-border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">
                  랙/통로 접두어
                </label>
                <input
                  type="text"
                  value={selectedNode.rackPrefix || ""}
                  onChange={(e) =>
                    onUpdateNode({ ...selectedNode, rackPrefix: e.target.value })
                  }
                  placeholder="예: A01, F01"
                  className="w-full text-xs font-mono uppercase bg-background border border-border rounded px-2 py-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">
                  베이 수 (Bays)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={selectedNode.bays || 1}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      bays: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full text-xs bg-background border border-border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">
                  단수 (Levels)
                </label>
                <select
                  value={selectedNode.levels || 1}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      levels: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs bg-background border border-border rounded px-1.5 py-1"
                >
                  <option value={1}>1단 (A)</option>
                  <option value={2}>2단 (A,B)</option>
                  <option value={3}>3단 (A,B,C)</option>
                  <option value={4}>4단 (A..D)</option>
                  <option value={5}>5단 (A..E)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">
                  단별 칸 (Bins)
                </label>
                <select
                  value={selectedNode.bins || 1}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      bins: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs bg-background border border-border rounded px-1.5 py-1"
                >
                  <option value={1}>1칸 (01)</option>
                  <option value={2}>2칸 (01,02)</option>
                  <option value={3}>3칸 (01..03)</option>
                  <option value={4}>4칸 (01..04)</option>
                </select>
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                <Thermometer className="w-3 h-3 text-cyan-400" />
                보관 온도대 (Temperature Zone)
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["ROOM", "CHILLED", "FROZEN"] as StudioTemperatureZone[]).map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => onUpdateNode({ ...selectedNode, temperature: tz })}
                    className={`py-1 text-[10px] font-medium rounded border transition-colors ${
                      selectedNode.temperature === tz
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {tz === "ROOM" ? "☀️ 상온" : tz === "CHILLED" ? "❄️ 냉장" : "🧊 냉동"}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Slot Capacity */}
            <div className="pt-1 text-[11px] text-emerald-400 font-medium flex items-center justify-between border-t border-emerald-500/20">
              <span>랙 수용 슬롯:</span>
              <span className="font-bold">{nodeCapacity} Bins</span>
            </div>
          </div>
        )}

        {/* Geometry & Transform */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Grid className="w-3.5 h-3.5" />
            위치 및 크기 (그리드 칸수)
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">X 좌표: {selectedNode.x}</span>
              <input
                type="range"
                min={0}
                max={58}
                value={selectedNode.x}
                onChange={(e) =>
                  onUpdateNode({ ...selectedNode, x: parseInt(e.target.value, 10) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Y 좌표: {selectedNode.y}</span>
              <input
                type="range"
                min={0}
                max={38}
                value={selectedNode.y}
                onChange={(e) =>
                  onUpdateNode({ ...selectedNode, y: parseInt(e.target.value, 10) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">가로 폭 (W): {selectedNode.width}</span>
              <input
                type="range"
                min={2}
                max={40}
                value={selectedNode.width}
                onChange={(e) =>
                  onUpdateNode({ ...selectedNode, width: parseInt(e.target.value, 10) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">세로 폭 (H): {selectedNode.height}</span>
              <input
                type="range"
                min={2}
                max={40}
                value={selectedNode.height}
                onChange={(e) =>
                  onUpdateNode({ ...selectedNode, height: parseInt(e.target.value, 10) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleRotate}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border border-border hover:bg-accent text-xs font-medium cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              90도 회전 (현재 {selectedNode.rotation || 0}°)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicateNode(selectedNode)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-border hover:bg-accent text-xs font-medium cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            복제 (Duplicate)
          </button>
          <button
            type="button"
            onClick={() => onDeleteNode(selectedNode.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-medium cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제 (Delete)
          </button>
        </div>
      </div>
    </div>
  )
}
