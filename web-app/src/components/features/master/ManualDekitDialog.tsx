"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, ArrowRight, Sparkles } from "lucide-react"

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
import { ItemConversion } from "@/services/conversion.service"

interface ManualDekitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversion: ItemConversion | null;
  onExecute: (parentItemId: string, parentQty: number) => Promise<void>;
  loading: boolean;
}

export function ManualDekitDialog({
  open,
  onOpenChange,
  conversion,
  onExecute,
  loading,
}: ManualDekitDialogProps) {
  const [qty, setQty] = useState<number>(1)

  React.useEffect(() => {
    if (open) {
      setQty(1)
    }
  }, [open])

  if (!conversion) return null

  const ratio = conversion.conversion_ratio || 1
  const expectedChildQty = qty * ratio

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qty <= 0) return
    await onExecute(conversion.parent_item_id, qty)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="size-4" />
            <span>즉시 번들 해체 (Manual De-kit Execution)</span>
          </div>
          <DialogTitle className="text-base font-bold pt-1">
            [{conversion.parent_item?.sku}] {conversion.parent_item?.name_en}
          </DialogTitle>
          <DialogDescription>
            부모 재고를 차감하고, 환산 배율에 맞춰 낱개 자식 재고를 즉시 증액합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRun} className="space-y-4 pt-2">
          {/* 변환 다이어그램 */}
          <div className="rounded-lg bg-muted/60 p-3.5 border border-border/80 flex items-center justify-between text-xs font-semibold">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">차감 대상 (부모)</span>
              <span className="font-bold text-foreground">
                [{conversion.parent_item?.sku}]
              </span>
              <span className="text-[11px] text-destructive font-mono font-black mt-0.5">
                -{qty} {conversion.parent_item?.uom || "PK"}
              </span>
            </div>

            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] text-primary font-black mb-1">x {ratio}</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] text-muted-foreground uppercase">증액 대상 (자식)</span>
              <span className="font-bold text-foreground">
                [{conversion.child_item?.sku}]
              </span>
              <span className="text-[11px] text-emerald-600 font-mono font-black mt-0.5">
                +{expectedChildQty} {conversion.child_item?.uom || "EA"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dekit_qty" className="text-xs font-semibold">
              해체할 부모 수량 입력 ({conversion.parent_item?.uom || "PK"}) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dekit_qty"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              required
              className="font-mono text-base font-bold"
              autoFocus
            />
          </div>

          <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
            입고 랙: <strong>{conversion.target_location?.code || "보유 로케이션"}</strong>에 즉시 반영되며, 재고 실사 조정 원장에 감사 로그가 자동 기록됩니다.
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || qty <= 0}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              해체 실행 (Execute)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

