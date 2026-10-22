"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Printer, RefreshCw, Eye, Sparkles, Check, Database } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Barcode from "react-barcode"

export type PaperSize = "rack-label" | "a4" | "letter" | "compact-label"

// ─────────────────────────────────────────────────────────────
// 단별 물리적 컬러 밴드 표준 규격 (Barcode_System_Guide.md §2.2 / §7.1)
// ─────────────────────────────────────────────────────────────
interface LevelStyle {
  levelLetter: string
  name: string       // e.g. "A단 (1단 / 바닥)"
  shortName: string  // e.g. "A단"
  bandName: string   // e.g. "초록색 띠"
  colorHex: string   // e.g. "#10B981"
  bgHex: string      // e.g. "#ecfdf5"
  textHex: string    // e.g. "#065f46"
  borderHex: string  // e.g. "#10B981"
}

const LEVEL_STYLES: Record<string, LevelStyle> = {
  A: {
    levelLetter: "A",
    name: "A단 (1단 / 바닥)",
    shortName: "A단 1단",
    bandName: "초록 밴드",
    colorHex: "#10B981",
    bgHex: "#ecfdf5",
    textHex: "#065f46",
    borderHex: "#10B981",
  },
  B: {
    levelLetter: "B",
    name: "B단 (2단 / 중단)",
    shortName: "B단 2단",
    bandName: "골드 밴드",
    colorHex: "#F59E0B",
    bgHex: "#fffbeb",
    textHex: "#92400e",
    borderHex: "#F59E0B",
  },
  C: {
    levelLetter: "C",
    name: "C단 (3단 / 상단)",
    shortName: "C단 3단",
    bandName: "파랑 밴드",
    colorHex: "#3B82F6",
    bgHex: "#eff6ff",
    textHex: "#1e40af",
    borderHex: "#3B82F6",
  },
  D: {
    levelLetter: "D",
    name: "D단 (4단 / 최상단)",
    shortName: "D단 4단",
    bandName: "보라 밴드",
    colorHex: "#8B5CF6",
    bgHex: "#f5f3ff",
    textHex: "#5b21b6",
    borderHex: "#8B5CF6",
  },
}

const ZONE_STYLES: Record<string, { label: string; sub: string; badgeBg: string; badgeText: string; badgeBorder: string; colorHex: string }> = {
  A: {
    label: "상온 (Ambient)",
    sub: "Zone A",
    badgeBg: "#f4f4f5",
    badgeText: "#18181b",
    badgeBorder: "#d4d4d8",
    colorHex: "#18181b",
  },
  F: {
    label: "냉동 (Cold)",
    sub: "Zone F",
    badgeBg: "#e0f2fe",
    badgeText: "#0369a1",
    badgeBorder: "#7dd3fc",
    colorHex: "#0284c7",
  },
  R: {
    label: "보충 (Reserve)",
    sub: "Zone R",
    badgeBg: "#f3e8ff",
    badgeText: "#6b21a8",
    badgeBorder: "#d8b4fe",
    colorHex: "#7e22ce",
  },
}

// ─────────────────────────────────────────────────────────────
// 프리셋 코드 모음
// ─────────────────────────────────────────────────────────────
const FOUR_LEVEL_PREVIEW_CODES = [
  "LOC-A0105A01",
  "LOC-A0105B01",
  "LOC-A0105C01",
  "LOC-A0105D01",
].join("\n")

const ZONE_A_LOCATION_CODES = [
  "LOC-A0101A01",
  "LOC-A0101B01",
  "LOC-A0101C01",
  "LOC-A0102A01",
  "LOC-A0102B01",
  "LOC-A0102C01",
  "LOC-A0105A01",
  "LOC-A0105B01",
  "LOC-A0105C01",
].join("\n")

const ZONE_F_LOCATION_CODES = [
  "LOC-F0101A01",
  "LOC-F0101B01",
  "LOC-F0101C01",
  "LOC-F0102A01",
  "LOC-F0102B01",
  "LOC-F0102C01",
].join("\n")

const SAMPLE_SKU_CODES = [
  "SKU-APPLE-01",
  "SKU-BANANA-02",
  "BEV-001",
  "BEV-002",
].join("\n")

interface ParsedLocation {
  isLocation: boolean
  raw: string
  zoneLetter: string
  zoneName: string
  aisle: string
  bay: string
  level: string
  bin: string
  humanAisleBay: string // "A01 - 05 -"
  humanLevelBin: string // "B01"
  levelStyle: LevelStyle
  zoneStyle: { label: string; sub: string; badgeBg: string; badgeText: string; badgeBorder: string; colorHex: string }
}

