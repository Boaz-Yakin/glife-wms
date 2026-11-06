"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import {
  Coins,
  Calculator,
  Download,
  Settings,
  Calendar,
  Building2,
  FileSpreadsheet,
  Boxes,
  Truck,
  CheckCircle2,
  Loader2,
  ArrowRight,
  TrendingUp,
  Receipt,
  Layers,
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
import { ClientSettlementSummary, Daily3PlLedger } from "@/services/three-pl-billing.service"
import {
  saveClientContractAction,
  runManualCalculationAction,
  downloadInvoiceCsvAction,
} from "@/app/(dashboard)/master/clients/billing/actions"

interface ThreePlBillingClientProps {
  initialSummaries: ClientSettlementSummary[]
  currentMonth: string
}

export function ThreePlBillingClient({
  initialSummaries,
  currentMonth,
}: ThreePlBillingClientProps) {
  const [summaries, setSummaries] = useState<ClientSettlementSummary[]>(initialSummaries)
  const [month, setMonth] = useState(currentMonth)
  const [calculating, setCalculating] = useState(false)

  // Contract Edit Modal
  const [selectedClientForContract, setSelectedClientForContract] = useState<ClientSettlementSummary | null>(null)
  const [savingContract, setSavingContract] = useState(false)
  const [dailyPallet, setDailyPallet] = useState(800)
  const [dailyChilled, setDailyChilled] = useState(1500)
  const [dailyCbm, setDailyCbm] = useState(1200)
  const [inboundBox, setInboundBox] = useState(150)
  const [pickingEa, setPickingEa] = useState(100)
  const [packingOrder, setPackingOrder] = useState(500)

  // Detail Modal
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<ClientSettlementSummary | null>(null)
  const [downloadingCsv, setDownloadingCsv] = useState(false)

  // Summary Totals
  const totalClients = summaries.length
  const totalStorageFee = summaries.reduce((acc, s) => acc + s.totalStorageFee, 0)
  const totalHandlingFee = summaries.reduce((acc, s) => acc + s.totalHandlingFee, 0)
  const grandTotalFee = summaries.reduce((acc, s) => acc + s.grandTotal, 0)

  const handleOpenContractModal = (client: ClientSettlementSummary) => {
    setSelectedClientForContract(client)
    setDailyPallet(client.contract.daily_pallet_storage_fee)
    setDailyChilled(client.contract.daily_chilled_pallet_fee)
    setDailyCbm(client.contract.daily_cbm_storage_fee)
    setInboundBox(client.contract.inbound_handling_fee_per_box)
    setPickingEa(client.contract.outbound_picking_fee_per_ea)
    setPackingOrder(client.contract.packing_fee_per_order)
  }

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientForContract) return

    setSavingContract(true)
    const fd = new FormData()
    fd.append("client_id", selectedClientForContract.clientId)
    fd.append("daily_pallet_storage_fee", String(dailyPallet))
    fd.append("daily_chilled_pallet_fee", String(dailyChilled))
    fd.append("daily_cbm_storage_fee", String(dailyCbm))
    fd.append("inbound_handling_fee_per_box", String(inboundBox))
    fd.append("outbound_picking_fee_per_ea", String(pickingEa))
    fd.append("packing_fee_per_order", String(packingOrder))

    const res = await saveClientContractAction(fd)
    setSavingContract(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`${selectedClientForContract.clientName} 요율표 계약이 저장되었습니다.`)
      setSelectedClientForContract(null)
    }
  }

  const handleRunCalculation = async () => {
    setCalculating(true)
    const res = await runManualCalculationAction()
    setCalculating(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.message)
    }
  }

  const handleDownloadCsv = async (clientId: string, clientName: string) => {
    setDownloadingCsv(true)
    const res = await downloadInvoiceCsvAction(clientId, month)
    setDownloadingCsv(false)

    if (res.error || !res.csv) {
      toast.error(res.error || "CSV 생성 실패")
    } else {
      const blob = new Blob(["\uFEFF" + res.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${clientName} 정산 명세서가 다운로드되었습니다.`)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Top KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                위탁 화주사
              </span>
              <span className="text-xl font-black text-foreground">{totalClients}개사</span>
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
                당월 보관료 합계
              </span>
              <span className="text-xl font-black text-foreground">
                ₩{totalStorageFee.toLocaleString()}
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
                입출고 하역/피킹비
              </span>
              <span className="text-xl font-black text-foreground">
                ₩{totalHandlingFee.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-slate-900 text-white shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                3PL 총 정산 청구액
              </span>
              <span className="text-xl font-black text-emerald-400">
                ₩{grandTotalFee.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Filter & Manual Batch Calculation Bar ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">정산 대상 월:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 text-xs rounded-md border border-input bg-background px-3 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunCalculation}
              disabled={calculating}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              {calculating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
              )}
              당일 정산 수동 계산 (Midnight Cron 실행)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Clients Settlement Table ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                화주사별 3PL 물류비 정산 현황
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                매일 자정 점유 파렛트 스냅샷과 일별 출고 피킹 실적을 합산한 월간 청구서입니다.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {month} 정산 기준
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>화주사명 (Code)</TableHead>
                <TableHead>평균 점유 파렛트</TableHead>
                <TableHead>당월 보관료</TableHead>
                <TableHead>출고 피킹/오더</TableHead>
                <TableHead>작업/하역비</TableHead>
                <TableHead>당월 청구 총액</TableHead>
                <TableHead className="w-[180px] text-right">정산 관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    등록된 3PL 화주사가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                summaries.map((s) => (
                  <TableRow key={s.clientId} className="text-xs">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{s.clientName}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{s.clientCode}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono">
                      <span className="font-semibold text-foreground">{s.avgPalletCount} PLT</span>
                    </TableCell>

                    <TableCell className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      ₩{s.totalStorageFee.toLocaleString()}
                    </TableCell>

                    <TableCell className="font-mono text-muted-foreground">
                      <span>{s.totalOutboundItems.toLocaleString()} EA</span>
                      <span className="text-[10px] block">({s.totalOutboundOrders}건)</span>
                    </TableCell>

                    <TableCell className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      ₩{s.totalHandlingFee.toLocaleString()}
                    </TableCell>

                    <TableCell className="font-mono font-black text-sm text-foreground">
                      ₩{s.grandTotal.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClientForDetail(s)}
                          className="h-7 text-xs px-2 gap-1 font-semibold"
                        >
                          <Receipt className="w-3 h-3 text-blue-600" />
                          일별 상세
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenContractModal(s)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="요율 계약 설정"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Modal: Day-by-day Ledger & Invoice ── */}
      <Dialog
        open={!!selectedClientForDetail}
        onOpenChange={(open) => !open && setSelectedClientForDetail(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  {selectedClientForDetail?.clientName} ({selectedClientForDetail?.clientCode}) 일별 정산 명세서
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  정산 대상 월: {selectedClientForDetail?.settlementMonth} · 합계 청구액: ₩{selectedClientForDetail?.grandTotal.toLocaleString()}
                </DialogDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  selectedClientForDetail &&
                  handleDownloadCsv(selectedClientForDetail.clientId, selectedClientForDetail.clientName)
                }
                disabled={downloadingCsv}
                className="gap-1.5 text-xs font-semibold"
              >
                {downloadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                CSV 명세서 다운로드
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 pt-2 flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>정산일자</TableHead>
                  <TableHead>상온 PLT</TableHead>
                  <TableHead>냉장 PLT</TableHead>
                  <TableHead>보관료</TableHead>
                  <TableHead>출고 피킹/건수</TableHead>
                  <TableHead>작업/하역비</TableHead>
                  <TableHead className="text-right">일일 합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedClientForDetail?.dailyRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      당월 정산 원장 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedClientForDetail?.dailyRecords.map((r) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell className="font-mono font-semibold">{r.record_date}</TableCell>
                      <TableCell className="font-mono">{r.pallet_count} PLT</TableCell>
                      <TableCell className="font-mono">{r.chilled_pallet_count} PLT</TableCell>
                      <TableCell className="font-mono text-emerald-600 dark:text-emerald-400">
                        ₩{r.storage_fee.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {r.outbound_items_count} EA ({r.outbound_orders_count}건)
                      </TableCell>
                      <TableCell className="font-mono text-indigo-600 dark:text-indigo-400">
                        ₩{r.handling_fee.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-right">
                        ₩{r.total_daily_fee.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Edit Client Contract Rates ── */}
      <Dialog
        open={!!selectedClientForContract}
        onOpenChange={(open) => !open && setSelectedClientForContract(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              {selectedClientForContract?.clientName} 3PL 요율표 계약 설정
            </DialogTitle>
            <DialogDescription className="text-xs">
              해당 화주사에 적용할 일일 보관료 및 입출고 작업 단가를 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContract} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">상온 파렛트 (원/PLT/일)</Label>
                <Input
                  type="number"
                  value={dailyPallet}
                  onChange={(e) => setDailyPallet(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">냉장/냉동 파렛트 (원/PLT/일)</Label>
                <Input
                  type="number"
                  value={dailyChilled}
                  onChange={(e) => setDailyChilled(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CBM당 일일 보관료 (원/CBM)</Label>
                <Input
                  type="number"
                  value={dailyCbm}
                  onChange={(e) => setDailyCbm(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">입고 하역비 (원/박스)</Label>
                <Input
                  type="number"
                  value={inboundBox}
                  onChange={(e) => setInboundBox(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">출고 피킹비 (원/EA)</Label>
                <Input
                  type="number"
                  value={pickingEa}
                  onChange={(e) => setPickingEa(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">포장/검수비 (원/오더)</Label>
                <Input
                  type="number"
                  value={packingOrder}
                  onChange={(e) => setPackingOrder(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedClientForContract(null)}
                className="text-xs"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={savingContract}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-bold"
              >
                {savingContract && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                계약 요율 저장
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
