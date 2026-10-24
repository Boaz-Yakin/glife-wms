"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, Eye, Sparkles, Database, Check, QrCode, Barcode as BarcodeIcon, SlidersHorizontal, Layers, RotateCcw, MapPin, ZoomIn, ZoomOut, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react"

export type PaperSize = "letter" | "rack-label" | "compact-label" | "a4"
export type LabelSymbology = "qr" | "barcode"
export type QrPlacement = "vertical" | "horizontal" | "diagonal" | "fixed-right" | "fixed-left"
export type CardWidth = "60mm" | "65mm" | "75mm" | "100mm"
export type CardHeight = "30mm" | "35mm" | "45mm"

// ─────────────────────────────────────────────────────────────
// Official Level Physical Color Band Specifications
// (Barcode_System_Guide.md §2.2 / §7.1)
// ─────────────────────────────────────────────────────────────
interface LevelStyle {
  levelLetter: string
  name: string
  shortName: string
  englishLevel: string
  bandName: string
  colorHex: string
  bgHex: string
  textHex: string
  borderHex: string
}

const LEVEL_STYLES: Record<string, LevelStyle> = {
  A: {
    levelLetter: "A",
    name: "Level A (Floor / 1st)",
    shortName: "Level A",
    englishLevel: "Level A",
    bandName: "Green Band",
    colorHex: "#10B981",
    bgHex: "#ecfdf5",
    textHex: "#065f46",
    borderHex: "#10B981",
  },
  B: {
    levelLetter: "B",
    name: "Level B (Middle / 2nd)",
    shortName: "Level B",
    englishLevel: "Level B",
    bandName: "Gold Band",
    colorHex: "#F59E0B",
    bgHex: "#fffbeb",
    textHex: "#92400e",
    borderHex: "#F59E0B",
  },
  C: {
    levelLetter: "C",
    name: "Level C (Upper / 3rd)",
    shortName: "Level C",
    englishLevel: "Level C",
    bandName: "Blue Band",
    colorHex: "#3B82F6",
    bgHex: "#eff6ff",
    textHex: "#1e40af",
    borderHex: "#3B82F6",
  },
  D: {
    levelLetter: "D",
    name: "Level D (Top / 4th)",
    shortName: "Level D",
    englishLevel: "Level D",
    bandName: "Purple Band",
    colorHex: "#8B5CF6",
    bgHex: "#f5f3ff",
    textHex: "#5b21b6",
    borderHex: "#8B5CF6",
  },
}

const ZONE_STYLES: Record<string, { label: string; sub: string; badgeBg: string; badgeText: string; badgeBorder: string; colorHex: string }> = {
  A: {
    label: "Zone A • Ambient",
    sub: "Zone A",
    badgeBg: "#f4f4f5",
    badgeText: "#18181b",
    badgeBorder: "#d4d4d8",
    colorHex: "#18181b",
  },
  F: {
    label: "Zone F • Cold Storage",
    sub: "Zone F",
    badgeBg: "#e0f2fe",
    badgeText: "#0369a1",
    badgeBorder: "#7dd3fc",
    colorHex: "#0284c7",
  },
  R: {
    label: "Zone R • Reserve",
    sub: "Zone R",
    badgeBg: "#f3e8ff",
    badgeText: "#6b21a8",
    badgeBorder: "#d8b4fe",
    colorHex: "#7e22ce",
  },
  S: {
    label: "Zone S • Staging / Floor",
    sub: "Staging Floor",
    badgeBg: "#fef3c7",
    badgeText: "#b45309",
    badgeBorder: "#fcd34d",
    colorHex: "#d97706",
  },
}

// ─────────────────────────────────────────────────────────────
// Preset Location Barcode Batches (2-Level Warehouse Standard)
// ─────────────────────────────────────────────────────────────
const FOUR_LEVEL_PREVIEW_CODES = [
  "LOC-A0105A01",
  "LOC-A0105B01",
  "LOC-A0105C01",
  "LOC-A0105D01",
].join("\n")

const ZONE_A_LOCATION_CODES = [
  "LOC-A0101A01",
  "LOC-A0101A02",
  "LOC-A0101B01",
  "LOC-A0101B02",
  "LOC-A0102A01",
  "LOC-A0102A02",
  "LOC-A0102B01",
  "LOC-A0102B02",
  "LOC-A0103A01",
  "LOC-A0103A02",
  "LOC-A0103B01",
  "LOC-A0103B02",
].join("\n")

const ZONE_F_LOCATION_CODES = [
  "LOC-F0101A01",
  "LOC-F0101A02",
  "LOC-F0101B01",
  "LOC-F0101B02",
  "LOC-F0102A01",
  "LOC-F0102A02",
  "LOC-F0102B01",
  "LOC-F0102B02",
].join("\n")

