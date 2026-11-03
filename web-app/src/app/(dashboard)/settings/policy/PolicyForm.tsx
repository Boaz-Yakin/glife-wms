"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, Sliders, ShieldCheck, Box, Flame, Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { TenantSettings } from "@/lib/tenant/types"
import { updateTenantPolicyAction } from "./actions"

interface PolicyFormProps {
  initialSettings: TenantSettings;
  locations: Array<{ id: string; code: string; zone_type: string }>;
}

export function PolicyForm({ initialSettings, locations }: PolicyFormProps) {
  const [stockPolicy, setStockPolicy] = useState<string>(initialSettings?.stock_policy || "HARD_LIMIT")
  const [perishable, setPerishable] = useState<boolean>(initialSettings?.perishable_mode ?? true)
  const [autoDekit, setAutoDekit] = useState<boolean>(initialSettings?.auto_dekit_enabled ?? true)
  const [dekitLoc, setDekitLoc] = useState<string>(initialSettings?.default_dekit_location_id || "none")
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("stock_policy", stockPolicy)
      formData.set("perishable_mode", perishable ? "true" : "false")
      formData.set("auto_dekit_enabled", autoDekit ? "true" : "false")
      formData.set("default_dekit_location_id", dekitLoc)

      const res = await updateTenantPolicyAction(formData)
      if (res.error) {
        alert("오류: " + res.error)
      } else {
        alert("✅ 테넌트 운영 정책이 성공적으로 저장되었습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. 재고 할당 정책 */}
      <Card className="shadow-2xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle className="text-base font-bold">재고 할당 및 주문 인입 정책 (Stock Allocation Policy)</CardTitle>
          </div>
          <CardDescription>
            주문 인입 시 실재고 수량과 가용 재고 검증 방식을 정의합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setStockPolicy("HARD_LIMIT")}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                stockPolicy === "HARD_LIMIT"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm">HARD_LIMIT (엄격한 실재고 차단)</span>
                <span className={`size-3 rounded-full ${stockPolicy === "HARD_LIMIT" ? "bg-primary" : "bg-muted"}`} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                창고 보유 재고가 부족할 경우 주문 등록 및 출고 할당을 엄격히 차단합니다. (마이너스 재고 발생 원천 방지)
              </p>
            </div>

            <div
              onClick={() => setStockPolicy("BACKORDER")}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                stockPolicy === "BACKORDER"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm">BACKORDER (백오더 및 음수 재고 허용)</span>
                <span className={`size-3 rounded-full ${stockPolicy === "BACKORDER" ? "bg-primary" : "bg-muted"}`} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                재고가 부족하더라도 주문을 우선 접수하고 백오더 큐로 이관합니다. (입고 예정 물량이 확실한 도매형 창고 권장)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 유통기한 및 FEFO 선석출 */}
      <Card className="shadow-2xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-amber-500" />
            <CardTitle className="text-base font-bold">식품/유통기한 FEFO 모드 (Perishable Mode)</CardTitle>
          </div>
          <CardDescription>
            유통기한이 임박한 재고를 피킹 동선에서 우선적으로 추천할지 여부를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="perishable_check"
              checked={perishable}
              onCheckedChange={(checked) => setPerishable(!!checked)}
              className="mt-0.5"
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="perishable_check" className="font-bold text-sm cursor-pointer">
                FEFO (First-Expired, First-Out) 선석출 강제 활성화
              </Label>
              <p className="text-xs text-muted-foreground">
                활성화 시, 동일 품목이라도 유통기한(Expiration Date)이 가장 빠른 로케이션의 재고를 작업자에게 우선 할당합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 번들 자동 해체 정책 */}
      <Card className="shadow-2xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Box className="size-5 text-blue-500" />
            <CardTitle className="text-base font-bold">번들 멀티팩 자동 해체 정책 (Auto De-kit Rules)</CardTitle>
          </div>
          <CardDescription>
            낱개 품목 주문 시 번들/박스 재고를 자동으로 분할하여 입고할 기본 규칙을 정의합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="auto_dekit_check"
              checked={autoDekit}
              onCheckedChange={(checked) => setAutoDekit(!!checked)}
              className="mt-0.5"
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="auto_dekit_check" className="font-bold text-sm cursor-pointer">
                전역 멀티팩/박스 자동 해체 (Auto De-kitting on Shortage) 활성화
              </Label>
              <p className="text-xs text-muted-foreground">
                낱개 재고가 부족할 때, 변환 규칙에 등록된 부모 박스/멀티팩을 차감하여 필요한 낱개 수량을 자동 보충합니다.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="default_dekit_loc" className="text-xs font-semibold">
              기본 해체 입고 로케이션 (Default De-kit Bin)
            </Label>
            <Select value={dekitLoc} onValueChange={(val) => setDekitLoc(val || "none")}>
              <SelectTrigger id="default_dekit_loc" className="w-full max-w-md">
                <SelectValue placeholder="기본 해체 입고 로케이션 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">개별 변환 규칙에 지정된 로케이션 사용</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.code} (Zone {loc.zone_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              변환 규칙에서 로케이션이 비어있는 경우, 해체된 낱개 재고가 이 랙으로 자동 입고됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground font-bold px-6 shadow-xs"
        >
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          정책 변경사항 저장
        </Button>
      </div>
    </form>
  )
}
