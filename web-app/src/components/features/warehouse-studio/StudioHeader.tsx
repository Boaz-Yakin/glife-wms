"use client"

import React from "react"
import {
  Save,
  Zap,
  QrCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Warehouse,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface StudioHeaderProps {
  warehouseName: string
  onChangeWarehouseName: (name: string) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onSave: () => void
  onOpenBuildDialog: () => void
  isSaving: boolean
  hasUnsavedChanges: boolean
}

export function StudioHeader({
  warehouseName,
  onChangeWarehouseName,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSave,
  onOpenBuildDialog,
  isSaving,
  hasUnsavedChanges,
}: StudioHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left: Warehouse Name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Warehouse className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={warehouseName}
            onChange={(e) => onChangeWarehouseName(e.target.value)}
            className="text-sm font-semibold text-foreground bg-transparent border-b border-dashed border-border hover:border-emerald-500 focus:border-emerald-500 focus:outline-hidden px-1 py-0.5"
            placeholder="창고 도면 명칭..."
          />
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="저장되지 않은 변경사항" />
          )}
        </div>
      </div>

      {/* Center: Zoom & Viewport Controls */}
      <div className="flex items-center gap-1 bg-background/60 border border-border rounded-lg p-1">
        <button
          type="button"
          onClick={onZoomOut}
          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
          title="축소 (Zoom Out)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-mono px-2 text-foreground min-w-[3.5rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
          title="확대 (Zoom In)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3.5 bg-border mx-1" />
        <button
          type="button"
          onClick={onResetZoom}
          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
          title="100% 원본 비율 복원"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Link href="/master/labels">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <QrCode className="w-3.5 h-3.5" />
            라벨 인쇄
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBuildDialog}
          className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          로케이션 일괄 생성
        </Button>

        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          도면 저장
        </Button>
      </div>
    </header>
  )
}
