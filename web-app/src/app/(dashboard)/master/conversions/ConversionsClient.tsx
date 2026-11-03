"use client"

import * as React from "react"
import { useState } from "react"
import { Plus, Split, Layers, CheckCircle2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ItemConversion } from "@/services/conversion.service"
import { ConversionsTable } from "@/components/features/master/ConversionsTable"
import { ConversionFormDialog } from "@/components/features/master/ConversionFormDialog"
import { ManualDekitDialog } from "@/components/features/master/ManualDekitDialog"
import {
  createConversionAction,
  deleteConversionAction,
  toggleAutoDekitAction,
  manualDekitAction,
} from "./actions"

interface ConversionsClientProps {
  initialConversions: ItemConversion[];
  items: Array<{ id: string; sku: string; name_en: string; uom: string }>;
  locations: Array<{ id: string; code: string; zone_type: string }>;
}

export function ConversionsClient({
  initialConversions,
  items,
  locations,
}: ConversionsClientProps) {
  const [conversions, setConversions] = useState<ItemConversion[]>(initialConversions)
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [dekitOpen, setDekitOpen] = useState<boolean>(false)
  const [selectedConversion, setSelectedConversion] = useState<ItemConversion | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  React.useEffect(() => {
    setConversions(initialConversions)
  }, [initialConversions])

  const totalRules = conversions.length
  const autoActiveCount = conversions.filter((c) => c.auto_dekit_on_order).length
  const uniqueBinsCount = new Set(
    conversions.map((c) => c.target_location?.code).filter(Boolean)
  ).size

  const handleCreate = async (formData: FormData) => {
    setLoading(true)
    try {
      const res = await createConversionAction(formData)
      if (res.error) {
        alert("오류: " + res.error)
      } else {
        setFormOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 번들 해체 변환 규칙을 삭제하시겠습니까?")) return
    setLoading(true)
    try {
      const res = await deleteConversionAction(id)
      if (res.error) {
        alert("오류: " + res.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAuto = async (id: string, currentState: boolean) => {
    setLoading(true)
    try {
      const res = await toggleAutoDekitAction(id, currentState)
      if (res.error) {
        alert("오류: " + res.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleManualDekit = async (parentItemId: string, parentQty: number) => {
    setLoading(true)
    try {
      const res = await manualDekitAction(parentItemId, parentQty)
      if (res.error) {
        alert("해체 실행 실패: " + res.error)
      } else {
        alert(`✅ 해체 완료! 부모 -${res.data?.parent_deducted}개, 자식 +${res.data?.child_added}개 정상 증액되었습니다.`)
        setDekitOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDekit = (conv: ItemConversion) => {
    setSelectedConversion(conv)
    setDekitOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 & 등록 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Split className="size-5 text-primary" />
            <span>Bundle Conversions (De-kit Rules)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            멀티팩/박스 품목을 낱개(Single) 품목으로 자동 또는 수동 해체하는 비즈니스 환산 규칙을 관리합니다.
          </p>
        </div>

        <Button
          onClick={() => setFormOpen(true)}
          className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-xs"
        >
          <Plus className="size-4" />
          <span>신규 번들 규칙 등록</span>
        </Button>
      </div>

      {/* 통계 요약 카드 3종 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              등록된 변환 규칙
            </CardTitle>
            <Layers className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{totalRules} <span className="text-xs font-normal text-muted-foreground">개</span></div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              주문 자동 해체 (Auto De-kit)
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{autoActiveCount} <span className="text-xs font-normal text-muted-foreground">개 활성</span></div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              지정 입고 로케이션
            </CardTitle>
            <MapPin className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{uniqueBinsCount} <span className="text-xs font-normal text-muted-foreground">개 랙</span></div>
          </CardContent>
        </Card>
      </div>

      {/* 변환 규칙 테이블 */}
      <ConversionsTable
        conversions={conversions}
        onDelete={handleDelete}
        onToggleAuto={handleToggleAuto}
        onOpenDekit={handleOpenDekit}
        loading={loading}
      />

      {/* 신규 등록 모달 */}
      <ConversionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        items={items}
        locations={locations}
        onSubmit={handleCreate}
        loading={loading}
      />

      {/* 즉시 수동 해체 모달 */}
      <ManualDekitDialog
        open={dekitOpen}
        onOpenChange={setDekitOpen}
        conversion={selectedConversion}
        onExecute={handleManualDekit}
        loading={loading}
      />
    </div>
  )
}

