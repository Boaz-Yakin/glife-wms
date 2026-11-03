"use client"

import React, { useState, useTransition } from "react"
import {
  StudioNode,
  StudioViewport,
  WarehouseLayoutRecord,
} from "@/types/warehouse-studio"
import { StudioHeader } from "./StudioHeader"
import { StudioToolbox } from "./StudioToolbox"
import { WarehouseStudioCanvas } from "./WarehouseStudioCanvas"
import { StudioPropertyPanel } from "./StudioPropertyPanel"
import { BuildLocationsDialog } from "./BuildLocationsDialog"
import { saveWarehouseLayoutAction } from "@/app/(dashboard)/master/warehouse-studio/actions"
import { toast } from "sonner"

interface WarehouseStudioClientProps {
  initialLayout: WarehouseLayoutRecord
}

export function WarehouseStudioClient({ initialLayout }: WarehouseStudioClientProps) {
  const [layoutId, setLayoutId] = useState<string>(initialLayout.id || "")
  const [warehouseName, setWarehouseName] = useState<string>(
    initialLayout.warehouse_name || "Primary Logistics Center"
  )
  const [gridWidth] = useState<number>(initialLayout.grid_width || 60)
  const [gridHeight] = useState<number>(initialLayout.grid_height || 40)

  const [nodes, setNodes] = useState<StudioNode[]>(
    initialLayout.layout_data?.nodes || []
  )
  const [viewport, setViewport] = useState<StudioViewport>(
    initialLayout.layout_data?.viewport || { zoom: 1, panX: 20, panY: 20 }
  )

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [isBuildDialogOpen, setIsBuildDialogOpen] = useState<boolean>(false)
  const [isSaving, startSaveTransition] = useTransition()

  const selectedNode = React.useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  // Total capacity across all nodes
  const totalCapacity = React.useMemo(() => {
    return nodes.reduce((acc, curr) => {
      if (
        curr.type === "RACK" ||
        curr.type === "STAGING" ||
        curr.type === "COLD_ZONE"
      ) {
        return acc + (curr.bays || 1) * (curr.levels || 1) * (curr.bins || 1)
      }
      return acc
    }, 0)
  }, [nodes])

  // Viewport Zoom Handlers
  const handleZoomIn = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Number(Math.min(2.5, prev.zoom + 0.1).toFixed(2)),
    }))
  }

  const handleZoomOut = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Number(Math.max(0.4, prev.zoom - 0.1).toFixed(2)),
    }))
  }

  const handleResetZoom = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: 1,
      panX: 20,
      panY: 20,
    }))
  }

  // Node CRUD Handlers
  const handleAddNode = (template: Omit<StudioNode, "id" | "x" | "y">) => {
    const newId = `node-${Date.now().toString(36)}`
    // Place near current view
    const defaultX = Math.max(2, Math.min(gridWidth - template.width - 2, 10))
    const defaultY = Math.max(2, Math.min(gridHeight - template.height - 2, 10))

    const newNode: StudioNode = {
      ...template,
      id: newId,
      x: defaultX,
      y: defaultY,
    }

    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newId)
    setHasUnsavedChanges(true)
    toast.info("새로운 구역이 추가되었습니다.", {
      description: "마우스로 드래그하여 원하는 위치에 배치하세요.",
    })
  }

  const handleUpdateNode = (updated: StudioNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    setHasUnsavedChanges(true)
  }

  const handleUpdateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)))
    setHasUnsavedChanges(true)
  }

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
    setHasUnsavedChanges(true)
    toast.info("선택한 구역이 삭제되었습니다.")
  }

  const handleDuplicateNode = (node: StudioNode) => {
    const dupId = `node-${Date.now().toString(36)}`
    const dupNode: StudioNode = {
      ...node,
      id: dupId,
      label: `${node.label} (Copy)`,
      x: Math.min(gridWidth - node.width, node.x + 2),
      y: Math.min(gridHeight - node.height, node.y + 2),
    }

    setNodes((prev) => [...prev, dupNode])
    setSelectedNodeId(dupId)
    setHasUnsavedChanges(true)
    toast.info("구역이 복제되었습니다.")
  }

  // Save Layout Handler
  const handleSave = () => {
    startSaveTransition(async () => {
      try {
        const res = await saveWarehouseLayoutAction({
          id: layoutId,
          warehouse_name: warehouseName,
          grid_width: gridWidth,
          grid_height: gridHeight,
          layout_data: {
            viewport,
            nodes,
          },
        })

        if (res.error) {
          toast.error("도면 저장 실패", { description: res.error })
        } else {
          if (res.data?.id) setLayoutId(res.data.id)
          setHasUnsavedChanges(false)
          toast.success("창고 도면이 저장되었습니다.")
        }
      } catch (err: any) {
        toast.error("오류 발생", { description: err.message })
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Header Bar */}
      <StudioHeader
        warehouseName={warehouseName}
        onChangeWarehouseName={(name) => {
          setWarehouseName(name)
          setHasUnsavedChanges(true)
        }}
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onSave={handleSave}
        onOpenBuildDialog={() => setIsBuildDialogOpen(true)}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Main Workspace (Toolbox + 2D Canvas + Property Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Palette */}
        <StudioToolbox onAddNode={handleAddNode} />

        {/* 2D Interactive Canvas */}
        <WarehouseStudioCanvas
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          viewport={viewport}
          onSelectNode={setSelectedNodeId}
          onUpdateNodePosition={handleUpdateNodePosition}
          onUpdateViewport={(vp) => {
            setViewport(vp)
            setHasUnsavedChanges(true)
          }}
        />

        {/* Right Property Inspector */}
        <StudioPropertyPanel
          selectedNode={selectedNode}
          totalNodesCount={nodes.length}
          totalCapacity={totalCapacity}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onDuplicateNode={handleDuplicateNode}
          onDeselect={() => setSelectedNodeId(null)}
        />
      </div>

      {/* Build Locations & DB Sync Dialog */}
      <BuildLocationsDialog
        open={isBuildDialogOpen}
        onOpenChange={setIsBuildDialogOpen}
        nodes={nodes}
      />
    </div>
  )
}
