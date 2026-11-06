"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import {
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  User,
  Database,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { AuditLogEntry } from "@/services/audit-log.service"
import { downloadAuditLogsCsvAction, fetchAuditLogsAction } from "@/app/(dashboard)/settings/audit-logs/actions"

interface AuditLogsClientProps {
  initialLogs: AuditLogEntry[]
  totalCount: number
  isFeatureLocked: boolean
  currentPlanTier: string
}

export function AuditLogsClient({
  initialLogs,
  totalCount,
  isFeatureLocked,
  currentPlanTier,
}: AuditLogsClientProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs)
  const [count, setCount] = useState<number>(totalCount)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [actionType, setActionType] = useState("ALL")
  const [entityType, setEntityType] = useState("ALL")

  // Diff Dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const handleFilter = async () => {
    if (isFeatureLocked) return
    setLoading(true)
    const res = await fetchAuditLogsAction({
      search,
      actionType,
      entityType,
    })
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      setLogs(res.logs)
      setCount(res.totalCount)
    }
  }

  const handleExportCsv = async () => {
    if (isFeatureLocked) {
      toast.error("감사 보고서 CSV 내보내기는 Enterprise 플랜에서만 지원됩니다.")
      return
    }
    setExporting(true)
    try {
      const res = await downloadAuditLogsCsvAction()
      if (res.error || !res.csv) {
        toast.error(res.error || "CSV 생성에 실패했습니다.")
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
        toast.success("ISO-27001 감사 보고서 CSV가 다운로드되었습니다.")
      }
    } catch (err: any) {
      toast.error(err.message || "다운로드 중 오류가 발생했습니다.")
    } finally {
      setExporting(false)
    }
  }

  const getActionBadge = (type: string) => {
    switch (type) {
      case "INVENTORY_ADJUST":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400">재고 실사 보정</Badge>
      case "ORDER_STATUS_CHANGE":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400">주문 상태 변경</Badge>
      case "STORE_DELETE":
        return <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-400">매장 삭제</Badge>
      case "ITEM_PRICE_UPDATE":
        return <Badge className="bg-purple-500/15 text-purple-700 border-purple-300 dark:text-purple-400">단가 변경</Badge>
      case "PLAN_CHANGE":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400">플랜 변경</Badge>
      case "USER_ROLE_CHANGE":
        return <Badge className="bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-400">권한 승격</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Enterprise Feature Gate Banner (If not Enterprise) ── */}
      {isFeatureLocked && (
        <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shadow-xs">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600 text-white font-bold text-xs">
                    ENTERPRISE ONLY
                  </Badge>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    전사 불변 감사 로그 (ISO-27001 규정 준수)
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  현재 이용 중인 <span className="font-semibold text-foreground">{currentPlanTier}</span> 플랜에서는
                  감사 로그 열람이 제한됩니다. Enterprise 플랜으로 업그레이드하시면 전수 감사 기록, JSON 전/후 데이터 비교,
                  감사 보고서 CSV 내보내기 기능을 제한 없이 이용하실 수 있습니다.
                </p>
              </div>

              <Link href="/settings/billing">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-bold shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enterprise로 업그레이드
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filter & Search Bar ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="작업자명, 엔티티 ID, 설명 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                  disabled={isFeatureLocked}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                disabled={isFeatureLocked}
                className="h-9 text-xs rounded-md border border-input bg-background px-3 text-foreground"
              >
                <option value="ALL">모든 작업 유형</option>
                <option value="INVENTORY_ADJUST">재고 실사 보정</option>
                <option value="ORDER_STATUS_CHANGE">주문 상태 변경</option>
                <option value="STORE_DELETE">매장 삭제</option>
                <option value="ITEM_PRICE_UPDATE">단가 변경</option>
                <option value="PLAN_CHANGE">플랜 변경</option>
                <option value="USER_ROLE_CHANGE">권한 승격</option>
              </select>

              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                disabled={isFeatureLocked}
                className="h-9 text-xs rounded-md border border-input bg-background px-3 text-foreground hidden md:block"
              >
                <option value="ALL">모든 엔티티</option>
                <option value="INVENTORY">재고 (INVENTORY)</option>
                <option value="ORDER">주문 (ORDER)</option>
                <option value="STORE">매장 (STORE)</option>
                <option value="ITEM">품목 (ITEM)</option>
                <option value="SUBSCRIPTION">구독 (SUBSCRIPTION)</option>
                <option value="USER">계정 (USER)</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleFilter}
                disabled={isFeatureLocked || loading}
                className="h-9 gap-1 text-xs"
              >
                <Filter className="w-3.5 h-3.5" />
                필터 적용
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isFeatureLocked || exporting}
              className="h-9 gap-1.5 text-xs font-semibold shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              감사 보고서 CSV 내보내기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Audit Logs Table ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                보안 감사 로그 원장
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                총 {count}건의 보안 감사 기록이 불변 원장에 안전하게 저장되어 있습니다.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              ISO-27001 Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs hover:bg-transparent">
                <TableHead className="w-[170px]">일시 (Timestamp)</TableHead>
                <TableHead className="w-[140px]">작업자 (Actor)</TableHead>
                <TableHead className="w-[130px]">작업 유형</TableHead>
                <TableHead className="w-[120px]">엔티티</TableHead>
                <TableHead>작업 내용 및 사유</TableHead>
                <TableHead className="w-[80px] text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                    조건에 일치하는 감사 로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="text-xs hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {log.actor_name || "시스템"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {log.actor_role || "ROLE"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>{getActionBadge(log.action_type)}</TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold text-foreground">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[110px]">
                            {log.entity_id}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-foreground">
                      <p className="line-clamp-2">{log.description}</p>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── JSON Diff Dialog ── */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              감사 이벤트 상세 스냅샷
            </DialogTitle>
            <DialogDescription className="text-xs">
              로그 ID: <span className="font-mono">{selectedLog?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">수행자</span>
                  <span className="font-semibold text-foreground">
                    {selectedLog.actor_name} ({selectedLog.actor_role})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">일시</span>
                  <span className="font-mono text-foreground">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">작업 유형</span>
                  <span>{selectedLog.action_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">엔티티 ID</span>
                  <span className="font-mono text-foreground">{selectedLog.entity_id || "N/A"}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-foreground block mb-1">작업 상세 설명</span>
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md border border-border/60">
                  {selectedLog.description}
                </p>
              </div>

              {selectedLog.diff_data && (
                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">
                    변경 전/후 JSON Diff 스냅샷
                  </span>
                  <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(selectedLog.diff_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