function parseLocationCode(code: string): ParsedLocation | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  // 1. 신표준: LOC-A0105B01
  let match = trimmed.match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([A-D])([0-9]{2})$/i)
  
  // 2. 과거 숫자형 레벨 호환: LOC-A01050201 -> Level 02 = B
  if (!match) {
    const legacyMatch = trimmed.match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})$/i)
    if (legacyMatch) {
      const numTier = parseInt(legacyMatch[4], 10)
      const letters = ["A", "B", "C", "D"]
      const mappedLetter = letters[Math.max(0, Math.min(3, numTier - 1))] || "A"
      match = [legacyMatch[0], legacyMatch[1], legacyMatch[2], legacyMatch[3], mappedLetter, legacyMatch[5]]
    }
  }

  // 3. 하이픈 포맷: A01-05-B01 or A01-05-B-01 or A0105B01
  if (!match) {
    const altMatch = trimmed.match(/^([A-Z])([0-9]{2})-?([0-9]{2})-?([A-D])-?([0-9]{2})$/i)
    if (altMatch) {
      match = [altMatch[0], altMatch[1], altMatch[2], altMatch[3], altMatch[4].toUpperCase(), altMatch[5]]
    }
  }

  if (!match) return null

  const zoneLetter = match[1].toUpperCase()
  const aisle = match[2]
  const bay = match[3]
  const level = match[4].toUpperCase()
  const bin = match[5]

  const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.A
  const zoneStyle = ZONE_STYLES[zoneLetter] || {
    label: `구역 ${zoneLetter}`,
    sub: `Zone ${zoneLetter}`,
    badgeBg: "#f4f4f5",
    badgeText: "#18181b",
    badgeBorder: "#d4d4d8",
    colorHex: "#18181b",
  }

  return {
    isLocation: true,
    raw: `LOC-${zoneLetter}${aisle}${bay}${level}${bin}`,
    zoneLetter,
    zoneName: zoneStyle.label,
    aisle,
    bay,
    level,
    bin,
    humanAisleBay: `${zoneLetter}${aisle} - ${bay} -`,
    humanLevelBin: `${level}${bin}`,
    levelStyle,
    zoneStyle,
  }
}

