"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface ItemOption {
  id: string;
  sku: string;
  name_en: string;
  uom: string;
}

interface LocationOption {
  id: string;
  code: string;
  zone_type: string;
}

interface ConversionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemOption[];
  locations: LocationOption[];
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
}

export function ConversionFormDialog({
  open,
  onOpenChange,
  items,
  locations,
  onSubmit,
  loading,
}: ConversionFormDialogProps) {
  const [parentId, setParentId] = useState<string>("")
  const [childId, setChildId] = useState<string>("")
  const [targetLocId, setTargetLocId] = useState<string>("none")
  const [ratio, setRatio] = useState<number>(5)
  const [autoDekit, setAutoDekit] = useState<boolean>(true)

  React.useEffect(() => {
    if (open) {
      setParentId("")
      setChildId("")
      setTargetLocId("none")
      setRatio(5)
      setAutoDekit(true)
    }
  }, [open])

  const selectedParent = items.find((i) => i.id === parentId)
  const selectedChild = items.find((i) => i.id === childId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Register Bundle Conversion (De-kit)</DialogTitle>
          <DialogDescription>
            멀티팩/박스 품목을 낱개(Single) 품목으로 자동 또는 수동 해체할 변환 규칙을 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4 pt-2">
          <input type="hidden" name="parent_item_id" value={parentId} />
          <input type="hidden" name="child_item_id" value={childId} />
          <input type="hidden" name="target_location_id" value={targetLocId === "none" ? "" : targetLocId} />
          <input type="hidden" name="auto_dekit_on_order" value={autoDekit ? "true" : "false"} />

          {/* 부모 품목 */}
          <div className="space-y-1.5">
            <Label htmlFor="parent_select" className="text-xs font-semibold">
              부모 품목 (Parent Multi / Box / Pack) <span className="text-red-500">*</span>
            </Label>
            <Select value={parentId} onValueChange={(val) => setParentId(val || "")} required>
              <SelectTrigger id="parent_select" className="w-full">
                <SelectValue placeholder="해체할 부모 번들 품목 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id} disabled={it.id === childId}>
                    [{it.sku}] {it.name_en} ({it.uom})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 자식 품목 */}
          <div className="space-y-1.5">
            <Label htmlFor="child_select" className="text-xs font-semibold">
              자식 품목 (Child Single / EA) <span className="text-red-500">*</span>
            </Label>
            <Select value={childId} onValueChange={(val) => setChildId(val || "")} required>
              <SelectTrigger id="child_select" className="w-full">
                <SelectValue placeholder="해체되어 생성될 낱개 품목 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id} disabled={it.id === parentId}>
                    [{it.sku}] {it.name_en} ({it.uom})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 환산 배율 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="conversion_ratio" className="text-xs font-semibold">
                환산 배율 (Conversion Ratio) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="conversion_ratio"
                name="conversion_ratio"
                type="number"
                min="1"
                value={ratio}
                onChange={(e) => setRatio(parseInt(e.target.value) || 1)}
                required
                className="font-mono font-bold"
              />
              <p className="text-[11px] text-muted-foreground">
                1 {selectedParent?.uom || "PK"} = {ratio} {selectedChild?.uom || "EA"}
              </p>
            </div>

            {/* 입고 로케이션 */}
            <div className="space-y-1.5">
              <Label htmlFor="location_select" className="text-xs font-semibold">
                해체 입고 로케이션 (Target Bin)
              </Label>
              <Select value={targetLocId} onValueChange={(val) => setTargetLocId(val || "none")}>
                <SelectTrigger id="location_select">
                  <SelectValue placeholder="기본 로케이션 선택" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">자동 지정 (출처 위치 유지)</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} (Zone {loc.zone_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 자동 해체 스위치 */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="auto_dekit"
              checked={autoDekit}
              onCheckedChange={(checked) => setAutoDekit(!!checked)}
            />
            <div className="grid gap-0.5 leading-none">
              <Label htmlFor="auto_dekit" className="text-xs font-medium cursor-pointer">
                주문 인입 시 낱개 결품 시 자동 해체 (Auto De-kit on Order)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                활성화 시, 낱개 재고가 부족할 때 창고 작업자가 피킹할 수 있도록 부모 재고를 자동 해체합니다.
              </p>
            </div>
          </div>

          {/* 비고 */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs font-semibold">비고 / 메모 (Optional)</Label>
            <Input id="note" name="note" placeholder="e.g. 신라면 멀티 5pk -> 낱개 자동 분할" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || !parentId || !childId || ratio <= 0}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              규칙 저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
