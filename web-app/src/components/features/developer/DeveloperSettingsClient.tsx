"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import {
  Key,
  Webhook,
  Code2,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Send,
  Lock,
  Loader2,
  Terminal,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
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
import { TenantApiKey, TenantWebhook } from "@/services/developer.service"
import {
  createApiKeyServerAction,
  revokeApiKeyServerAction,
  registerWebhookServerAction,
  deleteWebhookServerAction,
  testWebhookPingServerAction,
} from "@/app/(dashboard)/settings/developer/actions"

interface DeveloperSettingsClientProps {
  initialKeys: TenantApiKey[]
  initialWebhooks: TenantWebhook[]
  isFeatureLocked: boolean
  currentPlanTier: string
}

export function DeveloperSettingsClient({
  initialKeys,
  initialWebhooks,
  isFeatureLocked,
  currentPlanTier,
}: DeveloperSettingsClientProps) {
  const [keys, setKeys] = useState<TenantApiKey[]>(initialKeys)
  const [webhooks, setWebhooks] = useState<TenantWebhook[]>(initialWebhooks)

  // API Key Dialog
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState("")
  const [readInventory, setReadInventory] = useState(true)
  const [writeOrders, setWriteOrders] = useState(true)
  const [readOrders, setReadOrders] = useState(true)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Webhook Dialog
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [subEvents, setSubEvents] = useState<string[]>([
    "order.created",
    "order.fulfilled",
  ])
  const [registeringWebhook, setRegisteringWebhook] = useState(false)
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) {
      toast.error("API 키 명칭을 입력해주세요.")
      return
    }

    setCreatingKey(true)
    const permissions: string[] = []
    if (readInventory) permissions.push("read:inventory")
    if (writeOrders) permissions.push("write:orders")
    if (readOrders) permissions.push("read:orders")

    const fd = new FormData()
    fd.append("name", keyName)
    permissions.forEach((p) => fd.append("permissions", p))

    const res = await createApiKeyServerAction(fd)
    setCreatingKey(false)

    if (res.error || !res.rawKey) {
      toast.error(res.error || "API 키 생성 실패")
    } else {
      setNewlyCreatedKey(res.rawKey)
      if (res.newKey) {
        setKeys([res.newKey, ...keys])
      }
      toast.success("신규 API 키가 발급되었습니다.")
    }
  }

  const handleRevokeApiKey = async (id: string, name: string) => {
    if (!confirm(`정말로 API 키 '${name}'을 폐기하시겠습니까? 연결된 외부 시스템의 호출이 즉시 차단됩니다.`)) {
      return
    }
    const res = await revokeApiKeyServerAction(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setKeys(keys.map((k) => (k.id === id ? { ...k, is_active: false } : k)))
      toast.success("API 키가 폐기되었습니다.")
    }
  }

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
      toast.error("올바른 HTTP/HTTPS URL을 입력해주세요.")
      return
    }

    setRegisteringWebhook(true)
    const fd = new FormData()
    fd.append("url", webhookUrl)
    subEvents.forEach((ev) => fd.append("events", ev))

    const res = await registerWebhookServerAction(fd)
    setRegisteringWebhook(false)

    if (res.error || !res.webhook) {
      toast.error(res.error || "웹훅 등록 실패")
    } else {
      setWebhooks([res.webhook, ...webhooks])
      setWebhookDialogOpen(false)
      setWebhookUrl("")
      toast.success("웹훅 엔드포인트가 등록되었습니다.")
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("이 웹훅 엔드포인트를 삭제하시겠습니까?")) return
    const res = await deleteWebhookServerAction(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setWebhooks(webhooks.filter((w) => w.id !== id))
      toast.success("웹훅이 삭제되었습니다.")
    }
  }

  const handleTestPing = async (id: string) => {
    setTestingWebhookId(id)
    const res = await testWebhookPingServerAction(id)
    setTestingWebhookId(null)
    if (res.error) {
      toast.error(`Ping 테스트 실패: ${res.error}`)
    } else {
      toast.success(res.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
    toast.success("클립보드에 복사되었습니다.")
  }

  return (
    <div className="space-y-8">
      {/* ── Enterprise Lock Notice (If not Enterprise) ── */}
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
                    Headless WMS Open REST API & Webhook 엔진
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  현재 이용 중인 <span className="font-semibold text-foreground">{currentPlanTier}</span> 플랜에서는
                  Open API 키 발급 및 실시간 Webhook 발송이 샌드박스 읽기 전용으로 제한됩니다. Enterprise 플랜으로
                  업그레이드하시면 분당 1,200회 고속 호출 및 ERP 양방향 실시간 동기화를 즉시 이용하실 수 있습니다.
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

      {/* ── 1. API Keys Section ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                Open REST API 인증 키 (API Keys)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                외부 ERP(SAP, 더존) 및 자체 이커머스 몰에서 WMS 재고를 조회하고 주문을 직접 인입하기 위한 비밀 키입니다.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setNewlyCreatedKey(null)
                setKeyName("")
                setKeyDialogOpen(true)
              }}
              disabled={isFeatureLocked}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-bold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              새 API 키 발급
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>키 명칭 (Name)</TableHead>
                <TableHead>키 접두사 (Key Prefix)</TableHead>
                <TableHead>권한 (Permissions)</TableHead>
                <TableHead>호출 한도</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>최근 사용</TableHead>
                <TableHead className="w-[80px] text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    발급된 API 키가 없습니다. [새 API 키 발급] 버튼을 눌러 연동을 시작하세요.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((k) => (
                  <TableRow key={k.id} className="text-xs">
                    <TableCell className="font-semibold text-foreground">
                      {k.name}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {k.key_prefix}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {k.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] bg-muted/50">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {k.rate_limit_per_minute} req/min
                    </TableCell>
                    <TableCell>
                      {k.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300 text-[10px]">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          폐기됨
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "미사용"}
                    </TableCell>
                    <TableCell className="text-right">
                      {k.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeApiKey(k.id, k.name)}
                          disabled={isFeatureLocked}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 2. Webhooks Section ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Webhook className="w-4 h-4 text-emerald-600" />
                실시간 이벤트 웹훅 (Webhooks)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                출고 완료(`order.fulfilled`), 재고 조정(`inventory.adjusted`) 등 주요 이벤트 발생 시 고객사 서버로 즉시 HTTP POST 발송합니다.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setWebhookDialogOpen(true)}
              disabled={isFeatureLocked}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              웹훅 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>수신 URL (Endpoint)</TableHead>
                <TableHead>구독 이벤트</TableHead>
                <TableHead>최근 응답 코드</TableHead>
                <TableHead>실패 횟수</TableHead>
                <TableHead>최근 발송</TableHead>
                <TableHead className="w-[120px] text-right">테스트 & 관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    등록된 웹훅이 없습니다. [웹훅 등록] 버튼을 눌러 실시간 알림을 수신하세요.
                  </TableCell>
                </TableRow>
              ) : (
                webhooks.map((wh) => (
                  <TableRow key={wh.id} className="text-xs">
                    <TableCell className="font-mono font-semibold text-foreground max-w-[240px] truncate">
                      {wh.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wh.subscribed_events.map((ev) => (
                          <Badge key={ev} variant="outline" className="text-[10px] bg-muted/50 font-mono">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {wh.last_status_code ? (
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] ${
                            wh.last_status_code >= 200 && wh.last_status_code < 300
                              ? "text-emerald-600 border-emerald-300"
                              : "text-rose-600 border-rose-300"
                          }`}
                        >
                          {wh.last_status_code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {wh.failure_count}회
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {wh.last_triggered_at ? new Date(wh.last_triggered_at).toLocaleTimeString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestPing(wh.id)}
                          disabled={isFeatureLocked || testingWebhookId === wh.id}
                          className="h-7 text-[11px] px-2 gap-1"
                        >
                          {testingWebhookId === wh.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          Ping
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWebhook(wh.id)}
                          disabled={isFeatureLocked}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── 3. Open API cURL Quick Reference ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/80">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-600" />
            Open REST API 빠른 연동 가이드 (cURL Examples)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            아래 엔드포인트를 호출하여 자체 ERP 및 시스템과 즉시 연동하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="inventory" className="text-xs font-mono">
                GET /api/v1/inventory
              </TabsTrigger>
              <TabsTrigger value="create-order" className="text-xs font-mono">
                POST /api/v1/orders
              </TabsTrigger>
              <TabsTrigger value="get-order" className="text-xs font-mono">
                GET /api/v1/orders/:orderNo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                로케이션별 실시간 가용 재고(`available_quantity`) 및 유통기한을 조회합니다.
              </p>
              <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto border border-slate-800">
{`curl -X GET "https://wms.yourcompany.com/api/v1/inventory?sku=JEL-001&limit=20" \\
  -H "Authorization: Bearer wms_live_YOUR_API_KEY"`}
              </pre>
            </TabsContent>

            <TabsContent value="create-order" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                외부 쇼핑몰 및 거래처의 발주를 WMS 피킹 작업 대기열(`orders`)로 신규 등록합니다.
              </p>
              <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto border border-slate-800">
{`curl -X POST "https://wms.yourcompany.com/api/v1/orders" \\
  -H "Authorization: Bearer wms_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "store_no": "STORE-001",
    "note": "당일 긴급 배송 요청",
    "items": [
      { "sku": "JEL-001", "quantity": 10 },
      { "sku": "JEL-002", "quantity": 5 }
    ]
  }'`}
              </pre>
            </TabsContent>

            <TabsContent value="get-order" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                주문의 현재 피킹/출고 상태(`PENDING`, `PICKED`, `FULFILLED`)를 실시간 추적합니다.
              </p>
              <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto border border-slate-800">
{`curl -X GET "https://wms.yourcompany.com/api/v1/orders/EXT-20261105-1234" \\
  -H "Authorization: Bearer wms_live_YOUR_API_KEY"`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Modal: Create API Key ── */}
      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              신규 API 키 발급
            </DialogTitle>
            <DialogDescription className="text-xs">
              연동할 외부 시스템(예: SAP ERP, Shopify, 자사몰)의 명칭을 입력하세요.
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1 text-amber-800 dark:text-amber-300">
                <span className="font-bold block">⚠️ 보안 주의: API 키를 지금 즉시 복사하세요!</span>
                <p className="text-[11px]">
                  이 키는 단 1회만 화면에 노출되며, 창을 닫은 후에는 데이터베이스에 암호화되어 다시 확인할 수 없습니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">생성된 API 비밀 키</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={newlyCreatedKey}
                    className="font-mono text-xs h-9 bg-muted"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="h-9 px-3 gap-1 shrink-0"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    복사
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setKeyDialogOpen(false)}
                  className="w-full text-xs font-bold"
                >
                  확인 및 완료
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateApiKey} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">키 명칭 (Name) *</Label>
                <Input
                  placeholder="예: SAP ERP 연동용 키, 자사몰 수주 연동"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">권한 스코프 (Permissions)</Label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readInventory}
                      onChange={(e) => setReadInventory(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span>실시간 재고 조회 (`read:inventory`)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={writeOrders}
                      onChange={(e) => setWriteOrders(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span>주문 등록 (`write:orders`)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readOrders}
                      onChange={(e) => setReadOrders(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span>주문 상태 조회 (`read:orders`)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setKeyDialogOpen(false)}
                  className="text-xs"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={creatingKey}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-bold"
                >
                  {creatingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  API 키 발급
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Register Webhook ── */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Webhook className="w-4 h-4 text-emerald-600" />
              웹훅 엔드포인트 등록
            </DialogTitle>
            <DialogDescription className="text-xs">
              이벤트 발생 시 HTTP POST 알림을 수신할 고객사 백엔드 URL을 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterWebhook} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">수신 URL (Endpoint) *</Label>
              <Input
                placeholder="https://api.yourcompany.com/wms/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">구독 이벤트 (Subscribed Events)</Label>
              <div className="space-y-1.5 text-xs">
                {[
                  { id: "order.created", label: "신규 주문 접수 (order.created)" },
                  { id: "order.fulfilled", label: "피킹/출고 완료 (order.fulfilled)" },
                  { id: "inventory.adjusted", label: "재고 실사/조정 (inventory.adjusted)" },
                  { id: "stock.low", label: "안전재고 미달 경보 (stock.low)" },
                ].map((ev) => (
                  <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subEvents.includes(ev.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSubEvents([...subEvents, ev.id])
                        } else {
                          setSubEvents(subEvents.filter((s) => s !== ev.id))
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span>{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWebhookDialogOpen(false)}
                className="text-xs"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={registeringWebhook}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
              >
                {registeringWebhook && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                웹훅 등록하기
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
