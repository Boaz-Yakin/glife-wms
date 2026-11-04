"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, Layers, CheckSquare, Square, ShoppingBag } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OrderData } from "@/services/orders.service"

export interface CreateWaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
  pendingOrders: OrderData[]
}

export function CreateWaveDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  pendingOrders,
}: CreateWaveDialogProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [waveName, setWaveName] = useState<string>("")
  const [zoneType, setZoneType] = useState<string>("ALL")

  React.useEffect(() => {
    if (open) {
      setSelectedOrderIds([])
      const todayStr = new Date().toISOString().slice(5, 10).replace("-", "/")
      setWaveName(`${todayStr} 1차 출고 통합 웨이브`)
      setZoneType("ALL")
    }
  }, [open])

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === pendingOrders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(pendingOrders.map((o) => o.id))
    }
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append("name", waveName)
    fd.append("zone_type", zoneType)
    fd.append("order_ids", JSON.stringify(selectedOrderIds))
    await onSubmit(fd)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            신규 파동 출고(Wave Picking) 생성
          </DialogTitle>
          <DialogDescription>
            출고 대기 중인 주문들을 하나의 웨이브로 묶어 현장 카트 토트(Tote 1~8)를 자동 할당하고 최단 동선 집계 피킹을 지시합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="wave_name">웨이브 명칭</Label>
              <Input
                id="wave_name"
                required
                value={waveName}
                onChange={(e) => setWaveName(e.target.value)}
                placeholder="예: 11/04 오전 강남/판교권역 웨이브"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone_type">보관 구역</Label>
              <Select value={zoneType} onValueChange={(val) => setZoneType(val || "ALL")}>
                <SelectTrigger id="zone_type">
                  <SelectValue placeholder="구역 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 구역 (통합)</SelectItem>
                  <SelectItem value="ROOM">상온 전용 (ROOM)</SelectItem>
                  <SelectItem value="CHILLED">냉장 전용 (CHILLED)</SelectItem>
                  <SelectItem value="FROZEN">냉동 전용 (FROZEN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pending Orders Selection Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                포함할 주문 선택 ({selectedOrderIds.length} / {pendingOrders.length}건)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {selectedOrderIds.length === pendingOrders.length ? "전체 해제" : "전체 선택"}
              </Button>
            </div>

            <div className="border border-border rounded-lg max-h-[260px] overflow-y-auto divide-y divide-border/60">
              {pendingOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  웨이브로 묶을 수 있는 미출고 대기 주문이 없습니다.
                </div>
              ) : (
                pendingOrders.map((order, idx) => {
                  const isSelected = selectedOrderIds.includes(order.id)
                  const itemsCount = (order.order_items || []).length
                  const totalUnits = (order.order_items || []).reduce((sum, oi) => sum + (oi.qty || 0), 0)

                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleSelectOrder(order.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-500/10 dark:bg-blue-950/40" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-foreground">
                              #{order.order_no || order.id.slice(0, 8)}
                            </span>
                            <span className="font-semibold text-xs text-foreground">
                              {order.store?.name || "Unknown Store"}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {itemsCount}종 ({totalUnits}개)
                        </Badge>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-blue-400 font-mono">
                            Tote #{selectedOrderIds.indexOf(order.id) + 1}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Cart Preview Warning */}
          {selectedOrderIds.length > 8 && (
            <div className="rounded-lg bg-amber-500/15 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>
                선택된 주문({selectedOrderIds.length}건)이 표준 8단 피킹 카트 규격을 초과합니다. 대형 카트 또는 2개 웨이브 분할을 권장합니다.
              </span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedOrderIds.length === 0}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedOrderIds.length}개 주문으로 웨이브 생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