// ─────────────────────────────────────────────────────────────
// 단일 선반 랙 실물 라벨 카드 (100mm × 45mm 공식 규격)
// ─────────────────────────────────────────────────────────────
function ShelfRackLabelCard({
  code,
  showCutLines = true,
}: {
  code: string
  showCutLines?: boolean
}) {
  const loc = parseLocationCode(code)

  // 일반 SKU 상품 코드인 경우
  if (!loc) {
    return (
      <div
        className={`shelf-rack-label-card relative bg-white text-zinc-950 ${showCutLines ? 'border border-dashed border-zinc-400' : 'border border-transparent'} flex flex-col justify-between overflow-hidden p-2.5 box-border select-none`}
        style={{
          width: "100mm",
          height: "45mm",
          minWidth: "100mm",
          maxWidth: "100mm",
          minHeight: "45mm",
          maxHeight: "45mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <div className="flex items-center justify-between border-b pb-1">
          <span className="font-mono font-bold text-sm tracking-wider uppercase">{code}</span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">Product SKU</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden py-1">
          <Barcode
            value={code}
            width={1.35}
            height={44}
            fontSize={12}
            font="monospace"
            displayValue={true}
            margin={4}
            background="#ffffff"
            lineColor="#000000"
            className="max-w-full h-auto block [shape-rendering:crispEdges]"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`shelf-rack-label-card relative bg-white text-zinc-950 ${showCutLines ? 'border border-dashed border-zinc-400' : 'border border-transparent'} flex flex-col justify-between overflow-hidden box-border select-none`}
      style={{
        width: "100mm",
        height: "45mm",
        minWidth: "100mm",
        maxWidth: "100mm",
        minHeight: "45mm",
        maxHeight: "45mm",
        backgroundColor: "#ffffff",
        color: "#09090b",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* 우측 끝 물리적 컬러 밴드 (6.5mm 솔리드 띠) */}
      <div
        className="absolute top-0 right-0 bottom-0 w-[7mm] flex flex-col items-center justify-center select-none"
        style={{
          backgroundColor: loc.levelStyle.colorHex,
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <span
          className="text-white font-black text-[9px] tracking-widest uppercase whitespace-nowrap"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            letterSpacing: "0.15em",
          }}
        >
          {loc.levelStyle.name.split(" ")[0]}
        </span>
      </div>

      {/* 내부 인쇄 콘텐츠 영역 (우측 7mm 컬러밴드 제외 93mm 사용) */}
      <div className="pr-[8.5mm] pl-[3mm] pt-[2.2mm] pb-[1.5mm] h-full flex flex-col justify-between">
        {/* 상단: 인간 인지 최적화 3단 구조 (시각적 계층화) */}
        <div>
          <div className="flex items-start justify-between gap-1 leading-none">
            {/* 좌측: 상위 좌표 (통로 & 베이) */}
            <div className="flex flex-col">
              <span className="font-mono font-bold text-[19px] text-zinc-800 tracking-tight leading-tight">
                {loc.humanAisleBay}
              </span>
              <span className="text-[8.5px] font-medium text-zinc-500 tracking-tight mt-0.5">
                통로 {loc.aisle} • 베이 {loc.bay}
              </span>
            </div>

            {/* 중앙: 최종 위치 (단 & 칸) — 42~44pt 초대형 볼드 */}
            <div className="flex flex-col items-center -mt-0.5">
              <span
                className="font-mono font-black text-[38px] leading-none text-zinc-950 tracking-tighter"
                style={{ fontFamily: "'Geist Mono', monospace, sans-serif" }}
              >
                {loc.humanLevelBin}
              </span>
              <span className="text-[9px] font-bold text-zinc-700 tracking-tight mt-0.5">
                {loc.level}단 {loc.bin}번칸
              </span>
            </div>

            {/* 우측: 구역 태그 및 단 컬러 인디케이터 */}
            <div className="flex flex-col items-end gap-1">
              <div
                className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight border uppercase"
                style={{
                  backgroundColor: loc.zoneStyle.badgeBg,
                  color: loc.zoneStyle.badgeText,
                  borderColor: loc.zoneStyle.badgeBorder,
                  printColorAdjust: "exact",
                  WebkitPrintColorAdjust: "exact",
                }}
              >
                {loc.zoneName}
              </div>
              <div
                className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight border flex items-center gap-1"
                style={{
                  backgroundColor: loc.levelStyle.bgHex,
                  color: loc.levelStyle.textHex,
                  borderColor: loc.levelStyle.borderHex,
                  printColorAdjust: "exact",
                  WebkitPrintColorAdjust: "exact",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: loc.levelStyle.colorHex }}
                />
                <span>{loc.levelStyle.shortName}</span>
              </div>
            </div>
          </div>

          {/* 중간 슬림 구분선 */}
          <div className="w-full h-[1px] bg-zinc-300 mt-1 mb-0.5" />
        </div>

        {/* 하단: 기계 판독용 Code 128 바코드 */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-0.5">
          <Barcode
            value={loc.raw}
            width={1.35}
            height={42}
            fontSize={12}
            font="monospace"
            displayValue={true}
            margin={0}
            background="#ffffff"
            lineColor="#000000"
            className="max-w-full h-auto block [shape-rendering:crispEdges]"
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 메인 라벨 인쇄 클라이언트 컴포넌트
// ─────────────────────────────────────────────────────────────
export function PrintClient({ initialDbCodes = [] }: { initialDbCodes?: string[] }) {
  const [codesInput, setCodesInput] = React.useState(FOUR_LEVEL_PREVIEW_CODES)
  const [paperSize, setPaperSize] = React.useState<PaperSize>("letter")
  const [showCutLines, setShowCutLines] = React.useState(true)

  const codes = codesInput.split("\n").map((c) => c.trim()).filter(Boolean)

  const handlePrint = () => {
    window.print()
  }

  const handleLoadDbLocations = () => {
    if (initialDbCodes.length > 0) {
      setCodesInput(initialDbCodes.join("\n"))
    }
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Print Stylesheet (US Letter 8.5" x 11" Optimized) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${
              paperSize === "letter"
                ? "letter portrait"
                : paperSize === "rack-label"
                ? "100mm 45mm"
                : paperSize === "compact-label"
                ? "50mm 30mm"
                : "a4 portrait"
            };
            margin: ${
              paperSize === "letter"
                ? "18mm 7mm 15mm 7mm"
                : paperSize.includes("label")
                ? "0"
                : "8mm 5mm"
            };
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide App UI elements when printing */
          header, aside, nav, [data-sidebar="sidebar"], .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .shelf-rack-label-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ${
            paperSize === "rack-label"
              ? `
            .rack-print-container {
              display: block !important;
            }
            .shelf-rack-label-card {
              page-break-after: always !important;
              break-after: page !important;
              border: none !important;
            }
            .shelf-rack-label-card:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          `
              : `
            .rack-print-container {
              display: grid !important;
              grid-template-columns: repeat(2, 100mm) !important;
              gap: 3mm 4mm !important;
              justify-content: center !important;
            }
          `
          }
        }
      `}} />

      {/* Control Panel (Hidden during Print) */}
      <div className="print:hidden space-y-6 max-w-4xl border p-6 rounded-xl bg-card shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">선반 랙 실물 라벨 인쇄 설정</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                표준 100mm × 45mm
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Glife WMS 표준 규격: 44pt 시각적 계층화, 단별 컬러 밴드(초록·골드·파랑·보라), Code 128 바코드 일체형 출력
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="font-semibold shadow-xs">
              <Printer className="mr-1.5 h-4 w-4" />
              라벨 인쇄 (PDF 저장)
            </Button>
          </div>
        </div>

        {/* 4대 층별 컬러 밴드 안내 배너 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="font-bold block">A단 (1단 / 바닥)</span>
              <span className="text-[10px] text-emerald-700">초록색 밴드 (#10B981)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="font-bold block">B단 (2단 / 중단)</span>
              <span className="text-[10px] text-amber-700">골드 밴드 (#F59E0B)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-300 text-blue-950">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
            <div>
              <span className="font-bold block">C단 (3단 / 상단)</span>
              <span className="text-[10px] text-blue-700">파란색 밴드 (#3B82F6)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-300 text-purple-950">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0" />
            <div>
              <span className="font-bold block">D단 (4단 / 최상단)</span>
              <span className="text-[10px] text-purple-700">보라색 밴드 (#8B5CF6)</span>
            </div>
          </div>
        </div>

        {/* Quick Presets Buttons */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>원클릭 프리셋 불러오기</span>
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(FOUR_LEVEL_PREVIEW_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              🌈 4단 컬러 밴드 샘플 (A~D단)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(ZONE_A_LOCATION_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              상온 랙 01 (Zone A)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(ZONE_F_LOCATION_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              냉동 랙 01 (Zone F)
            </Button>
            {initialDbCodes.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleLoadDbLocations}
                className="text-xs h-7 px-2.5 font-semibold text-primary"
              >
                <Database className="mr-1 size-3.5" />
                DB 등록 로케이션 전체 ({initialDbCodes.length}개)
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCodesInput(SAMPLE_SKU_CODES)}
              className="text-xs h-7 px-2.5 font-medium text-muted-foreground"
            >
              상품 SKU 샘플
            </Button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paper-size" className="text-xs font-semibold">인쇄 용지 규격 (Paper Size)</Label>
              <Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}>
                <SelectTrigger id="paper-size" className="w-full">
                  <SelectValue placeholder="용지 규격 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">
                    📄 US Letter (8.5" × 11" / 북미 표준 2열 10매 배치)
                  </SelectItem>
                  <SelectItem value="rack-label">
                    🏷️ 4" × 2" (100×45mm) 랙 전용 롤 라벨 (1장씩 연속 출력)
                  </SelectItem>
                  <SelectItem value="compact-label">
                    🏷️ 소형 롤 라벨 (2" × 1.2" / 50×30mm)
                  </SelectItem>
                  <SelectItem value="a4">
                    📄 A4 용지 (210 × 297mm)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cut-lines" className="text-xs font-semibold">절단선(테두리 가이드) 표시</Label>
                <button
                  type="button"
                  onClick={() => setShowCutLines(!showCutLines)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                    showCutLines ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {showCutLines ? "절단선 켜짐" : "절단선 꺼짐 (롤 라벨용)"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                • <strong>US Letter (8.5" × 11")</strong> 출력 시 가위/재단기용 점선 테두리를 켜두세요 (1장당 10매 배치).<br />
                • <strong>4" × 2" (100×45mm) 롤 라벨지</strong> 출력 시 테두리를 끄면 다이컷 경계에 맞춰 여백 없이 깔끔하게 출력됩니다.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="codes" className="text-xs font-semibold">출력할 로케이션 / 바코드 목록 (한 줄에 1개씩)</Label>
              <span className="text-xs font-mono text-muted-foreground">
                총 <strong className="text-foreground font-bold">{codes.length}</strong>개
              </span>
            </div>
            <Textarea
              id="codes"
              value={codesInput}
              onChange={(e) => setCodesInput(e.target.value)}
              rows={6}
              placeholder={"LOC-A0105A01\nLOC-A0105B01\nLOC-A0105C01\nLOC-F0101A01..."}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Screen Preview Section (Visible on Screen, Hidden during Print) */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <h4 className="font-bold text-base text-foreground">
              선반 랙 실물 라벨 미리보기 ({codes.length}장)
            </h4>
          </div>
          <span className="text-xs text-muted-foreground">
            실물 비율: 가로 100mm × 세로 45mm
          </span>
        </div>

        <div className="border p-6 bg-muted/20 rounded-xl overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
            {codes.map((code, index) => (
              <div
                key={`preview-${index}`}
                className="shadow-sm rounded-md overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                <ShelfRackLabelCard code={code} showCutLines={showCutLines} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actual Print Media Area (Hidden on screen, Active during Window Print) */}
      <div className="hidden print:block rack-print-container">
        {codes.map((code, index) => (
          <ShelfRackLabelCard key={`print-${index}`} code={code} showCutLines={showCutLines} />
        ))}
      </div>
    </div>
  )
}
