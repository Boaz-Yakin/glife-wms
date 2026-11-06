"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  Package,
  Layers,
  Store,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OnboardingState } from "@/services/onboarding.service"
import {
  parseItemsExcel,
  generateItemTemplateExcel,
  BulkItemRow,
  BulkRowError,
} from "@/lib/importer/excel-bulk-importer"
import {
  saveBrandingAction,
  bulkImportItemsAction,
  autoGenerateWarehouseAction,
  bulkRegisterStoresAction,
  completeOnboardingAction,
} from "@/app/onboarding/actions"

const COLOR_PRESETS = [
  { label: "Emerald (물류 기본)", value: "#059669" },
  { label: "Ocean Blue (글로벌)", value: "#0284c7" },
  { label: "Indigo (테크)", value: "#6366f1" },
  { label: "Violet (프리미엄)", value: "#8b5cf6" },
  { label: "Amber (따뜻한)", value: "#d97706" },
  { label: "Rose (모던)", value: "#e11d48" },
]

export function OnboardingWizardClient({ initialState }: { initialState: OnboardingState }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState<number>(
    initialState.onboarding_completed ? 5 : Math.min(initialState.onboarding_step || 1, 5)
  )
  const [loading, setLoading] = React.useState(false)

  // ── Step 1 State: Branding ──
  const [companyName, setCompanyName] = React.useState(initialState.companyName || "")
  const [primaryColor, setPrimaryColor] = React.useState(initialState.branding.primary_color || "#059669")
  const [currency, setCurrency] = React.useState(initialState.branding.currency || "USD")
  const [logoUrl, setLogoUrl] = React.useState(initialState.branding.logo_url || "/logo.png")

  // ── Step 2 State: Items Bulk Import ──
  const [parsedItems, setParsedItems] = React.useState<BulkItemRow[]>([])
  const [parseErrors, setParseErrors] = React.useState<BulkRowError[]>([])
  const [fileName, setFileName] = React.useState<string>("")
  const [importedItemsCount, setImportedItemsCount] = React.useState(initialState.stats.itemsCount)

  // ── Step 3 State: Warehouse ──
  const [zones, setZones] = React.useState<Array<{ code: string; label: string; tempZone: "ROOM" | "CHILLED" | "FROZEN"; enabled: boolean }>>([
    { code: "A", label: "상온 보관 구역 (ROOM)", tempZone: "ROOM", enabled: true },
    { code: "B", label: "냉장 보관 구역 (CHILLED)", tempZone: "CHILLED", enabled: true },
    { code: "C", label: "냉동 보관 구역 (FROZEN)", tempZone: "FROZEN", enabled: false },
  ])
  const [racksPerZone, setRacksPerZone] = React.useState<number>(4)
  const [levelsPerRack, setLevelsPerRack] = React.useState<number>(2)
  const [generatedLocationsCount, setGeneratedLocationsCount] = React.useState(initialState.stats.locationsCount)

  // ── Step 4 State: Stores ──
  const [stores, setStores] = React.useState<Array<{ name: string; address: string; phone: string }>>([
    { name: "1호 본점 (Flagship Store)", address: "100 Broadway, New York, NY", phone: "212-555-0101" },
    { name: "2호 다운타운점 (Downtown Branch)", address: "450 5th Ave, New York, NY", phone: "212-555-0102" },
  ])
  const [registeredStoresCount, setRegisteredStoresCount] = React.useState(initialState.stats.storesCount)

  // ── Handlers ──
  const handleSaveBranding = async () => {
    if (!companyName.trim()) {
      toast.error("회사명을 입력해 주세요.")
      return
    }
    setLoading(true)
    const res = await saveBrandingAction({ companyName, primaryColor, currency, logoUrl })
    setLoading(false)
    if (res.success) {
      toast.success("브랜딩 정보가 저장되었습니다.")
      setCurrentStep(2)
    } else {
      toast.error(res.error || "브랜딩 저장에 실패했습니다.")
    }
  }

  const handleDownloadTemplate = () => {
    const bytes = generateItemTemplateExcel()
    const blob = new Blob([bytes as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Item_Master_Template.xlsx"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("품목 엑셀 템플릿이 다운로드되었습니다.")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const arrayBuffer = await file.arrayBuffer()
    const result = parseItemsExcel(arrayBuffer)

    setParsedItems(result.validRows)
    setParseErrors(result.errors)

    if (result.errors.length > 0) {
      toast.warning(`${result.validRows.length}개 품목 인식 완료 (${result.errors.length}개 유효성 경고)`)
    } else {
      toast.success(`모든 품목(${result.validRows.length}건) 검증 완료!`)
    }
  }

  const handleLoadSampleItems = () => {
    const sampleItems: BulkItemRow[] = [
      {
        sku: "BEV-COKE-355",
        name: "코카콜라 355ml Box",
        desc: "24캔/박스 (캔)",
        category: "Beverage",
        uom: "BOX",
        unit_price: 18.5,
        box_price: 18.5,
        upc: "8801094012345",
      },
      {
        sku: "SNK-POTATO-60G",
        name: "포테이토 칩 오리지널",
        desc: "60g 바삭한 감자칩",
        category: "Snack",
        uom: "EA",
        unit_price: 1.45,
        box_price: 29.0,
        upc: "8801117098765",
      },
      {
        sku: "RAM-SPICY-MULTI",
        name: "매운 라면 5입 멀티팩",
        desc: "120g x 5개입",
        category: "Noodles",
        uom: "PACK",
        unit_price: 4.8,
        box_price: 38.4,
        upc: "8801043054321",
      },
    ]
    setParsedItems(sampleItems)
    setParseErrors([])
    setFileName("Sample_Items_Preset.xlsx")
    toast.success("샘플 품목 3종이 자동으로 채워졌습니다.")
  }

  const handleImportItems = async () => {
    if (parsedItems.length === 0) {
      toast.error("등록할 품목이 없습니다. 엑셀을 업로드하거나 샘플 품목을 채워주세요.")
      return
    }
    setLoading(true)
    const res = await bulkImportItemsAction(parsedItems)
    setLoading(false)
    if (res.success) {
      setImportedItemsCount(res.inserted)
      toast.success(`${res.inserted}개 품목 마스터가 일괄 등록되었습니다.`)
      setCurrentStep(3)
    } else {
      toast.error(res.error || "품목 일괄 등록에 실패했습니다.")
    }
  }

  const handleGenerateWarehouse = async () => {
    const activeZones = zones.filter((z) => z.enabled)
    if (activeZones.length === 0) {
      toast.error("최소 1개 이상의 보관 구역을 선택해 주세요.")
      return
    }
    setLoading(true)
    const res = await autoGenerateWarehouseAction({
      zones: activeZones.map((z) => ({ code: z.code, tempZone: z.tempZone })),
      racksPerZone,
      levelsPerRack,
    })
    setLoading(false)
    if (res.success) {
      setGeneratedLocationsCount(res.generated)
      toast.success(`${res.generated}개의 2D 바코드 로케이션이 생성되었습니다.`)
      setCurrentStep(4)
    } else {
      toast.error(res.error || "창고 로케이션 생성에 실패했습니다.")
    }
  }

  const handleRegisterStores = async () => {
    const validStores = stores.filter((s) => s.name.trim())
    if (validStores.length === 0) {
      toast.error("최소 1개 이상의 매장을 입력해 주세요.")
      return
    }
    setLoading(true)
    const res = await bulkRegisterStoresAction(
      validStores.map((s, idx) => ({
        name: s.name,
        address: s.address,
        store_no: `STORE-00${idx + 1}`,
        phone: s.phone,
      }))
    )
    setLoading(false)
    if (res.success) {
      setRegisteredStoresCount(res.inserted)
      toast.success(`${res.inserted}개 가맹점/매장 계정이 생성되었습니다.`)
      setCurrentStep(5)
    } else {
      toast.error(res.error || "매장 등록에 실패했습니다.")
    }
  }

  const handleCompleteAll = async () => {
    setLoading(true)
    const res = await completeOnboardingAction()
    setLoading(false)
    if (res.success) {
      toast.success("온보딩이 모두 완료되었습니다! 대시보드로 이동합니다.")
      router.push("/dashboard")
    } else {
      toast.error(res.error || "온보딩 완료 처리에 실패했습니다.")
    }
  }

  const steps = [
    { num: 1, title: "브랜딩", icon: Building2 },
    { num: 2, title: "상품 등록", icon: Package },
    { num: 3, title: "창고 구획", icon: Layers },
    { num: 4, title: "매장 등록", icon: Store },
    { num: 5, title: "출시 완료", icon: Sparkles },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── Stepper Navigation ── */}
      <div className="border border-border/80 bg-card rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-5 gap-2">
          {steps.map((st) => {
            const Icon = st.icon
            const isDone = st.num < currentStep || initialState.onboarding_completed
            const isCurrent = st.num === currentStep
            return (
              <div
                key={st.num}
                onClick={() => isDone && setCurrentStep(st.num)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold"
                    : isDone
                    ? "text-foreground hover:bg-muted/50"
                    : "text-muted-foreground/60 opacity-60 pointer-events-none"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : isDone
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[11px] tracking-tight">{st.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Step 1: Branding & Identity ── */}
      {currentStep === 1 && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold">
                Step 1 of 5
              </Badge>
              <CardTitle className="text-xl">회사 브랜드 및 운영 환경 설정</CardTitle>
            </div>
            <CardDescription className="text-xs">
              발주 앱(OrderAPP)과 WMS 콘솔에 적용될 대표 회사명, 테마 컬러, 통화를 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-xs font-bold">
                  회사명 (Company Name) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="예: Acme Food Logistics Inc."
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-xs font-bold">
                  기본 결제 통화 (Currency)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={currency === "USD" ? "default" : "outline"}
                    className={`h-10 text-xs font-bold ${currency === "USD" ? "bg-blue-600 hover:bg-blue-500" : ""}`}
                    onClick={() => setCurrency("USD")}
                  >
                    $ US Dollar (USD)
                  </Button>
                  <Button
                    type="button"
                    variant={currency === "KRW" ? "default" : "outline"}
                    className={`h-10 text-xs font-bold ${currency === "KRW" ? "bg-blue-600 hover:bg-blue-500" : ""}`}
                    onClick={() => setCurrency("KRW")}
                  >
                    ₩ Korean Won (KRW)
                  </Button>
                </div>
              </div>
            </div>

            {/* Brand Color Picker */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-bold">대표 브랜드 컬러 (Theme Color)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COLOR_PRESETS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setPrimaryColor(col.value)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                      primaryColor === col.value
                        ? "border-foreground ring-2 ring-primary/20 bg-muted/40 font-bold"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: col.value }}
                    />
                    <span className="truncate">{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Banner */}
            <div
              className="rounded-xl p-4 text-white flex items-center justify-between shadow-xs transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider font-semibold">브랜딩 미리보기</p>
                <h4 className="text-lg font-black">{companyName || "Your Logistics Center"}</h4>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-xs">
                {currency === "USD" ? "$ USD" : "₩ KRW"}
              </Badge>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button
                onClick={handleSaveBranding}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-xs h-10 px-6 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                다음 단계 (상품 등록) <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Items Bulk Import ── */}
      {currentStep === 2 && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold">
                    Step 2 of 5
                  </Badge>
                  <CardTitle className="text-xl">상품 마스터 대용량 엑셀 등록</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  표준 엑셀 템플릿을 다운로드하여 상품을 일괄 등록하거나 샘플 프리셋으로 시작합니다.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-9 text-xs gap-1.5 font-bold"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                표준 템플릿 (.xlsx)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Dropzone */}
            <div className="border-2 border-dashed border-border/80 rounded-2xl p-8 text-center space-y-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  {fileName ? fileName : "엑셀(.xlsx) 또는 CSV 파일을 선택하세요"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  SKU, 품목명, 단위(UOM), 공급단가(Unit Price), 바코드가 포함된 파일
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> 파일 찾아보기
                  </span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadSampleItems}
                  className="text-xs font-bold h-9"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                  샘플 3종 즉시 채우기
                </Button>
              </div>
            </div>

            {/* Parsing Validation Summary */}
            {parsedItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    유효 품목: {parsedItems.length}건 준비됨
                  </span>
                  {parseErrors.length > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {parseErrors.length}개 셀 오류 감지
                    </Badge>
                  )}
                </div>

                {/* Preview Table */}
                <div className="rounded-xl border border-border overflow-hidden bg-card text-xs">
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/60 text-[11px] font-semibold sticky top-0">
                        <tr>
                          <th className="p-2.5">SKU</th>
                          <th className="p-2.5">품목명</th>
                          <th className="p-2.5">UOM</th>
                          <th className="p-2.5">단가</th>
                          <th className="p-2.5">바코드</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {parsedItems.slice(0, 5).map((it, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-2.5 font-mono font-bold">{it.sku}</td>
                            <td className="p-2.5">{it.name}</td>
                            <td className="p-2.5 font-mono">{it.uom}</td>
                            <td className="p-2.5 font-mono">
                              {currency === "USD" ? "$" : "₩"}
                              {it.unit_price.toLocaleString()}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground">{it.upc || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedItems.length > 5 && (
                    <div className="p-2 text-center text-[11px] text-muted-foreground bg-muted/20 border-t border-border/60">
                      외 {parsedItems.length - 5}건 추가 대기 중
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="text-xs h-10 px-4 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> 이전
              </Button>
              <Button
                onClick={handleImportItems}
                disabled={loading || parsedItems.length === 0}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-xs h-10 px-6 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                품목 일괄 등록 후 다음 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Warehouse Layout ── */}
      {currentStep === 3 && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold">
                Step 3 of 5
              </Badge>
              <CardTitle className="text-xl">간이 창고 구획 및 바코드 로케이션 빌더</CardTitle>
            </div>
            <CardDescription className="text-xs">
              보관 존과 랙/단 수를 지정하면 표준 바코드 체계(`LOC-A0101A` 등)의 위치 정보가 1초 만에 자동 빌드됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold">보관 온도 구역 (Storage Zones)</Label>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {zones.map((z, idx) => (
                  <div
                    key={z.code}
                    onClick={() => {
                      const updated = [...zones]
                      updated[idx].enabled = !updated[idx].enabled
                      setZones(updated)
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      z.enabled
                        ? "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/30"
                        : "border-border bg-card opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-foreground">Zone {z.code}</span>
                      <input
                        type="checkbox"
                        checked={z.enabled}
                        readOnly
                        className="rounded accent-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{z.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-2">
                <Label htmlFor="racksPerZone" className="text-xs font-bold">
                  구역당 랙(Rack) 개수 (1~10열)
                </Label>
                <Input
                  id="racksPerZone"
                  type="number"
                  min={1}
                  max={20}
                  value={racksPerZone}
                  onChange={(e) => setRacksPerZone(Number(e.target.value) || 1)}
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="levelsPerRack" className="text-xs font-bold">
                  선반 단수 (Levels per Rack)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={levelsPerRack === 2 ? "default" : "outline"}
                    className={`h-10 text-xs font-bold ${levelsPerRack === 2 ? "bg-blue-600 hover:bg-blue-500" : ""}`}
                    onClick={() => setLevelsPerRack(2)}
                  >
                    2단 (A단, B단)
                  </Button>
                  <Button
                    type="button"
                    variant={levelsPerRack === 3 ? "default" : "outline"}
                    className={`h-10 text-xs font-bold ${levelsPerRack === 3 ? "bg-blue-600 hover:bg-blue-500" : ""}`}
                    onClick={() => setLevelsPerRack(3)}
                  >
                    3단 (A, B, C단)
                  </Button>
                </div>
              </div>
            </div>

            {/* Generated Calculation Card */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">자동 생성 예정 로케이션:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">
                  총 {zones.filter((z) => z.enabled).length * racksPerZone * levelsPerRack}개 위치
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {zones.filter((z) => z.enabled).slice(0, 2).map((z) => (
                  <Badge key={z.code} variant="secondary" className="font-mono text-[10px]">
                    LOC-{z.code}01A
                  </Badge>
                ))}
                <span className="text-[10px] text-muted-foreground self-center">...등 바코드 즉시 부여</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="text-xs h-10 px-4 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> 이전
              </Button>
              <Button
                onClick={handleGenerateWarehouse}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-xs h-10 px-6 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                로케이션 생성 후 다음 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Stores & Clients ── */}
      {currentStep === 4 && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold">
                Step 4 of 5
              </Badge>
              <CardTitle className="text-xl">초기 가맹점 및 거래처 등록</CardTitle>
            </div>
            <CardDescription className="text-xs">
              발주 앱(OrderAPP)을 사용할 주요 매장 및 납품처 정보를 등록합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {stores.map((st, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">매장 #{idx + 1}</span>
                    {stores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStores(stores.filter((_, i) => i !== idx))}
                        className="text-[11px] text-rose-500 hover:underline"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">매장명</Label>
                      <Input
                        value={st.name}
                        onChange={(e) => {
                          const updated = [...stores]
                          updated[idx].name = e.target.value
                          setStores(updated)
                        }}
                        placeholder="매장명 입력"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">배송지 주소</Label>
                      <Input
                        value={st.address}
                        onChange={(e) => {
                          const updated = [...stores]
                          updated[idx].address = e.target.value
                          setStores(updated)
                        }}
                        placeholder="배송 주소 입력"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">점주 연락처</Label>
                      <Input
                        value={st.phone}
                        onChange={(e) => {
                          const updated = [...stores]
                          updated[idx].phone = e.target.value
                          setStores(updated)
                        }}
                        placeholder="전화번호"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStores([...stores, { name: "", address: "", phone: "" }])}
              className="text-xs font-bold h-9"
            >
              + 추가 매장 행 추가
            </Button>

            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(3)}
                className="text-xs h-10 px-4 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> 이전
              </Button>
              <Button
                onClick={handleRegisterStores}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-xs h-10 px-6 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                매장 등록 후 완료 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Launch & Tour ── */}
      {currentStep === 5 && (
        <Card className="border-border/80 shadow-xs text-center p-6 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-foreground">
              축하합니다! 셀프 온보딩이 성공적으로 완료되었습니다 🎉
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {companyName}의 기본 물류 마스터 데이터가 모두 구축되었습니다. 이제 즉시 발주를 접수하고 피킹을 시작할 수 있습니다.
            </p>
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
            <div className="p-4 rounded-xl border border-border bg-card">
              <p className="text-2xl font-black font-mono text-foreground">{importedItemsCount}</p>
              <p className="text-xs text-muted-foreground mt-1">등록 품목 (SKU)</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <p className="text-2xl font-black font-mono text-foreground">{generatedLocationsCount}</p>
              <p className="text-xs text-muted-foreground mt-1">보관 로케이션</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <p className="text-2xl font-black font-mono text-foreground">{registeredStoresCount}</p>
              <p className="text-xs text-muted-foreground mt-1">가맹점 / 매장</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleCompleteAll}
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 font-bold text-xs h-11 px-8 gap-2 shadow-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              WMS 관리자 대시보드 시작하기 <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`http://localhost:3000/orders`, "_blank")}
              className="w-full sm:w-auto font-bold text-xs h-11 px-6 gap-2"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              주문 관리 둘러보기
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
