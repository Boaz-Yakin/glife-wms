"use client"

import * as React from "react"
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  Key,
  Shield,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KakaoNotificationConfig } from "@/types/notifications"
import {
  getKakaoConfigAction,
  saveKakaoConfigAction,
  toggleKakaoNotificationAction,
  sendTestKakaoNotificationAction,
} from "./actions"

export default function KakaoNotificationSettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [guideOpen, setGuideOpen] = React.useState(false)

  const [config, setConfig] = React.useState<KakaoNotificationConfig>({
    enabled: false,
    rest_api_key: "",
    access_token: "",
    refresh_token: "",
    token_expires_at: null,
    notify_on_new_order: true,
    recipient_memo: "나에게 보내기 (기본)",
    last_status: "NOT_CONFIGURED",
    last_sent_at: null,
    last_error: null,
  })

  // Load config on mount
  React.useEffect(() => {
    getKakaoConfigAction()
      .then((cfg) => {
        if (cfg) setConfig(cfg)
      })
      .catch((err) => {
        toast.error("설정을 불러오는데 실패했습니다: " + err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // Toggle Master Switch (ON/OFF)
  const handleToggle = async () => {
    const nextState = !config.enabled

    // If turning ON but no token entered yet
    if (nextState && !config.access_token) {
      toast.warning("카카오 액세스 토큰을 먼저 입력해 주세요.")
    }

    try {
      const res = await toggleKakaoNotificationAction(nextState)
      if (res.success) {
        setConfig(res.config)
        if (nextState) {
          toast.success("카카오톡 주문 알림이 켜졌습니다. (ON)")
        } else {
          toast.info("카카오톡 주문 알림이 꺼졌습니다. (OFF)")
        }
      } else {
        toast.error(res.error || "상태 변경 실패")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "상태 변경 중 오류 발생"
      toast.error(msg)
    }
  }

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await saveKakaoConfigAction(config)
      if (res.success) {
        setConfig(res.config)
        toast.success("카카오톡 알림 설정이 저장되었습니다.")
      } else {
        toast.error(res.error || "설정 저장 실패")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "저장 중 오류 발생"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Send Test Memo
  const handleSendTest = async () => {
    if (!config.access_token) {
      toast.error("테스트 메시지를 전송하려면 카카오 액세스 토큰이 필요합니다.")
      return
    }

    setTesting(true)
    try {
      const res = await sendTestKakaoNotificationAction()
      if (res.success) {
        toast.success("카카오톡 '나에게 보내기'로 테스트 메시지가 성공적으로 전송되었습니다! 📲")
        // Refresh latest status
        const latest = await getKakaoConfigAction()
        setConfig(latest)
      } else {
        toast.error("테스트 발송 실패: " + (res.error || res.message || "오류가 발생했습니다."))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "테스트 발송 중 오류 발생"
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const getStatusBadge = () => {
    if (!config.enabled) {
      return (
        <Badge variant="outline" className="gap-1 border-muted-foreground/30 text-muted-foreground bg-muted/40 text-xs">
          <BellOff className="h-3 w-3" />
          <span>알림 OFF (비활성)</span>
        </Badge>
      )
    }
    if (config.last_status === "TOKEN_EXPIRED") {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          <span>토큰 만료 (갱신 필요)</span>
        </Badge>
      )
    }
    if (config.last_status === "ERROR") {
      return (
        <Badge variant="outline" className="gap-1 border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 text-xs">
          <AlertTriangle className="h-3 w-3" />
          <span>발송 오류</span>
        </Badge>
      )
    }
    if (config.access_token) {
      return (
        <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          <span>알림 ON (정상 작동)</span>
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs">
        <Info className="h-3 w-3" />
        <span>토큰 입력 대기</span>
      </Badge>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-[#FEE500]/20 text-[#191919] dark:text-[#FEE500]">
            <Bell className="h-5 w-5 fill-[#FEE500] stroke-[#191919] dark:stroke-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>카카오톡 주문 알림 설정</span>
              <Badge className="bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90 text-[10px] font-bold px-1.5 py-0.5">
                Kakao REST API
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              OrderAPP 또는 WMS에서 신규 주문이 접수되면 관리자 카카오톡(나에게 보내기)으로 실시간 보고서를 전송합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Master ON/OFF Switch Banner Card */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                config.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.enabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  {config.enabled ? "신규 주문 카카오톡 자동 보고 활성화됨" : "카카오톡 주문 자동 보고 비활성화됨"}
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.enabled
                  ? "새로운 발주 접수 시 즉시 카카오톡 메시지가 발송됩니다."
                  : "스위치를 켜면 접수된 주문 내역이 관리자 카카오톡으로 자동 전송됩니다."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={testing || !config.access_token}
              className="gap-1.5 text-xs h-9 bg-background shadow-xs hover:bg-muted font-medium"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <span>전송 중...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>테스트 메시지 발송</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Configuration Form */}
      <form onSubmit={handleSave}>
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <span>카카오 개발자 API 키 & 토큰 설정</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  카카오 개발자 센터(Kakao Developers)에서 발급받은 REST API 키와 토큰을 등록합니다.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGuideOpen(!guideOpen)}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground h-8"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>토큰 발급 방법</span>
                {guideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardHeader>

          {/* Guide Accordion */}
          {guideOpen && (
            <div className="bg-[#FEE500]/10 border-b border-[#FEE500]/20 p-4 text-xs space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-[#191919] dark:text-[#FEE500]">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>3분 만에 무료로 카카오톡 '나에게 보내기' 토큰 발급받는 방법:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed pl-1">
                <li>
                  <a
                    href="https://developers.kakao.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    카카오 개발자 센터 (developers.kakao.com) <ExternalLink className="h-3 w-3" />
                  </a>
                  에 로그인 후 <strong>[내 애플리케이션] &gt; [애플리케이션 추가]</strong>를 진행합니다.
                </li>
                <li>
                  생성된 앱의 <strong>[앱 키]</strong> 메뉴에서 <code>REST API 키</code>를 복사하여 아래에 입력합니다.
                </li>
                <li>
                  좌측 메뉴의 <strong>[카카오 로그인]</strong> &gt; 활성화 설정(ON) 및 <strong>[동의항목]</strong>에서 <strong>카카오톡 메시지 전송(talk_message)</strong>을 '이용 중 동의'로 설정합니다.
                </li>
                <li>
                  상단 메뉴의 <strong>[도구] &gt; [REST API 테스트]</strong>로 이동하여 <strong>토큰 발급</strong>을 클릭한 후 발급된 <code>액세스 토큰(Access Token)</code>을 복사하여 아래에 입력합니다.
                </li>
              </ol>
            </div>
          )}

          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4">
              {/* REST API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rest_api_key" className="text-xs font-medium">
                    카카오 REST API Key
                  </Label>
                  <span className="text-[11px] text-muted-foreground">자동 토큰 갱신 시 필요</span>
                </div>
                <Input
                  id="rest_api_key"
                  type="text"
                  placeholder="예: 4a8f9c1234567890abcdef1234567890"
                  value={config.rest_api_key || ""}
                  onChange={(e) => setConfig({ ...config, rest_api_key: e.target.value })}
                  className="font-mono text-xs h-9 bg-background"
                />
              </div>

              {/* Access Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="access_token" className="text-xs font-semibold flex items-center gap-1">
                    <span>카카오 Access Token</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Bearer 토큰 (메시지 전송 권한)</span>
                </div>
                <Input
                  id="access_token"
                  type="password"
                  placeholder="Bearer 액세스 토큰을 입력하세요"
                  value={config.access_token || ""}
                  onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                  className="font-mono text-xs h-9 bg-background"
                />
              </div>

              {/* Refresh Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="refresh_token" className="text-xs font-medium">
                    카카오 Refresh Token
                  </Label>
                  <span className="text-[11px] text-muted-foreground">선택 (토큰 만료 시 자동 갱신 지원)</span>
                </div>
                <Input
                  id="refresh_token"
                  type="password"
                  placeholder="리프레시 토큰 (선택 입력)"
                  value={config.refresh_token || ""}
                  onChange={(e) => setConfig({ ...config, refresh_token: e.target.value })}
                  className="font-mono text-xs h-9 bg-background"
                />
              </div>

              {/* Recipient Memo Info */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">수신 채널</Label>
                <div className="p-2.5 rounded-lg border bg-muted/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>카카오톡 <strong>나에게 보내기</strong> (토큰 소유자 본인 1:1 대화방)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    무과금 공식 API
                  </Badge>
                </div>
              </div>

              {/* Order Placement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-background hover:bg-muted/20 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={config.notify_on_new_order}
                    onChange={(e) => setConfig({ ...config, notify_on_new_order: e.target.checked })}
                    className="mt-0.5 size-4 rounded text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-semibold text-foreground">
                      새로운 매장 발주 접수 시 즉시 알림 전송
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      가맹점/매장에서 OrderAPP을 통해 주문이 접수되거나 WMS에서 등록되면 카톡으로 보고서를 보냅니다.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border/40 py-3 bg-muted/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {config.last_sent_at && (
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    최근 발송: {new Date(config.last_sent_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={saving || loading}
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>설정 저장</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* 3. Notification Preview Card */}
      <Card className="border-border/80 shadow-xs bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            카카오톡 보고 메시지 미리보기 (Preview)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm rounded-2xl bg-card border shadow-sm p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-bold text-[13px] text-foreground flex items-center gap-1">
                <span>[GLIFE WMS - 신규 주문 접수 알림]</span>
                <span>🔔</span>
              </span>
              <span className="text-[10px] text-muted-foreground">방금 전</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              새로운 매장 발주가 정상 접수되었습니다.
            </p>
            <div className="space-y-1 font-mono text-[11px] bg-muted/40 p-2.5 rounded-lg border text-foreground">
              <div>• 주문번호: ORD-20261027-0012</div>
              <div>• 발주매장: 강남 1호점 (Store #04)</div>
              <div>• 접수일시: 2026-10-27 20:35</div>
              <div>• 품목요약: 냉동 삼겹살 외 4건 (총 45 EA)</div>
              <div>• 결제/청구: 348,000원</div>
            </div>
            <div className="pt-1">
              <div className="w-full py-1.5 rounded-lg bg-[#FEE500] text-[#191919] font-bold text-center text-xs shadow-xs cursor-pointer hover:bg-[#FEE500]/90">
                WMS 주문 상세 확인
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
