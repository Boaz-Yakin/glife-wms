"use client"

import * as React from "react"
import { useState } from "react"
import {
  TrendingDown,
  AlertTriangle,
  Boxes,
  Truck,
  Plus,
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Loader2,
  BadgeAlert,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VmiItemStock, InboundAsn } from "@/services/vendor-vmi.service"
import {
  fetchVmiStockAction,
  fetchAsnListAction,
  submitAsnServerAction,
} from "@/app/(dashboard)/vendor/vmi/actions"

interface VendorVmiClientProps {
  initialPartners: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
  initialItems: VmiItemStock[]
  initialAsns: InboundAsn[]
}

export function VendorVmiClient({
  initialPartners,
  initialItems,
  initialAsns,
}: VendorVmiClientProps) {
  const [partners] = useState(initialPartners)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    partners[0]?.id || ""
  )
  const [items, setItems] = useState<VmiItemStock[]>(initialItems)
  const [asns, setAsns] = useState<InboundAsn[]>(initialAsns)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  // ASN Creation Modal
  const [asnModalOpen, setAsnModalOpen] = useState(false)
  const [submittingAsn, setSubmittingAsn] = useState(false)
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  )
  const [carrierName, setCarrierName] = useState("CJ대한통운")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [asnNote, setAsnNote] = useState("")
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.itemId || "")
  const [expectedQty, setExpectedQty] = useState(100)
  const [lotNo, setLotNo] = useState("LOT-202611-01")

  // ASN Detail Modal
  const [selectedAsnForDetail, setSelectedAsnForDetail] = useState<InboundAsn | null>(null)

  const handlePartnerChange = async (partnerId: string) => {
    setSelectedPartnerId(partnerId)
    setLoading(true)
    const [stockRes, asnRes] = await Promise.all([
      fetchVmiStockAction(partnerId),
      fetchAsnListAction(partnerId),
    ])
    setLoading(false)
    if (stockRes.items) setItems(stockRes.items)
    if (asnRes.asns) setAsns(asnRes.asns)
  }

  const handleCreateAsn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId || expectedQty <= 0) {
      toast.error("입고 예정 품목과 수량을 확인해주세요.")
      return
    }

    setSubmittingAsn(true)
    const res = await submitAsnServerAction({
      partnerId: selectedPartnerId,
      expectedDeliveryDate: expectedDate,
      carrierName,
      trackingNumber,
      note: asnNote,
      items: [
        {
          itemId: selectedItemId,
          expectedQty,
          lotNo,
          expirationDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        },
      ],
    })
    setSubmittingAsn(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`사전 입고 예정 통지(${res.asnNo})가 제출되었습니다.`)
      setAsnModalOpen(false)
      // 새로고침
      const asnRes = await fetchAsnListAction(selectedPartnerId)
      if (asnRes.asns) setAsns(asnRes.asns)
    }
  }

  // Filtered items
  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  )

  // Top KPI calculations
  const totalAvailableStock = items.reduce((acc, i) => acc + i.availableStock, 0)
  const criticalItemsCount = items.filter((i) => i.stockStatus === "CRITICAL" || i.stockStatus === "WARNING").length
  const inTransitAsnCount = asns.filter((a) => a.status === "IN_TRANSIT" || a.status === "SUBMITTED").length
  const inTransitQty = asns
    .filter((a) => a.status === "IN_TRANSIT" || a.status === "SUBMITTED")
    .reduce((acc, a) => acc + a.totalExpectedQty, 0)

  const getStatusBadge = (status: VmiItemStock["stockStatus"]) => {
    switch (status) {
      case "CRITICAL":
        return <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-400 font-bold text-[10px]">긴급 보충 (품절 임박)</Badge>
      case "WARNING":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400 font-medium text-[10px]">재고 부족 경보</Badge>
      case "OVERSTOCK":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400 text-[10px]">과다 재고</Badge>
      default:
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400 text-[10px]">안정 (Healthy)</Badge>
    }
  }

  const getAsnStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">입고 완료</Badge>
      case "IN_TRANSIT":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">배송/운송 중</Badge>
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">사전 접수</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Partner Selector & Quick Actions ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                공급 협력업체 (Supplier Partner)
              </span>
              <select
                value={selectedPartnerId}
                onChange={(e) => handlePartnerChange(e.target.value)}
                className="h-8 text-xs font-bold rounded-md border border-input bg-background px-2 text-foreground mt-0.5"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.contact_person ? `(${p.contact_person})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePartnerChange(selectedPartnerId)}
              disabled={loading}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              실시간 재고 새로고침
            </Button>
            <Button
              size="sm"
              onClick={() => setAsnModalOpen(true)}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              사전 입고(ASN) 등록
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                위탁 관리 품목
              </span>
              <span className="text-xl font-black text-foreground">{items.length}개 SKU</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                창고 보관 가용 재고
              </span>
              <span className="text-xl font-black text-foreground">
                {totalAvailableStock.toLocaleString()} EA
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                보충 권고 품목 (위험)
              </span>
              <span className="text-xl font-black text-rose-600">
                {criticalItemsCount}개 SKU
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                입고 진행 중 (ASN)
              </span>
              <span className="text-xl font-black text-foreground">
                {inTransitAsnCount}건 ({inTransitQty.toLocaleString()} EA)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabs: Inventory / ASN / Slip ── */}
      <Tabs defaultValue="inventory" className="w-full space-y-4">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="inventory" className="text-xs font-semibold gap-1.5">
            <Boxes className="w-3.5 h-3.5" />
            실시간 재고 & 소진율 분석
          </TabsTrigger>
          <TabsTrigger value="asn" className="text-xs font-semibold gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            사전 입고 예정(ASN) 관리
            {asns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-muted-foreground/20 text-[10px]">
                {asns.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Inventory & Runout Date ── */}
        <TabsContent value="inventory" className="space-y-4">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    공급사 위탁 재고 실시간 모니터링 (VMI)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    최근 30일간 일평균 출고 속도를 바탕으로 품절 위험 일자(Runout Date)를 자동 예측합니다.
                  </CardDescription>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="상품명, SKU 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>품목 정보 (SKU / 상품명)</TableHead>
                    <TableHead>현재 가용 재고</TableHead>
                    <TableHead>안전 재고</TableHead>
                    <TableHead>일평균 출고량</TableHead>
                    <TableHead className="w-[180px]">소진/충족 상태</TableHead>
                    <TableHead>예상 품절 일자</TableHead>
                    <TableHead className="w-[90px] text-right">보충 발주</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        조회된 위탁 품목이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.itemId} className="text-xs hover:bg-muted/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{item.name}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {item.sku} {item.spec ? `· ${item.spec}` : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono">
                          <span className="font-bold text-foreground">{item.availableStock.toLocaleString()} EA</span>
                          <span className="text-[10px] text-muted-foreground block">
                            (총 {item.currentStock} / 할당 {item.allocatedStock})
                          </span>
                        </TableCell>

                        <TableCell className="font-mono text-muted-foreground">
                          {item.minStockQty} EA
                        </TableCell>

                        <TableCell className="font-mono font-medium text-foreground">
                          {item.dailyAvgOutflow} EA/일
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span>{getStatusBadge(item.stockStatus)}</span>
                              <span className="font-mono text-muted-foreground">{item.daysOfSupply}일분</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  item.stockStatus === "CRITICAL"
                                    ? "bg-rose-500"
                                    : item.stockStatus === "WARNING"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, item.depletionRate)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono">
                          {item.stockStatus === "CRITICAL" || item.stockStatus === "WARNING" ? (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-rose-500" />
                              {item.runoutDate} (D-{item.daysOfSupply})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {item.runoutDate} (D-{item.daysOfSupply})
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItemId(item.itemId)
                              setExpectedQty(Math.max(50, item.minStockQty * 2))
                              setAsnModalOpen(true)
                            }}
                            className="h-7 text-[11px] px-2 font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            ASN 등록
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: ASN (Inbound Notices) ── */}
        <TabsContent value="asn" className="space-y-4">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    사전 입고 예정 통지(ASN) 이력
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    공급사에서 WMS로 제출한 사전 입고 예정 목록 및 입고 검수 진행 상황입니다.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAsnModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  신규 ASN 등록
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>ASN 번호</TableHead>
                    <TableHead>입고 예정 일자</TableHead>
                    <TableHead>운송 정보 (택배/송장)</TableHead>
                    <TableHead>품목 수</TableHead>
                    <TableHead>총 예정 수량</TableHead>
                    <TableHead>진행 상태</TableHead>
                    <TableHead className="w-[100px] text-right">상세 보기</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        등록된 사전 입고 예정 통지가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    asns.map((asn) => (
                      <TableRow key={asn.id} className="text-xs hover:bg-muted/50">
                        <TableCell className="font-mono font-bold text-foreground">
                          {asn.asnNo}
                        </TableCell>

                        <TableCell className="font-mono text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {asn.expectedDeliveryDate}
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {asn.carrierName ? (
                            <span>
                              {asn.carrierName} ({asn.trackingNumber || "송장 미등록"})
                            </span>
                          ) : (
                            <span>직접 납품 (용달/자차)</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono">{asn.itemsCount}종</TableCell>

                        <TableCell className="font-mono font-bold text-foreground">
                          {asn.totalExpectedQty.toLocaleString()} EA
                        </TableCell>

                        <TableCell>{getAsnStatusBadge(asn.status)}</TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAsnForDetail(asn)}
                            className="h-7 text-xs px-2"
                          >
                            상세 품목
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Create ASN ── */}
      <Dialog open={asnModalOpen} onOpenChange={setAsnModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              사전 입고 예정 통지(ASN) 등록
            </DialogTitle>
            <DialogDescription className="text-xs">
              물류센터에 도착할 예정인 상품과 수량을 등록하여 입고 검수를 사전 예약합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAsn} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">입고 예정 일자 *</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">입고 대상 품목 *</Label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-input bg-background px-3 font-semibold"
                required
              >
                {items.map((it) => (
                  <option key={it.itemId} value={it.itemId}>
                    [{it.sku}] {it.name} (현재고: {it.availableStock} EA)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">입고 예정 수량 (EA) *</Label>
                <Input
                  type="number"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(Number(e.target.value))}
                  min={1}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">제조 LOT 번호</Label>
                <Input
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  placeholder="LOT-202611-01"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">운송사 (택배/용달)</Label>
                <Input
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="CJ대한통운, 로젠 등"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">운송장 번호</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="5688-1294-8821"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">특이사항 메모</Label>
              <Input
                value={asnNote}
                onChange={(e) => setAsnNote(e.target.value)}
                placeholder="예: 팔레트 랩핑 포장 완료, 오전 10시 하역 요청"
                className="text-xs h-9"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAsnModalOpen(false)}
                className="text-xs"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={submittingAsn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
              >
                {submittingAsn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                사전 입고(ASN) 제출
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: ASN Detail ── */}
      <Dialog
        open={!!selectedAsnForDetail}
        onOpenChange={(open) => !open && setSelectedAsnForDetail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              ASN 입고 상세: {selectedAsnForDetail?.asnNo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              예정일자: {selectedAsnForDetail?.expectedDeliveryDate} · 상태: {selectedAsnForDetail?.status}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">운송사 / 송장:</span>
                <span className="font-semibold text-foreground">
                  {selectedAsnForDetail?.carrierName || "직접 배송"} ({selectedAsnForDetail?.trackingNumber || "-"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">메모:</span>
                <span className="text-foreground">{selectedAsnForDetail?.note || "없음"}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-foreground block mb-1">입고 예정 품목 목록</span>
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>품목명 (SKU)</TableHead>
                    <TableHead>예정수량</TableHead>
                    <TableHead>검수수량</TableHead>
                    <TableHead>LOT번호</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAsnForDetail?.items?.map((it) => (
                    <TableRow key={it.id} className="text-xs">
                      <TableCell>
                        <span className="font-semibold block">{it.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{it.sku}</span>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{it.expectedQty} EA</TableCell>
                      <TableCell className="font-mono text-emerald-600">{it.receivedQty} EA</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{it.lotNo || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