const ZONE_S_LOCATION_CODES = [
  "LOC-S0101A01",
  "LOC-S0102A01",
  "LOC-S0103A01",
  "LOC-S0104A01",
  "LOC-S0105A01",
  "LOC-S0106A01",
  "LOC-S0107A01",
  "LOC-S0108A01",
  "LOC-S0109A01",
  "LOC-S0110A01",
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
  humanAisleBay: string // e.g. "A01 - 05 -"
  humanLevelBin: string // e.g. "B01"
  shortLocation: string // e.g. "01-05-B"
  levelStyle: LevelStyle
  zoneStyle: { label: string; sub: string; badgeBg: string; badgeText: string; badgeBorder: string; colorHex: string }
}

function parseLocationCode(code: string): ParsedLocation | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  // 1. Standard: LOC-A0105B01
  let match = trimmed.match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([A-D])([0-9]{2})$/i)
  
  // 2. Legacy numeric tier: LOC-A01050201 -> Level 02 = B
  if (!match) {
    const legacyMatch = trimmed.match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})$/i)
    if (legacyMatch) {
      const numTier = parseInt(legacyMatch[4], 10)
      const letters = ["A", "B", "C", "D"]
      const mappedLetter = letters[Math.max(0, Math.min(3, numTier - 1))] || "A"
      match = [legacyMatch[0], legacyMatch[1], legacyMatch[2], legacyMatch[3], mappedLetter, legacyMatch[5]]
    }
  }

  // 3. Hyphenated: A01-05-B01 or A01-05-B-01 or A0105B01
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
    label: `Zone ${zoneLetter}`,
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
    shortLocation: `${aisle}-${bay}-${level}`,
    levelStyle,
    zoneStyle,
  }
}

