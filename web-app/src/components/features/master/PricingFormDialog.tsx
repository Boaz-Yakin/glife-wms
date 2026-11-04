"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Loader2, DollarSign, Percent } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type StoreItemPriceData, type PriceTier } from "@/services/pricing.service"

export interface PricingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
  pricing?: StoreItemPriceData | null
  items: Array<{
    id: string
    name_en: string
    sku: string
    unit_price?: number | null
    box_price?: number | null
    pack_price?: number | null
  }>
  stores: Array<{ id: string; name: string; store_no: string; price_tier?: string }>
  clients: Array<{ id: string; name: string; code: string }>
  activeClientId: string | null
}

export function PricingFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  pricing,
  items,
  stores,
  clients,
  activeClientId,
}: PricingFormDialogProps) {
  const [targetType, setTargetType] = useState<"TIER" | "STORE">("TIER")
  const [priceTier, setPriceTier] = useState<PriceTier>("VIP")
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [selectedItemId, setSelectedItemId] = useState<string>("")
  const [uom, setUom] = useState<string>("EA")
  const [customPrice, setCustomPrice] = useState<string>("")

  const selectedItem = items.find((i) => i.id === selectedItemId)

  useEffect(() => {
    if (open) {
      if (pricing) {
        setTargetType(pricing.store_id ? "STORE" : "TIER")
        setPriceTier(pricing.price_tier || "VIP")
        setSelectedStoreId(pricing.store_id || "")
        setSelectedItemId(pricing.item_id)
        setUom(pricing.uom || "EA")
        setCustomPrice(String(pricing.custom_price || 0))
      } else {
        setTargetType("TIER")
        setPriceTier("VIP")
        setSelectedStoreId(stores[0]?.id || "")
        setSelectedItemId(items[0]?.id || "")
        setUom("EA")
        setCustomPrice("")
      }
    }
  }, [open, pricing, items, stores])

  // Compute master reference price
  const masterBasePrice = React.useMemo(() => {
    if (!selectedItem) return 0
    if (uom === "BOX") return Number(selectedItem.box_price || selectedItem.unit_price || 0)
    if (uom === "PACK") return Number(selectedItem.pack_price || selectedItem.unit_price || 0)
    return Number(selectedItem.unit_price || 0)
  }, [selectedItem, uom])

  // Compute discount or markup percentage
  const priceDiffPercentage = React.useMemo(() => {
    const entered = parseFloat(customPrice)
    if (isNaN(entered) || masterBasePrice <= 0) return null
    const diff = ((entered - masterBasePrice) / masterBasePrice) * 100
    return Math.round(diff * 10) / 10
  }, [customPrice, masterBasePrice])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {pricing ? "특수 지정 단가 수정" : "특수 지정 단가 등록"}
          </DialogTitle>
          <DialogDescription>
            거래처 등급(Tier) 또는 특정 가맹점(Store)을 대상으로 마스터 품목 기준가를 오버라이드할 특수 단가를 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          {pricing && <input type="hidden" name="id" value={pricing.id} />}
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="client_id" value={activeClientId || clients[0]?.id || ""} />

          {/* Target Type Selector: Tier vs Specific Store */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              적용 대상 (Target Scope)
            </Label>
            <Tabs value={targetType} onValueChange={(val) => setTargetType(val as "TIER" | "STORE")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="TIER">등급 전체 (Tier-wide)</TabsTrigger>
                <TabsTrigger value="STORE">특정 매장 (Store-specific)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {targetType === "TIER" ? (
            <div className="space-y-1.5">
              <Label htmlFor="price_tier">적용 등급 (Price Tier)</Label>
              <input type="hidden" name="price_tier" value={priceTier} />
              <Select value={priceTier} onValueChange={(val) => setPriceTier(val as PriceTier)}>
                <SelectTrigger id="price_tier">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP">VIP (최우수 공급가)</SelectItem>
                  <SelectItem value="WHOLESALE">WHOLESALE (도매/대량)</SelectItem>
                  <SelectItem value="STANDARD">STANDARD (기본 가맹점)</SelectItem>
                  <SelectItem value="RETAIL">RETAIL (일반 소매)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="store_id">적용 매장 (Store)</Label>
              <input type="hidden" name="store_id" value={selectedStoreId} />
              <Select value={selectedStoreId} onValueChange={(val) => setSelectedStoreId(val || "")}>
                <SelectTrigger id="store_id">
                  <SelectValue placeholder="매장 선택" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      [{s.store_no}] {s.name} ({s.price_tier || "STANDARD"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Item Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="item_id">품목 (Item / SKU)</Label>
            <input type="hidden" name="item_id" value={selectedItemId} />
            <Select value={selectedItemId} onValueChange={(val) => setSelectedItemId(val || "")}>
              <SelectTrigger id="item_id">
                <SelectValue placeholder="품목 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-[240px]">
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    [{i.sku}] {i.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* UOM & Price Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="uom">단위 (UOM)</Label>
              <input type="hidden" name="uom" value={uom} />
              <Select value={uom} onValueChange={(val) => setUom(val || "EA")}>
                <SelectTrigger id="uom">
                  <SelectValue placeholder="UOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EA">EA (개별)</SelectItem>
                  <SelectItem value="BOX">BOX (박스)</SelectItem>
                  <SelectItem value="PACK">PACK (팩)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom_price">지정 공급 단가 (₩ / $)</Label>
              <div className="relative">
                <Input
                  id="custom_price"
                  name="custom_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="font-mono pr-8"
                />
                <DollarSign className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Master Base Price Comparison HUD */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-xs flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-muted-foreground">마스터 기본가 ({uom}):</span>
              <span className="font-mono font-semibold text-sm">
                ₩{masterBasePrice.toLocaleString()}
              </span>
            </div>
            {priceDiffPercentage !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">할인/인상:</span>
                <span
                  className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                    priceDiffPercentage < 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : priceDiffPercentage > 0
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {priceDiffPercentage > 0 ? `+${priceDiffPercentage}%` : `${priceDiffPercentage}%`}
                </span>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note">단가 적용 사유 / 메모</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="예: 2026 하반기 VIP 프로모션 특가 적용"
              rows={2}
              defaultValue={pricing?.note || ""}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pricing ? "단가 변경 저장" : "특수 단가 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
