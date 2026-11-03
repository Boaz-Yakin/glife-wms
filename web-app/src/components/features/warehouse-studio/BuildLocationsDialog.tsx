"use client"

import React, { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  StudioNode,
  generateLocationsFromNodes,
  GeneratedLocationItem,
} from "@/types/warehouse-studio"
import { buildLocationsFromStudioAction } from "@/app/(dashboard)/master/warehouse-studio/actions"
import { toast } from "sonner"
import { CheckCircle2, QrCode, ArrowRight, Loader2, Database } from "lucide-react"
import Link from "next/link"

interface BuildLocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: StudioNode[]
}

export function BuildLocationsDialog({
  open,
  onOpenChange,
  nodes,
}: BuildLocationsDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [syncedCount, setSyncedCount] = useState<number | null>(null)

  const generatedList: GeneratedLocationItem[] = React.useMemo(() => {
    return generateLocationsFromNodes(nodes)
  }, [nodes])

  // Count by zone
  const zoneCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of generatedList) {
      const z = item.code.split("-")[1]?.[0] || item.zone_type
      counts[z] = (counts[z] || 0) + 1
    }
    return counts
  }, [generatedList])

  const handleBuild = () => {
    startTransition(async () => {
      try {
        const res = await buildLocationsFromStudioAction(nodes)
        if (res.error) {
          toast.error("로케이션 빌드 실패", { description: res.error })
        } else {
          setSyncedCount(res.count)
          toast.success("로케이션 동기화 완료!", {
            description: `총 ${res.count}개의 창고 로케이션이 데이터베이스에 등록되었습니다.`,
          })
        }
      } catch (err: any) {
        toast.error("오류 발생", { description: err.message })
      }
    })
  }

  const handleClose = () => {
    setSyncedCount(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Database className="w-5 h-5 text-emerald-500" />
            2D 캔버스 기반 로케이션 일괄 생성 및 DB 동기화
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            현재 캔버스에 배치된 보관 랙/스테이징 구역의 좌표와 단수/칸수 규격을 분석하여 표준 WMS 로케이션 코드를 자동 생성합니다.
          </DialogDescription>
        </DialogHeader>

        {syncedCount === null ? (
          <div className="space-y-4 py-2">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg border border-border bg-background/50">
                <span className="text-[11px] text-muted-foreground block">생성 대상 로케이션</span>
                <span className="text-xl font-bold text-foreground">
                  {generatedList.length}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">개</span>
                </span>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <span className="text-[11px] text-emerald-400 block font-medium">상온 보관 (Zone A)</span>
                <span className="text-xl font-bold text-emerald-300">
                  {zoneCounts["A"] || 0}
                  <span className="text-xs font-normal text-emerald-400 ml-0.5">개</span>
                </span>
              </div>
              <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                <span className="text-[11px] text-cyan-400 block font-medium">냉동/냉장 (Zone F)</span>
                <span className="text-xl font-bold text-cyan-300">
                  {zoneCounts["F"] || 0}
                  <span className="text-xs font-normal text-cyan-400 ml-0.5">개</span>
                </span>
              </div>
            </div>

            {/* Preview Codes */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>자동 생성될 바코드 코드 샘플 (상위 12개)</span>
                <span className="text-[11px] text-emerald-400">규격: LOC-{`{Zone}{Rack}{Bay}{Level}{Bin}`}</span>
              </div>
              <div className="bg-background border border-border rounded-lg p-3 max-h-44 overflow-y-auto grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                {generatedList.slice(0, 18).map((item) => (
                  <div
                    key={item.code}
                    className="p-1 rounded bg-muted/40 border border-border/50 flex items-center justify-between text-foreground"
                  >
                    <span>{item.code}</span>
                    <span className="text-[9px] text-muted-foreground px-1 py-0.2 rounded bg-black/20">
                      {item.temperature_zone === "FROZEN" ? "❄️" : "☀️"}
                    </span>
                  </div>
                ))}
                {generatedList.length > 18 && (
                  <div className="col-span-3 text-center py-1 text-muted-foreground text-[10px]">
                    ... 외 {generatedList.length - 18}개 로케이션 추가 생성 예정
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <p className="leading-relaxed">
                동일한 로케이션 코드가 이미 존재하는 경우 기존 2D 좌표와 온도대 정보가 갱신(Upsert)되며, 기존에 적치된 재고 데이터는 손실 없이 안전하게 유지됩니다.
              </p>
            </div>
          </div>
        ) : (
          /* Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">
                총 {syncedCount}개 로케이션 DB 동기화 완료!
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                2D 캔버스에 배치된 모든 랙의 위치 좌표와 로케이션 코드가 성공적으로 등록되었습니다. 즉시 바코드 라벨을 출력할 수 있습니다.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Link href="/master/labels" onClick={handleClose}>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs">
                  <QrCode className="w-4 h-4" />
                  바코드 라벨 인쇄 센터로 이동
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {syncedCount === null ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
                className="text-xs"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleBuild}
                disabled={isPending || generatedList.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    DB 동기화 생성 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    로케이션 일괄 생성 및 DB 적용 ({generatedList.length}개)
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
              닫기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