// ─────────────────────────────────────────────────────────────
// Shelf Rack Physical Label Component
// Supports Compact Width (65mm default, 60mm slim, 75mm, 100mm)
// and Height (45mm standard default, 35mm, 30mm)
// Supports Vertical (Top ↔ Bottom) and Horizontal (Left ↔ Right) Zig-Zag
// ─────────────────────────────────────────────────────────────
function ShelfRackLabelCard({
  code,
  showCutLines = true,
  symbology = "qr",
  qrPlacement = "vertical",
  cardWidth = "65mm",
  cardHeight = "45mm",
  index = 0,
}: {
  code: string
  showCutLines?: boolean
  symbology?: LabelSymbology
  qrPlacement?: QrPlacement
  cardWidth?: CardWidth
  cardHeight?: CardHeight
  index?: number
}) {
  const loc = parseLocationCode(code)

  // Level A & C are considered "Odd" (1st, 3rd)
  // Level B & D are considered "Even" (2nd, 4th)
  const isOdd = loc ? loc.level === "A" || loc.level === "C" : index % 2 === 0

  // 1. Vertical shift: is QR placed on the TOP (vs BOTTOM)?
  const isQrTop =
    qrPlacement === "vertical"
      ? isOdd // A/C = TOP, B/D = BOTTOM
      : qrPlacement === "diagonal"
      ? isOdd // A/C = TOP, B/D = BOTTOM
      : false // In horizontal or fixed mode, QR takes full height

  // 2. Horizontal shift: is QR placed on the LEFT (vs RIGHT)?
  const isQrLeft =
    qrPlacement === "fixed-left"
      ? true
      : qrPlacement === "fixed-right"
      ? false
      : qrPlacement === "horizontal"
      ? !isOdd // Level B & D on Left, A & C on Right
      : qrPlacement === "diagonal"
      ? !isOdd // Level B & D on Bottom-Left, A & C on Top-Right
      : false // In vertical zig-zag, QR stays on Right column, jumping TOP ↔ BOTTOM

  const isCompactWidth = cardWidth === "60mm" || cardWidth === "65mm" || cardWidth === "75mm"
  const isSlimWidth = cardWidth === "60mm"
  const isMediumWidth = cardWidth === "75mm"
  const isFullWidth = cardWidth === "100mm"

  const isSlimHeight = cardHeight === "30mm"
  const isMediumHeight = cardHeight === "35mm"

  // Standard Product SKU Fallback
  if (!loc) {
    if (symbology === "qr") {
      const qrSkuBox = (
        <div
          className={`${
            isSlimWidth ? "w-[22mm]" : isCompactWidth ? "w-[24mm]" : "w-[33mm]"
          } ${
            isSlimHeight ? "h-[26mm]" : isMediumHeight ? "h-[31mm]" : "h-[38mm]"
          } flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-1 bg-white`}
        >
          <QRCodeSVG
            value={code}
            size={isSlimWidth ? 64 : isCompactWidth ? 72 : 96}
            level="M"
            marginSize={1}
            className="w-full h-auto max-h-[28mm] block [shape-rendering:crispEdges]"
          />
          <span className="text-[6.5px] font-mono font-bold text-zinc-600 uppercase tracking-wider mt-0.5">
            SCAN SKU
          </span>
        </div>
      )

      const infoSkuBox = (
        <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
          <div>
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">
              Product SKU
            </span>
            <span className="font-mono font-black text-sm tracking-tight uppercase block text-zinc-900 mt-0.5 break-all">
              {code}
            </span>
          </div>
          <div className="border-t border-zinc-200 pt-0.5">
            <span className="text-[7.5px] text-zinc-500 font-medium">
              Standard Item
            </span>
          </div>
        </div>
      )

      return (
        <div
          className={`shelf-rack-label-card relative bg-white text-zinc-950 ${
            showCutLines ? "border border-dashed border-zinc-400" : "border border-transparent"
          } flex flex-row items-center justify-between overflow-hidden p-2 gap-1.5 box-border select-none`}
          style={{
            width: cardWidth,
            height: cardHeight,
            minWidth: cardWidth,
            maxWidth: cardWidth,
            minHeight: cardHeight,
            maxHeight: cardHeight,
            backgroundColor: "#ffffff",
            color: "#000000",
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          }}
        >
          {isQrLeft ? (
            <>
              {qrSkuBox}
              {infoSkuBox}
            </>
          ) : (
            <>
              {infoSkuBox}
              {qrSkuBox}
            </>
          )}
        </div>
      )
    }

    return (
      <div
        className={`shelf-rack-label-card relative bg-white text-zinc-950 ${
          showCutLines ? "border border-dashed border-zinc-400" : "border border-transparent"
        } flex flex-col justify-between overflow-hidden p-2 box-border select-none`}
        style={{
          width: cardWidth,
          height: cardHeight,
          minWidth: cardWidth,
          maxWidth: cardWidth,
          minHeight: cardHeight,
          maxHeight: cardHeight,
          backgroundColor: "#ffffff",
          color: "#000000",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <div className="flex items-center justify-between border-b pb-0.5">
          <span className="font-mono font-bold text-xs tracking-wider uppercase">{code}</span>
          <span className="text-[8px] text-zinc-500 font-semibold uppercase">Product SKU</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden py-0.5">
          <Barcode
            value={code}
            width={isSlimWidth ? 1.0 : 1.2}
            height={isSlimHeight ? 28 : 38}
            fontSize={9}
            font="monospace"
            displayValue={true}
            margin={2}
            background="#ffffff"
            lineColor="#000000"
            className="max-w-full h-auto block [shape-rendering:crispEdges]"
          />
        </div>
      </div>
    )
  }

  // ─── 2D QR Code Layout Blocks ───
  const isVerticalMode = qrPlacement === "vertical" || qrPlacement === "diagonal"

  // Width definitions based on Card Width
  const qrColWidth = isSlimWidth ? "w-[23mm]" : isCompactWidth && !isMediumWidth ? "w-[25.5mm]" : isMediumWidth ? "w-[29mm]" : "w-[34mm]"
  const bandWidth = isSlimWidth ? "w-[5mm]" : isCompactWidth && !isMediumWidth ? "w-[5.5mm]" : isMediumWidth ? "w-[6.5mm]" : "w-[7.5mm]"
  const contentWidth = isSlimWidth ? "w-[55mm]" : isCompactWidth && !isMediumWidth ? "w-[59.5mm]" : isMediumWidth ? "w-[68.5mm]" : "w-[92.5mm]"

  // Height definitions based on Card Height
  const qrColHeight = isSlimHeight ? "h-[26.8mm]" : isMediumHeight ? "h-[31.5mm]" : "h-[40.5mm]"
  const qrBoxHeight = isSlimHeight ? "h-[18.2mm]" : isMediumHeight ? "h-[21.5mm]" : "h-[26.5mm]"
  const tagBoxHeight = isSlimHeight ? "h-[7.5mm]" : isMediumHeight ? "h-[8.8mm]" : "h-[12.5mm]"
  const qrSvgHeight = isSlimHeight ? "h-[16.5mm]" : isMediumHeight ? "h-[19.5mm]" : isSlimWidth ? "h-[21.5mm]" : "h-[23.5mm]"
  const qrSvgSize = isSlimHeight ? 64 : isSlimWidth ? 68 : isCompactWidth ? 74 : 88
  const qrFullSvgHeight = isSlimHeight ? "max-h-[20.5mm]" : isMediumHeight ? "max-h-[25mm]" : "max-h-[30.5mm]"
  const qrFullSvgSize = isSlimHeight ? 76 : isSlimWidth ? 76 : isCompactWidth ? 86 : 100

  const qrVerticalColumn = (
    <div className={`${qrColWidth} ${qrColHeight} flex flex-col justify-between shrink-0`}>
      {isQrTop ? (
        /* Top QR Mode (Level A, Level C) */
        <>
          <div className={`${qrColWidth} ${qrBoxHeight} flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-0.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}>
            <QRCodeSVG
              value={loc.raw}
              size={qrSvgSize}
              level="M"
              marginSize={1}
              className={`w-auto ${qrSvgHeight} block [shape-rendering:crispEdges]`}
            />
          </div>
          <div className={`${qrColWidth} ${tagBoxHeight} flex flex-col items-center justify-center shrink-0 border border-emerald-300 rounded px-1 py-0.2 bg-emerald-50/70 leading-none`}>
            <span className={`${isSlimWidth ? "text-[8px]" : "text-[9.5px]"} font-mono font-black text-emerald-950 tracking-wider leading-none`}>
              {loc.shortLocation}
            </span>
            <span className="text-[6.5px] px-1 py-0.2 mt-0.5 font-bold text-emerald-700 bg-white border border-emerald-200 rounded uppercase tracking-wider leading-none">
              ▲ TOP
            </span>
          </div>
        </>
      ) : (
        /* Bottom QR Mode (Level B, Level D) */
        <>
          <div className={`${qrColWidth} ${tagBoxHeight} flex flex-col items-center justify-center shrink-0 border border-amber-300 rounded px-1 py-0.2 bg-amber-50/70 leading-none`}>
            <span className="text-[6.5px] px-1 py-0.2 mb-0.5 font-bold text-amber-800 bg-white border border-amber-200 rounded uppercase tracking-wider leading-none">
              ▼ BTM
            </span>
            <span className={`${isSlimWidth ? "text-[8px]" : "text-[9.5px]"} font-mono font-black text-amber-950 tracking-wider leading-none`}>
              {loc.shortLocation}
            </span>
          </div>
          <div className={`${qrColWidth} ${qrBoxHeight} flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-0.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}>
            <QRCodeSVG
              value={loc.raw}
              size={qrSvgSize}
              level="M"
              marginSize={1}
              className={`w-auto ${qrSvgHeight} block [shape-rendering:crispEdges]`}
            />
          </div>
        </>
      )}
    </div>
  )

  // B. Standard / Horizontal Full-Height QR Box
  const qrFullHeightColumn = (
    <div className={`${qrColWidth} ${qrColHeight} flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-0.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}>
      <QRCodeSVG
        value={loc.raw}
        size={qrFullSvgSize}
        level="M"
        marginSize={1}
        className={`w-full h-auto ${qrFullSvgHeight} block [shape-rendering:crispEdges]`}
      />
      <span className="text-[7.5px] font-mono font-black text-zinc-900 tracking-wider mt-0.5 leading-none">
        {loc.shortLocation}
      </span>
    </div>
  )

  // Coordinates Column (Aisle/Bay + 28pt~44pt Level/Bin + Badges)
  const coordsBox = (
    <div className="flex-1 h-full flex flex-col justify-between overflow-hidden pr-0.5">
      {/* Top: Zone & Level Badges */}
      <div className="flex items-center gap-1 flex-wrap leading-none">
        <div
          className="px-1 py-0.5 rounded text-[7px] font-bold tracking-tight border uppercase leading-none"
          style={{
            backgroundColor: loc.zoneStyle.badgeBg,
            color: loc.zoneStyle.badgeText,
            borderColor: loc.zoneStyle.badgeBorder,
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          }}
        >
          {loc.zoneStyle.sub || loc.zoneName}
        </div>
        <div
          className="px-1 py-0.5 rounded text-[7px] font-bold tracking-tight border flex items-center gap-0.5 leading-none"
          style={{
            backgroundColor: loc.levelStyle.bgHex,
            color: loc.levelStyle.textHex,
            borderColor: loc.levelStyle.borderHex,
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: loc.levelStyle.colorHex }}
          />
          <span>{loc.levelStyle.englishLevel}</span>
        </div>
      </div>

      {/* Middle: Visual Hierarchy Coordinates */}
      {isFullWidth ? (
        /* Full Width Layout: Side-by-side */
        <div className="flex items-baseline justify-between gap-1 my-auto">
          <div className="flex flex-col">
            <span className="font-mono font-bold text-[19px] text-zinc-800 tracking-tight leading-none">
              {loc.humanAisleBay}
            </span>
            <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-tight mt-0.5 leading-none">
              Aisle {loc.aisle} • Bay {loc.bay}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span
              className="font-mono font-black text-[38px] leading-none text-zinc-950 tracking-tighter"
              style={{ fontFamily: "'Geist Mono', monospace, sans-serif" }}
            >
              {loc.humanLevelBin}
            </span>
            <span className="text-[8.5px] font-bold text-zinc-700 tracking-tight mt-0.5 uppercase leading-none">
              Level {loc.level} • Bin {loc.bin}
            </span>
          </div>
        </div>
      ) : (
        /* Compact Width Layout: Stacked for narrow beam efficiency */
        <div className="flex flex-col my-auto gap-0.5">
          <div className="flex flex-col">
            <span className={`font-mono font-bold ${isSlimWidth ? "text-[12.5px]" : "text-[14px]"} text-zinc-800 tracking-tight leading-tight`}>
              {loc.humanAisleBay}
            </span>
            <span className="text-[6.5px] font-semibold text-zinc-500 uppercase tracking-tight leading-none mt-0.5">
              Aisle {loc.aisle} • Bay {loc.bay}
            </span>
          </div>
          <div className="flex flex-col mt-0.5">
            <span
              className={`font-mono font-black ${
                isSlimHeight ? "text-[24px]" : isSlimWidth ? "text-[26px]" : "text-[30px]"
              } leading-none text-zinc-950 tracking-tighter`}
              style={{ fontFamily: "'Geist Mono', monospace, sans-serif" }}
            >
              {loc.humanLevelBin}
            </span>
            <span className="text-[7px] font-bold text-zinc-700 tracking-tight mt-0.5 uppercase leading-none">
              Level {loc.level} • Bin {loc.bin}
            </span>
          </div>
        </div>
      )}

      {/* Bottom: Raw Machine Location String */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-0.5 leading-none">
        <span className={`font-mono font-bold ${isSlimWidth ? "text-[7px]" : "text-[8px]"} text-zinc-800 tracking-wider leading-none`}>
          {loc.raw}
        </span>
        <span className="text-[6px] font-bold tracking-wider uppercase text-zinc-500 leading-none">
          2D
        </span>
      </div>
    </div>
  )

  const activeQrColumn = isVerticalMode ? qrVerticalColumn : qrFullHeightColumn

  return (
    <div
      className={`shelf-rack-label-card relative bg-white text-zinc-950 ${
        showCutLines ? "border border-dashed border-zinc-400" : "border border-transparent"
      } flex flex-col justify-between overflow-hidden box-border select-none`}
      style={{
        width: cardWidth,
        height: cardHeight,
        minWidth: cardWidth,
        maxWidth: cardWidth,
        minHeight: cardHeight,
        maxHeight: cardHeight,
        backgroundColor: "#ffffff",
        color: "#09090b",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* 
        Right-Edge Physical Level Color Band
        Uses inline SVG rect to GUARANTEE full-color printing on all browsers
      */}
      <div className={`absolute top-0 right-0 bottom-0 ${bandWidth} h-full overflow-hidden select-none`}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <rect x="0" y="0" width="100" height="100" fill={loc.levelStyle.colorHex} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-white font-black ${isSlimWidth ? "text-[7px]" : "text-[8px]"} tracking-widest uppercase whitespace-nowrap`}
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              letterSpacing: isSlimWidth ? "0.08em" : "0.12em",
            }}
          >
            {loc.levelStyle.englishLevel}
          </span>
        </div>
      </div>

      {/* Internal Label Content Area */}
      {symbology === "qr" ? (
        /* ─── 2D QR Code Zig-Zag Industrial Layout ─── */
        <div
          className={`${contentWidth} h-full ${
            isSlimWidth ? "pl-[1.5mm] pr-[1mm] py-[1.5mm] gap-1" : "pl-[2mm] pr-[1.5mm] py-[2mm] gap-1.5"
          } box-border flex items-center justify-between`}
        >
          {isQrLeft ? (
            <>
              {activeQrColumn}
              {coordsBox}
            </>
          ) : (
            <>
              {coordsBox}
              {activeQrColumn}
            </>
          )}
        </div>
      ) : (
        /* ─── 1D Barcode (Code 128) Legacy Layout ─── */
        <div
          className={`${contentWidth} h-full pl-[2mm] pr-[2mm] pt-[2mm] pb-[1mm] flex flex-col justify-between`}
        >
          {/* Top: Human-Readable Coordinates */}
          <div>
            <div className="flex items-start justify-between gap-1 leading-none">
              <div className="flex flex-col">
                <span className="font-mono font-bold text-[13px] text-zinc-800 tracking-tight leading-tight">
                  {loc.humanAisleBay}
                </span>
                <span className="text-[6.5px] font-semibold text-zinc-500 uppercase tracking-tight mt-0.5">
                  Aisle {loc.aisle} • Bay {loc.bay}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span
                  className="font-mono font-black text-[22px] leading-none text-zinc-950 tracking-tighter"
                  style={{ fontFamily: "'Geist Mono', monospace, sans-serif" }}
                >
                  {loc.humanLevelBin}
                </span>
                <span className="text-[6.5px] font-bold text-zinc-700 tracking-tight mt-0.5 uppercase">
                  Level {loc.level} • Bin {loc.bin}
                </span>
              </div>
            </div>
            <div className="w-full h-[1px] bg-zinc-300 mt-0.5 mb-0.5" />
          </div>

          {/* Bottom: Machine-Readable Code 128 Barcode */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-0.5">
            <Barcode
              value={loc.raw}
              width={isSlimWidth ? 0.95 : 1.1}
              height={isSlimHeight ? 24 : 34}
              fontSize={8.5}
              font="monospace"
              displayValue={true}
              margin={0}
              background="#ffffff"
              lineColor="#000000"
              className="max-w-full h-auto block [shape-rendering:crispEdges]"
            />
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// Print Client Component (English Unified)
// ─────────────────────────────────────────────────────────────
export function PrintClient({ initialDbCodes = [] }: { initialDbCodes?: string[] }) {
  // 2D 레이아웃 맵 및 DB에 등록된 실제 2단(Level A, Level B) 로케이션 코드를 우선 로드
  const defaultCodes = React.useMemo(() => {
    if (initialDbCodes.length > 0) {
      const zoneACodes = initialDbCodes.filter((c) => c.startsWith("LOC-A"))
      return zoneACodes.length > 0 ? zoneACodes.join("\n") : initialDbCodes.join("\n")
    }
    return ZONE_A_LOCATION_CODES
  }, [initialDbCodes])

  const [codesInput, setCodesInput] = React.useState(defaultCodes)
  const [cardWidth, setCardWidth] = React.useState<CardWidth>("65mm")
  const [cardHeight, setCardHeight] = React.useState<CardHeight>("45mm")
  const [paperSize, setPaperSize] = React.useState<PaperSize>("letter")
  const [symbology, setSymbology] = React.useState<LabelSymbology>("qr")
  const [qrPlacement, setQrPlacement] = React.useState<QrPlacement>("vertical")
  const [showCutLines, setShowCutLines] = React.useState(true)

  const [previewScale, setPreviewScale] = React.useState<"actual" | "compact">("actual")

  const codes = React.useMemo(() => {
    return codesInput.split("\n").map((c) => c.trim()).filter(Boolean)
  }, [codesInput])

  const handlePrint = () => {
    window.print()
  }

  const handleLoadDbLocations = () => {
    if (initialDbCodes.length > 0) {
      setCodesInput(initialDbCodes.join("\n"))
    }
  }

  const isThreeCols = cardWidth !== "100mm"

  return (
    <div className="space-y-6">
      {/* Dynamic Print Stylesheet (US Letter 8.5" x 11" Optimized) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${
              paperSize === "letter"
                ? "letter portrait"
                : paperSize === "rack-label"
                ? `${cardWidth} ${cardHeight}`
                : paperSize === "compact-label"
                ? "50mm 30mm"
                : "a4 portrait"
            };
            margin: ${
              paperSize === "letter"
                ? (isThreeCols ? "12mm 5mm 10mm 5mm" : "16mm 6mm 14mm 6mm")
                : paperSize.includes("label")
                ? "0"
                : "8mm 5mm"
            };
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
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
              grid-template-columns: repeat(${isThreeCols ? 3 : 2}, ${cardWidth}) !important;
              gap: 3mm 4mm !important;
              justify-content: center !important;
            }
          `
          }
        }
      `}} />

      {/* Control Panel (Hidden during Print) */}
      <div className="print:hidden space-y-6">
        {/* Top Header Card with Quick Print & Level Color Legend Ribbon */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  Shelf Rack Label Print Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compact beam spacing, official Level color bands, and Anti-Crossfire 2D QR codes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                onClick={handlePrint}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 cursor-pointer shadow-sm px-5"
              >
                <Printer className="size-4" />
                <span>Print {codes.length} Labels (Save PDF)</span>
              </Button>
            </div>
          </div>

          {/* Level Color Band Compact Ribbon */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Level Color Bands:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                <span className="size-2 rounded-full bg-[#10B981]" /> Level A (Floor)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
                <span className="size-2 rounded-full bg-[#F59E0B]" /> Level B (2nd)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 font-semibold text-[11px]">
                <span className="size-2 rounded-full bg-[#3B82F6]" /> Level C (3rd)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-800 dark:text-purple-300 font-semibold text-[11px]">
                <span className="size-2 rounded-full bg-[#8B5CF6]" /> Level D (Top)
              </span>
            </div>

            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-muted/40">
              {cardWidth} × {cardHeight} • {symbology === "qr" ? "2D QR" : "1D Code128"} • {paperSize.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Two-Column Master Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Dimensions & Symbology Configuration (7 Cols) */}
          <div className="lg:col-span-7">
            <Card className="border border-border/80 shadow-xs lg:h-[440px] flex flex-col">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-blue-600" />
                    Geometry & Hardware Alignment
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-mono">Beam & Scanner Specs</span>
                </div>

                {/* 1. Label Width */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Beam Width Footprint</Label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-semibold">
                      {cardWidth === "65mm" ? "65mm (Recommended • 15/Sheet)" : cardWidth}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: "60mm", label: "60mm Slim", sub: "2.4\" (15/sh)" },
                      { id: "65mm", label: "65mm Compact", sub: "★ Default (15/sh)" },
                      { id: "75mm", label: "75mm Medium", sub: "3.0\" (15/sh)" },
                      { id: "100mm", label: "100mm Full", sub: "4.0\" (10/sh)" },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setCardWidth(w.id as CardWidth)}
                        className={cn(
                          "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-xs transition-all cursor-pointer border",
                          cardWidth === w.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                            : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <span>{w.label}</span>
                        <span className={cn("text-[9.5px] mt-0.5", cardWidth === w.id ? "text-blue-100 font-medium" : "text-muted-foreground/80")}>
                          {w.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Label Height */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Beam Face Height</Label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-semibold">{cardHeight}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "45mm", label: "45mm Standard", sub: "Beam Standard" },
                      { id: "35mm", label: "35mm Medium", sub: "Mid-Height" },
                      { id: "30mm", label: "30mm Slim", sub: "Slim Beam" },
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setCardHeight(h.id as CardHeight)}
                        className={cn(
                          "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-xs transition-all cursor-pointer border",
                          cardHeight === h.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                            : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <span>{h.label}</span>
                        <span className={cn("text-[9.5px] mt-0.5", cardHeight === h.id ? "text-blue-100 font-medium" : "text-muted-foreground/80")}>
                          {h.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Symbology (QR vs Barcode) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Scanner Symbology</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSymbology("qr")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer border",
                        symbology === "qr"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                          : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <QrCode className="size-3.5" />
                      <span>2D QR Code (Recommended)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSymbology("barcode")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer border",
                        symbology === "barcode"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                          : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <BarcodeIcon className="size-3.5" />
                      <span>1D Barcode (Code128)</span>
                    </button>
                  </div>
                </div>

                {/* 4. Anti-Crossfire Alignment */}
                <div className={cn("space-y-1 transition-opacity", symbology !== "qr" && "opacity-40 pointer-events-none")}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Anti-Crossfire Alignment</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {symbology === "qr" ? "Prevents adjacent misreads" : "N/A for 1D Barcode"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "vertical", label: "↕ Top ↔ Bottom", desc: "Vertical Zig-Zag" },
                      { id: "horizontal", label: "↔ Left ↔ Right", desc: "Horizontal Shift" },
                      { id: "diagonal", label: "⤡ Diagonal", desc: "Corner Stagger" },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setQrPlacement(pos.id as QrPlacement)}
                        disabled={symbology !== "qr"}
                        className={cn(
                          "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-xs transition-all cursor-pointer border",
                          qrPlacement === pos.id && symbology === "qr"
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                            : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <span>{pos.label}</span>
                        <span className={cn("text-[9px] mt-0.5", qrPlacement === pos.id && symbology === "qr" ? "text-blue-100 font-medium" : "text-muted-foreground/80")}>
                          {pos.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Paper & Cut-Lines */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60 shrink-0">
                  <div className="space-y-1">
                    <Label htmlFor="paper-size" className="text-xs font-semibold">Paper Medium</Label>
                    <Select value={paperSize} onValueChange={(val) => setPaperSize(val as PaperSize)}>
                      <SelectTrigger id="paper-size" className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Select paper size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">📄 US Letter ({isThreeCols ? "3×5 • 15 labels" : "2×5 • 10 labels"})</SelectItem>
                        <SelectItem value="rack-label">🏷️ {cardWidth} × {cardHeight} Roll</SelectItem>
                        <SelectItem value="compact-label">🏷️ Small Roll (50×30mm)</SelectItem>
                        <SelectItem value="a4">📄 A4 Sheet ({isThreeCols ? "3 cols" : "2 cols"})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cut-Line Border Guides</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowCutLines(true)}
                        className={cn(
                          "h-8 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center",
                          showCutLines
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                            : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        Cut Lines: ON
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCutLines(false)}
                        className={cn(
                          "h-8 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center",
                          !showCutLines
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-bold ring-2 ring-blue-500/30"
                            : "bg-muted/25 border-border/50 text-muted-foreground opacity-65 hover:opacity-100 hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        OFF (Rolls)
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Location Codes Queue & Presets (5 Cols) - Exact same 440px height with inner scroll */}
          <div className="lg:col-span-5">
            <Card className="border border-border/80 shadow-xs lg:h-[440px] flex flex-col">
              <CardContent className="p-4 flex flex-col h-full space-y-2.5 min-h-0">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">Target Locations Queue</h4>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                    {codes.length} Labels
                  </Badge>
                </div>

                {/* Quick Selection Presets */}
                <div className="space-y-1 shrink-0">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    Quick Selection Presets
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {initialDbCodes.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={handleLoadDbLocations}
                        className="h-6.5 text-[11px] font-semibold text-primary cursor-pointer px-2"
                      >
                        <Database className="mr-1 size-2.5" />
                        All ({initialDbCodes.length})
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        const dbZoneA = initialDbCodes.filter((c) => c.startsWith("LOC-A"))
                        setCodesInput(dbZoneA.length > 0 ? dbZoneA.join("\n") : ZONE_A_LOCATION_CODES)
                      }}
                      className="h-6.5 text-[11px] cursor-pointer px-2"
                    >
                      Zone A
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        const dbZoneF = initialDbCodes.filter((c) => c.startsWith("LOC-F"))
                        setCodesInput(dbZoneF.length > 0 ? dbZoneF.join("\n") : ZONE_F_LOCATION_CODES)
                      }}
                      className="h-6.5 text-[11px] cursor-pointer px-2"
                    >
                      Zone F
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        const dbZoneS = initialDbCodes.filter((c) => c.startsWith("LOC-S"))
                        setCodesInput(dbZoneS.length > 0 ? dbZoneS.join("\n") : ZONE_S_LOCATION_CODES)
                      }}
                      className="h-6.5 text-[11px] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 cursor-pointer px-2"
                    >
                      Zone S
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setCodesInput(FOUR_LEVEL_PREVIEW_CODES)}
                      className="h-6.5 text-[11px] text-muted-foreground cursor-pointer px-2"
                    >
                      A~D Demo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setCodesInput("")}
                      className="h-6.5 text-[11px] text-destructive hover:bg-destructive/10 cursor-pointer ml-auto px-1.5"
                    >
                      <RotateCcw className="size-2.5 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Codes Textarea with inner vertical scroll and fixed parent container */}
                <div className="flex-1 min-h-0 flex flex-col space-y-1">
                  <Label htmlFor="codes" className="text-xs font-semibold text-muted-foreground shrink-0">
                    Codes to Print (One location per line)
                  </Label>
                  <Textarea
                    id="codes"
                    value={codesInput}
                    onChange={(e) => setCodesInput(e.target.value)}
                    placeholder={"LOC-A0105A01\nLOC-A0105B01\nLOC-A0105C01\nLOC-F0101A01..."}
                    className="font-mono text-xs flex-1 h-full w-full bg-muted/20 border-border/80 resize-none leading-relaxed p-2.5 overflow-y-auto"
                  />
                  <p className="text-[10.5px] text-muted-foreground leading-tight shrink-0">
                    Standard: <code className="font-mono text-foreground font-bold">LOC-A0105B01</code> (Zone•Aisle•Bay•Level•Bin)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Screen Preview Section (Visible on Screen, Hidden during Print) */}
      <div className="print:hidden space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <h4 className="font-bold text-base text-foreground">
              Physical Shelf Rack Label Preview ({codes.length} labels)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border">
              <button
                type="button"
                onClick={() => setPreviewScale("actual")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  previewScale === "actual"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Actual Size
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale("compact")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  previewScale === "compact"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Compact Overview
              </button>
            </div>
          </div>
        </div>

        <div className="border border-border/80 p-6 bg-muted/15 rounded-2xl overflow-x-auto">
          <div className={cn(
            "flex flex-wrap justify-center transition-all duration-200",
            previewScale === "compact" ? "gap-3 scale-90 origin-top" : "gap-6"
          )}>
            {codes.map((code, index) => (
              <div
                key={`preview-${index}`}
                className="shadow-sm rounded-sm overflow-hidden bg-white hover:shadow-md transition-shadow shrink-0 border border-black/10"
              >
                <ShelfRackLabelCard
                  code={code}
                  showCutLines={showCutLines}
                  symbology={symbology}
                  qrPlacement={qrPlacement}
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actual Print Media Area (Hidden on screen, Active during Window Print) */}
      <div className="hidden print:block rack-print-container">
        {codes.map((code, index) => (
          <ShelfRackLabelCard
            key={`print-${index}`}
            code={code}
            showCutLines={showCutLines}
            symbology={symbology}
            qrPlacement={qrPlacement}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

