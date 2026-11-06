"use client"

import * as React from "react"
import { useState } from "react"
import {
  HelpCircle,
  PlayCircle,
  LifeBuoy,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  SupportTicket,
  TutorialGuide,
  createSupportTicketAction,
  getQuickTutorialGuides,
  getTenantSupportTickets,
} from "@/services/support-ticket.service"

export function HelpCenterDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("tutorials")

  // Data
  const [tutorials, setTutorials] = useState<TutorialGuide[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  // Ticket Form
  const [submitting, setSubmitting] = useState(false)
  const [category, setCategory] = useState("QUESTION")
  const [priority, setPriority] = useState("NORMAL")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  React.useEffect(() => {
    if (open) {
      getQuickTutorialGuides().then(setTutorials)
      loadTickets()
    }
  }, [open])

  const loadTickets = async () => {
    setLoadingTickets(true)
    const res = await getTenantSupportTickets()
    setLoadingTickets(false)
    if (!res.error) {
      setTickets(res.tickets)
    }
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error("문의 제목과 상세 내용을 모두 입력해주세요.")
      return
    }

    setSubmitting(true)
    const fd = new FormData()
    fd.append("category", category)
    fd.append("priority", priority)
    fd.append("subject", subject)
    fd.append("message", message)
    fd.append("contact_email", contactEmail)
    fd.append("contact_phone", contactPhone)

    const res = await createSupportTicketAction(fd)
    setSubmitting(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`지원 티켓(${res.ticketNumber})이 정상 접수되었습니다.`)
      setSubject("")
      setMessage("")
      setContactEmail("")
      setContactPhone("")
      loadTickets()
      setActiveTab("tickets")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300">해결 완료</Badge>
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-300">처리 중</Badge>
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-300">접수됨</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as any)
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            />
          )
        }
      >
        {!trigger && (
          <>
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            도움말 & 지원
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-slate-50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 text-emerald-600 flex items-center justify-center font-bold">
              <LifeBuoy className="w-4.5 h-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Glife WMS 헬프센터 & 기술 지원
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                3분 완성 실무 가이드와 1:1 전담 기술 지원을 한곳에서 이용하세요.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4 flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-6">
              <TabsTrigger value="tutorials" className="text-xs gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" />
                3분 퀵 튜토리얼
              </TabsTrigger>
              <TabsTrigger value="new-ticket" className="text-xs gap-1.5">
                <Send className="w-3.5 h-3.5" />
                1:1 기술 지원 접수
              </TabsTrigger>
              <TabsTrigger value="tickets" className="text-xs gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                내 접수 내역
                {tickets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-muted-foreground/20 text-[10px]">
                    {tickets.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Tutorials ── */}
            <TabsContent value="tutorials" className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {tutorials.map((tut) => (
                  <div
                    key={tut.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-emerald-500/50 hover:shadow-xs transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-muted font-normal">
                          {tut.category}
                        </Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {tut.duration}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        대상: {tut.recommendedFor}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {tut.title}
                    </h4>

                    <p className="text-xs text-muted-foreground">
                      {tut.description}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                      {tut.keyTakeaways.map((point, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Tab 2: New Ticket ── */}
            <TabsContent value="new-ticket">
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">문의 유형</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-input bg-background px-3"
                    >
                      <option value="QUESTION">기능 사용 및 운영 질문</option>
                      <option value="BUG">오류 및 버그 제보</option>
                      <option value="HARDWARE">Zebra / 바코드 스캐너 연동</option>
                      <option value="BILLING">요금제 플랜 및 결제 문의</option>
                      <option value="FEATURE_REQUEST">신규 기능 제안</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">우선순위</Label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-input bg-background px-3"
                    >
                      <option value="NORMAL">보통 (일반 운영)</option>
                      <option value="URGENT">긴급 (물류 출고 지연 발생)</option>
                      <option value="LOW">낮음 (단순 참고 문의)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">문의 제목 *</Label>
                  <Input
                    placeholder="예: 피킹 앱에서 특정 품목 바코드 스캔 시 비프음 발생 문의"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">상세 내용 *</Label>
                  <Textarea
                    placeholder="현상, 발생 일시, 품목 코드 또는 오류 메시지 등을 상세히 기재해주시면 더욱 빠른 지원이 가능합니다."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="text-xs resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">회신 받을 이메일</Label>
                    <Input
                      type="email"
                      placeholder="admin@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">담당자 연락처</Label>
                    <Input
                      type="tel"
                      placeholder="010-0000-0000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    1:1 기술 지원 접수하기
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* ── Tab 3: Tickets History ── */}
            <TabsContent value="tickets" className="space-y-3">
              {loadingTickets ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  접수 내역을 불러오는 중...
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-xl p-6">
                  <LifeBuoy className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  접수된 기술 지원 티켓이 없습니다.
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-lg border border-border bg-card space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-foreground">
                          {t.ticket_number}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {t.category}
                        </Badge>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    <h5 className="font-bold text-foreground text-xs">{t.subject}</h5>
                    <p className="text-muted-foreground text-[11px] line-clamp-2">
                      {t.message}
                    </p>

                    <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40 flex justify-between">
                      <span>접수일시: {new Date(t.created_at).toLocaleString()}</span>
                      {t.priority === "URGENT" && (
                        <span className="text-rose-500 font-bold">긴급 지원 요청</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
