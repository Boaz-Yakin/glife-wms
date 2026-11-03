"use client"

import * as React from "react"
import { useState } from "react"
import { ArrowRight, Trash2, Split, CheckCircle2, XCircle, Search, Layers } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ItemConversion } from "@/services/conversion.service"

interface ConversionsTableProps {
  conversions: ItemConversion[];
  onDelete: (id: string) => Promise<void>;
  onToggleAuto: (id: string, currentState: boolean) => Promise<void>;
  onOpenDekit: (conversion: ItemConversion) => void;
  loading: boolean;
}

export function ConversionsTable({
  conversions,
  onDelete,
  onToggleAuto,
  onOpenDekit,
  loading,
}: ConversionsTableProps) {
  const [filter, setFilter] = useState<string>("")

  const filtered = conversions.filter((c) => {
    const q = filter.toLowerCase().trim()
    if (!q) return true
    const parentSku = c.parent_item?.sku?.toLowerCase() || ""
    const parentName = c.parent_item?.name_en?.toLowerCase() || ""
    const childSku = c.child_item?.sku?.toLowerCase() || ""
    const childName = c.child_item?.name_en?.toLowerCase() || ""
    const loc = c.target_location?.code?.toLowerCase() || ""
    return (
      parentSku.includes(q) ||
      parentName.includes(q) ||
      childSku.includes(q) ||
      childName.includes(q) ||
      loc.includes(q)
    )
  })

  return (
    <div className="space-y-3">
      {/* 검색 바 */}
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="부모/자식 품목 SKU, 명칭 또는 로케이션 검색..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-bold text-xs">부모 품목 (Multi / Box / Pack)</TableHead>
              <TableHead className="font-bold text-xs text-center w-28">환산 배율</TableHead>
              <TableHead className="font-bold text-xs">자식 품목 (Single / EA)</TableHead>
              <TableHead className="font-bold text-xs">입고 로케이션</TableHead>
              <TableHead className="font-bold text-xs text-center">주문 시 자동 해체</TableHead>
              <TableHead className="font-bold text-xs text-right pr-4">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Layers className="size-6 text-muted-foreground/40" />
                    <span>등록된 번들 해체 변환 규칙이 없습니다.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((conv) => (
                <TableRow key={conv.id} className="hover:bg-muted/40 transition-colors">
                  {/* 부모 품목 */}
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {conv.parent_item?.sku || "—"}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold">
                          {conv.parent_item?.uom || "PK"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={conv.parent_item?.name_en}>
                        {conv.parent_item?.name_en || "Unknown Item"}
                      </span>
                    </div>
                  </TableCell>

                  {/* 환산 배율 */}
                  <TableCell className="text-center py-2.5">
                    <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full text-xs font-mono font-black text-primary">
                      <span>1 {conv.parent_item?.uom || "PK"}</span>
                      <ArrowRight className="size-3 text-primary/70" />
                      <span>{conv.conversion_ratio} {conv.child_item?.uom || "EA"}</span>
                    </div>
                  </TableCell>

                  {/* 자식 품목 */}
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {conv.child_item?.sku || "—"}
                        </span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1 font-semibold">
                          {conv.child_item?.uom || "EA"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={conv.child_item?.name_en}>
                        {conv.child_item?.name_en || "Unknown Item"}
                      </span>
                    </div>
                  </TableCell>

                  {/* 입고 로케이션 */}
                  <TableCell className="py-2.5 text-xs font-mono">
                    {conv.target_location ? (
                      <Badge variant="outline" className="bg-muted font-bold text-[11px]">
                        {conv.target_location.code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">보유 로케이션 유지</span>
                    )}
                  </TableCell>

                  {/* 자동 해체 토글 */}
                  <TableCell className="text-center py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleAuto(conv.id, conv.auto_dekit_on_order)}
                      disabled={loading}
                      className="cursor-pointer inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      {conv.auto_dekit_on_order ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 py-0.5">
                          <CheckCircle2 className="size-3" />
                          <span>AUTO ON</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold gap-1 py-0.5">
                          <XCircle className="size-3" />
                          <span>OFF</span>
                        </Badge>
                      )}
                    </button>
                  </TableCell>

                  {/* 작업 버튼 */}
                  <TableCell className="text-right py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => onOpenDekit(conv)}
                        className="text-[11px] font-bold gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                        title="부모 재고를 차감하고 낱개 재고로 즉시 해체"
                      >
                        <Split className="size-3" />
                        <span>즉시 해체</span>
                      </Button>

                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => onDelete(conv.id)}
                        disabled={loading}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="규칙 삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

