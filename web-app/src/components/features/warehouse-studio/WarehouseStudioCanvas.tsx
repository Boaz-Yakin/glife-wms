"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import {
  StudioNode,
  StudioViewport,
} from "@/types/warehouse-studio"
import { Snowflake, Package, Truck, ShieldAlert } from "lucide-react"

interface WarehouseStudioCanvasProps {
  gridWidth: number
  gridHeight: number
  nodes: StudioNode[]
  selectedNodeId: string | null
  viewport: StudioViewport
  onSelectNode: (id: string | null) => void
  onUpdateNodePosition: (id: string, x: number, y: number) => void
  onUpdateViewport: (viewport: StudioViewport) => void
}

const CELL_SIZE = 26 // px per grid unit

export function WarehouseStudioCanvas({
  gridWidth,
  gridHeight,
  nodes,
  selectedNodeId,
  viewport,
  onSelectNode,
  onUpdateNodePosition,
  onUpdateViewport,
}: WarehouseStudioCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Dragging state for nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Panning state for background canvas
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const canvasPixelWidth = gridWidth * CELL_SIZE
  const canvasPixelHeight = gridHeight * CELL_SIZE

  // Handle Zoom with Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
    const newZoom = Math.min(2.5, Math.max(0.4, viewport.zoom * zoomFactor))

    onUpdateViewport({
      ...viewport,
      zoom: Number(newZoom.toFixed(2)),
    })
  }

  // Handle Pan start
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return // only left or middle click
    // If clicked directly on canvas background
    setIsPanning(true)
    setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY })
    onSelectNode(null)
  }

  // Handle Node Drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: StudioNode) => {
    e.stopPropagation()
    onSelectNode(node.id)

    setDraggingNodeId(node.id)
    setDragOffset({
      x: e.clientX - node.x * CELL_SIZE * viewport.zoom,
      y: e.clientY - node.y * CELL_SIZE * viewport.zoom,
    })
  }

  // Global mouse move & mouse up handlers
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        onUpdateViewport({
          ...viewport,
          panX: e.clientX - panStart.x,
          panY: e.clientY - panStart.y,
        })
      } else if (draggingNodeId) {
        const node = nodes.find((n) => n.id === draggingNodeId)
        if (!node) return

        const rawPixelX = (e.clientX - dragOffset.x) / viewport.zoom
        const rawPixelY = (e.clientY - dragOffset.y) / viewport.zoom

        // Snap to integer grid cell
        const gridX = Math.round(rawPixelX / CELL_SIZE)
        const gridY = Math.round(rawPixelY / CELL_SIZE)

        // Clamp inside canvas boundary
        const clampedX = Math.max(0, Math.min(gridWidth - node.width, gridX))
        const clampedY = Math.max(0, Math.min(gridHeight - node.height, gridY))

        if (clampedX !== node.x || clampedY !== node.y) {
          onUpdateNodePosition(node.id, clampedX, clampedY)
        }
      }
    },
    [
      isPanning,
      draggingNodeId,
      nodes,
      dragOffset,
      viewport,
      panStart,
      gridWidth,
      gridHeight,
      onUpdateViewport,
      onUpdateNodePosition,
    ]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDraggingNodeId(null)
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleBackgroundMouseDown}
      className="flex-1 h-full w-full relative overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
    >
      {/* Zoom / Pan Container */}
      <div
        className="absolute origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          width: canvasPixelWidth,
          height: canvasPixelHeight,
        }}
      >
        {/* Grid Canvas Background */}
        <svg
          width={canvasPixelWidth}
          height={canvasPixelHeight}
          className="absolute inset-0 pointer-events-none rounded-lg border-2 border-border/40 shadow-2xl bg-slate-900/90"
        >
          <defs>
            <pattern
              id="studio-grid"
              width={CELL_SIZE}
              height={CELL_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id="studio-major-grid"
              width={CELL_SIZE * 5}
              height={CELL_SIZE * 5}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${CELL_SIZE * 5} 0 L 0 0 0 ${CELL_SIZE * 5}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#studio-grid)" />
          <rect width="100%" height="100%" fill="url(#studio-major-grid)" />

          {/* Coordinate ruler labels */}
          {Array.from({ length: Math.floor(gridWidth / 5) + 1 }).map((_, i) => (
            <text
              key={`x-${i}`}
              x={i * 5 * CELL_SIZE + 4}
              y={14}
              fontSize="10"
              fill="rgba(255,255,255,0.25)"
              fontFamily="monospace"
            >
              {i * 5}m
            </text>
          ))}
          {Array.from({ length: Math.floor(gridHeight / 5) + 1 }).map((_, i) => (
            <text
              key={`y-${i}`}
              x={4}
              y={i * 5 * CELL_SIZE + 14}
              fontSize="10"
              fill="rgba(255,255,255,0.25)"
              fontFamily="monospace"
            >
              {i * 5}m
            </text>
          ))}
        </svg>

        {/* Studio Elements / Nodes */}
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId
          const isDragging = node.id === draggingNodeId
          const left = node.x * CELL_SIZE
          const top = node.y * CELL_SIZE
          const width = node.width * CELL_SIZE
          const height = node.height * CELL_SIZE

          const isStorage =
            node.type === "RACK" ||
            node.type === "STAGING" ||
            node.type === "COLD_ZONE"

          const totalBins = isStorage
            ? (node.bays || 1) * (node.levels || 1) * (node.bins || 1)
            : 0

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              className={`absolute rounded-md cursor-pointer transition-shadow flex flex-col justify-between overflow-hidden shadow-md group ${
                isSelected
                  ? "ring-2 ring-emerald-400 shadow-emerald-500/30 z-30"
                  : "hover:ring-1 hover:ring-white/40 z-10"
              } ${isDragging ? "opacity-90 shadow-2xl scale-[1.01]" : ""}`}
              style={{
                left,
                top,
                width,
                height,
                backgroundColor: `${node.color || "#10b981"}22`,
                borderColor: node.color || "#10b981",
                borderWidth: isSelected ? 2 : 1.5,
                transform: `rotate(${node.rotation || 0}deg)`,
                transformOrigin: "center center",
              }}
            >
              {/* Node Header */}
              <div
                className="px-2 py-1 text-[11px] font-semibold text-white flex items-center justify-between truncate"
                style={{ backgroundColor: `${node.color || "#10b981"}cc` }}
              >
                <div className="flex items-center gap-1 truncate">
                  {node.type === "COLD_ZONE" && <Snowflake className="w-3 h-3 text-cyan-200 shrink-0" />}
                  {node.type === "STAGING" && <Package className="w-3 h-3 text-amber-200 shrink-0" />}
                  {node.type === "DOCK" && <Truck className="w-3 h-3 text-slate-200 shrink-0" />}
                  {node.type === "OBSTACLE" && <ShieldAlert className="w-3 h-3 text-rose-200 shrink-0" />}
                  <span className="truncate">{node.label}</span>
                </div>
                {isStorage && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/30 shrink-0">
                    {node.zone}
                  </span>
                )}
              </div>

              {/* Internal Compartments Visual (Bays / Levels) */}
              {isStorage && node.bays && node.bays > 0 ? (
                <div className="flex-1 p-1 flex gap-0.5 items-stretch overflow-hidden">
                  {Array.from({ length: Math.min(15, node.bays) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-xs border border-white/10 bg-black/20 flex flex-col justify-end p-0.5 text-[8px] text-white/50 text-center font-mono"
                    >
                      <span>{idx + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-2 text-center text-[10px] text-white/60">
                  {node.type === "AISLE" && "🚶 통로"}
                  {node.type === "DOCK" && "🚚 상하차 도크"}
                  {node.type === "OBSTACLE" && "🚧 통행 불가"}
                </div>
              )}

              {/* Node Footer Stats */}
              {isStorage && (
                <div className="px-1.5 py-0.5 bg-black/40 text-[9px] font-mono text-white/70 flex items-center justify-between border-t border-white/10">
                  <span>
                    {node.levels}단 × {node.bins}칸
                  </span>
                  <span className="text-emerald-400 font-semibold">{totalBins} Bins</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
