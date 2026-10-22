"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Printer, Eye, Sparkles, Database, Check, QrCode, Barcode as BarcodeIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react"

export type PaperSize = "letter" | "rack-label" | "compact-label" | "a4"
export type LabelSymbology = "qr" | "barcode"
export type QrPlacement = "vertical" | "horizontal" | "diagonal" | "fixed-right" | "fixed-left"

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
}

// ─────────────────────────────────────────────────────────────
// Preset Location Barcode Batches
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
// Shelf Rack Physical Label Component (100mm × 45mm / 4" × 1.8")
// Supports Vertical (Top ↔ Bottom) and Horizontal (Left ↔ Right) Zig-Zag
// ─────────────────────────────────────────────────────────────
function ShelfRackLabelCard({
  code,
  showCutLines = true,
  symbology = "qr",
  qrPlacement = "vertical",
  index = 0,
}: {
  code: string
  showCutLines?: boolean
  symbology?: LabelSymbology
  qrPlacement?: QrPlacement
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
      : false // In vertical zig-zag, QR stays on Right column, jumping TOP ↕ BOTTOM

  // Standard Product SKU Fallback
  if (!loc) {
    if (symbology === "qr") {
      const qrSkuBox = (
        <div className="w-[33mm] h-[38mm] flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-1 bg-white">
          <QRCodeSVG
            value={code}
            size={96}
            level="M"
            marginSize={1}
            className="w-full h-auto max-h-[30mm] block [shape-rendering:crispEdges]"
          />
          <span className="text-[7.5px] font-mono font-bold text-zinc-600 uppercase tracking-wider mt-0.5">
            SCAN SKU
          </span>
        </div>
      )

      const infoSkuBox = (
        <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Product SKU</span>
            <span className="font-mono font-black text-lg tracking-tight uppercase block text-zinc-900 mt-1 break-all">
              {code}
            </span>
          </div>
          <div className="border-t border-zinc-200 pt-1">
            <span className="text-[9px] text-zinc-500 font-medium">Standard Inventory Item</span>
          </div>
        </div>
      )

      return (
        <div
          className={`shelf-rack-label-card relative bg-white text-zinc-950 ${
            showCutLines ? "border border-dashed border-zinc-400" : "border border-transparent"
          } flex flex-row items-center justify-between overflow-hidden p-3 box-border select-none gap-2`}
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
        } flex flex-col justify-between overflow-hidden p-2.5 box-border select-none`}
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

  // ─── 2D QR Code Layout Blocks ───
  // A. Vertical Zig-Zag Mode (Top vs Bottom shift)
  const isVerticalMode = qrPlacement === "vertical" || qrPlacement === "diagonal"

  const qrVerticalColumn = (
    <div className="w-[34mm] h-[40.5mm] flex flex-col justify-between shrink-0">
      {isQrTop ? (
        /* Top QR Mode (Level A, Level C) */
        <>
          <div className="w-[34mm] h-[26.5mm] flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-1 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <QRCodeSVG
              value={loc.raw}
              size={88}
              level="M"
              marginSize={1}
              className="w-auto h-[23.5mm] block [shape-rendering:crispEdges]"
            />
          </div>
          <div className="w-[34mm] h-[12.5mm] flex flex-col items-center justify-center shrink-0 border border-emerald-300 rounded px-1 py-0.5 bg-emerald-50/70">
            <span className="text-[10px] font-mono font-black text-emerald-950 tracking-wider leading-none">
              {loc.shortLocation}
            </span>
            <span className="text-[7.5px] font-bold text-emerald-700 bg-white border border-emerald-200 rounded px-1.5 py-0.2 mt-0.5 uppercase tracking-wider leading-none">
              ▲ TOP QR
            </span>
          </div>
        </>
      ) : (
        /* Bottom QR Mode (Level B, Level D) */
        <>
          <div className="w-[34mm] h-[12.5mm] flex flex-col items-center justify-center shrink-0 border border-amber-300 rounded px-1 py-0.5 bg-amber-50/70">
            <span className="text-[7.5px] font-bold text-amber-800 bg-white border border-amber-200 rounded px-1.5 py-0.2 mb-0.5 uppercase tracking-wider leading-none">
              ▼ BTM QR
            </span>
            <span className="text-[10px] font-mono font-black text-amber-950 tracking-wider leading-none">
              {loc.shortLocation}
            </span>
          </div>
          <div className="w-[34mm] h-[26.5mm] flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-1 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <QRCodeSVG
              value={loc.raw}
              size={88}
              level="M"
              marginSize={1}
              className="w-auto h-[23.5mm] block [shape-rendering:crispEdges]"
            />
          </div>
        </>
      )}
    </div>
  )

  // B. Standard / Horizontal Full-Height QR Box
  const qrFullHeightColumn = (
    <div className="w-[34mm] h-[39.5mm] flex flex-col items-center justify-center shrink-0 border border-zinc-200 rounded p-1 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <QRCodeSVG
        value={loc.raw}
        size={100}
        level="M"
        marginSize={1}
        className="w-full h-auto max-h-[30.5mm] block [shape-rendering:crispEdges]"
      />
      <span className="text-[8.5px] font-mono font-black text-zinc-900 tracking-wider mt-0.5">
        {loc.shortLocation}
      </span>
    </div>
  )

  // Coordinates Column (Aisle/Bay + 38~44pt Level/Bin + Badges)
  const coordsBox = (
    <div className="flex-1 h-full flex flex-col justify-between overflow-hidden">
      {/* Top: Zone & Level Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div
          className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight border uppercase leading-none"
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
          className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight border flex items-center gap-1 leading-none"
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

      {/* Middle: 3-Chunk Visual Hierarchy Coordinates */}
      <div className="flex items-baseline justify-between gap-1 my-auto">
        {/* Upper Coordinates (Aisle & Bay) */}
        <div className="flex flex-col">
          <span className="font-mono font-bold text-[19px] text-zinc-800 tracking-tight leading-none">
            {loc.humanAisleBay}
          </span>
          <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-tight mt-0.5">
            Aisle {loc.aisle} • Bay {loc.bay}
          </span>
        </div>

        {/* Main Pick Coordinate: Level & Bin (38~44pt Bold) */}
        <div className="flex flex-col items-end">
          <span
            className="font-mono font-black text-[38px] leading-none text-zinc-950 tracking-tighter"
            style={{ fontFamily: "'Geist Mono', monospace, sans-serif" }}
          >
            {loc.humanLevelBin}
          </span>
          <span className="text-[8.5px] font-bold text-zinc-700 tracking-tight mt-0.5 uppercase">
            Level {loc.level} • Bin {loc.bin}
          </span>
        </div>
      </div>

      {/* Bottom: Raw Machine Location String */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-1">
        <span className="font-mono font-bold text-[10.5px] text-zinc-800 tracking-wider">
          {loc.raw}
        </span>
        <span className="text-[7.5px] font-bold tracking-wider uppercase text-zinc-500">
          LOCATION 2D
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
      {/* 
        Right-Edge Physical Level Color Band (7.5mm Solid Strip)
        Uses inline SVG rect to GUARANTEE full-color printing on all browsers
        even if the user's print preview has 'Background graphics' unchecked!
      */}
      <div className="absolute top-0 right-0 bottom-0 w-[7.5mm] h-full overflow-hidden select-none">
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
            className="text-white font-black text-[9px] tracking-widest uppercase whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              letterSpacing: "0.15em",
            }}
          >
            {loc.levelStyle.englishLevel}
          </span>
        </div>
      </div>

      {/* Internal Label Content Area (Uses 92.5mm width) */}
      {symbology === "qr" ? (
        /* ─── 2D QR Code Zig-Zag Industrial Layout ─── */
        <div className="w-[92.5mm] h-full pl-[3.5mm] pr-[2.5mm] py-[2.2mm] box-border flex items-center justify-between gap-2.5">
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
        <div className="pr-[9mm] pl-[3mm] pt-[2.2mm] pb-[1.5mm] h-full flex flex-col justify-between">
          {/* Top: Human-Readable 3-Chunk Visual Hierarchy */}
          <div>
            <div className="flex items-start justify-between gap-1 leading-none">
              {/* Left: Upper Coordinates (Aisle & Bay) */}
              <div className="flex flex-col">
                <span className="font-mono font-bold text-[19px] text-zinc-800 tracking-tight leading-tight">
                  {loc.humanAisleBay}
                </span>
                <span className="text-[8.5px] font-semibold text-zinc-500 uppercase tracking-tight mt-0.5">
                  Aisle {loc.aisle} • Bay {loc.bay}
                </span>
              </div>

              {/* Center: Main Final Position (Level & Bin) — 38~44pt Bold */}
              <div className="flex flex-col items-center -mt-0.5">
                <span
                  className="font-mono font-black text-[38px] leading-none text-zinc-950 tracking-tighter"
                  style={{ fontFamily: "'Geist Mono', monospace, sans-serif" }}
                >
                  {loc.humanLevelBin}
                </span>
                <span className="text-[9px] font-bold text-zinc-700 tracking-tight mt-0.5 uppercase">
                  Level {loc.level} • Bin {loc.bin}
                </span>
              </div>

              {/* Right: Zone Badge & Level Color Indicator */}
              <div className="flex flex-col items-end gap-1">
                <div
                  className="px-2 py-0.5 rounded text-[8px] font-bold tracking-tight border uppercase"
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
                  className="px-2 py-0.5 rounded text-[8px] font-bold tracking-tight border flex items-center gap-1.5"
                  style={{
                    backgroundColor: loc.levelStyle.bgHex,
                    color: loc.levelStyle.textHex,
                    borderColor: loc.levelStyle.borderHex,
                    printColorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: loc.levelStyle.colorHex }}
                  />
                  <span>{loc.levelStyle.englishLevel}</span>
                </div>
              </div>
            </div>

            {/* Thin Horizontal Divider */}
            <div className="w-full h-[1px] bg-zinc-300 mt-1 mb-0.5" />
          </div>

          {/* Bottom: Machine-Readable Code 128 Barcode */}
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
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Print Client Component (English Unified)
// ─────────────────────────────────────────────────────────────
export function PrintClient({ initialDbCodes = [] }: { initialDbCodes?: string[] }) {
  const [codesInput, setCodesInput] = React.useState(FOUR_LEVEL_PREVIEW_CODES)
  const [paperSize, setPaperSize] = React.useState<PaperSize>("letter")
  const [symbology, setSymbology] = React.useState<LabelSymbology>("qr")
  const [qrPlacement, setQrPlacement] = React.useState<QrPlacement>("vertical")
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
                ? "16mm 6mm 14mm 6mm"
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
              <h3 className="font-bold text-lg text-foreground">Shelf Rack Label Print Settings</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Standard 100mm × 45mm (4" × 1.8") • {symbology === "qr" ? "QR Code (2D)" : "Barcode (1D)"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Glife WMS Standard: 44pt visual hierarchy, Level color bands (Green / Gold / Blue / Purple), and {symbology === "qr" ? "Anti-Crossfire 2D QR Codes" : "Code 128 Barcodes"}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="font-semibold shadow-xs">
              <Printer className="mr-1.5 h-4 w-4" />
              Print Labels (Save PDF)
            </Button>
          </div>
        </div>

        {/* 4 Level Color Bands Legend Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="font-bold block">Level A (Floor / 1st)</span>
              <span className="text-[10px] text-emerald-700">Green Band (#10B981)</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="font-bold block">Level B (Middle / 2nd)</span>
              <span className="text-[10px] text-amber-700">Gold Band (#F59E0B)</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-50 border border-blue-300 text-blue-950">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
            <div>
              <span className="font-bold block">Level C (Upper / 3rd)</span>
              <span className="text-[10px] text-blue-700">Blue Band (#3B82F6)</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-purple-50 border border-purple-300 text-purple-950">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0" />
            <div>
              <span className="font-bold block">Level D (Top / 4th)</span>
              <span className="text-[10px] text-purple-700">Purple Band (#8B5CF6)</span>
            </div>
          </div>
        </div>

        {/* Quick Presets Buttons */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>One-Click Presets</span>
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(FOUR_LEVEL_PREVIEW_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              🌈 4 Level Color Bands (A~D)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(ZONE_A_LOCATION_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              Ambient Rack 01 (Zone A)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(ZONE_F_LOCATION_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              Cold Storage Rack 01 (Zone F)
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
                Load All Warehouse Locations ({initialDbCodes.length})
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCodesInput(SAMPLE_SKU_CODES)}
              className="text-xs h-7 px-2.5 font-medium text-muted-foreground"
            >
              Sample SKUs
            </Button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Symbology Toggle (QR Code 2D vs Barcode 1D) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Symbology (Code Type)</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSymbology("qr")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    symbology === "qr"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <QrCode className="size-4" />
                  <span>QR Code (2D)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSymbology("barcode")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    symbology === "barcode"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <BarcodeIcon className="size-4" />
                  <span>Barcode (1D)</span>
                </button>
              </div>
            </div>

            {/* QR Placement Mode (Vertical Top/Bottom vs Horizontal vs Diagonal) */}
            {symbology === "qr" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">QR Code Alignment (Anti-Crossfire)</Label>
                  <span className="text-[10px] text-primary font-semibold">
                    {qrPlacement === "vertical"
                      ? "↕ Top ↔ Bottom (Active)"
                      : qrPlacement === "horizontal"
                      ? "↔ Left ↔ Right (Active)"
                      : qrPlacement === "diagonal"
                      ? "⤡ Diagonal (Active)"
                      : "Fixed"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQrPlacement("vertical")}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      qrPlacement === "vertical"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <span>↕ Top ↔ Bottom</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrPlacement("horizontal")}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      qrPlacement === "horizontal"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <span>↔ Left ↔ Right</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrPlacement("diagonal")}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      qrPlacement === "diagonal"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <span>⤡ Diagonal</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  • <strong>↕ Top ↔ Bottom (Vertical Zig-Zag)</strong>: Staggers QR codes between Upper (Level A/C) and Lower (Level B/D) positions. Eliminates horizontal scanner cross-reading when labels are mounted side-by-side along shelf beams.<br />
                  • <strong>↔ Left ↔ Right</strong>: Alternates between Right and Left for vertical rack posts.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paper-size" className="text-xs font-semibold">Paper Size</Label>
              <Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}>
                <SelectTrigger id="paper-size" className="w-full">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">
                    📄 US Letter (8.5" × 11" - 2 cols × 5 rows, 10 labels/sheet)
                  </SelectItem>
                  <SelectItem value="rack-label">
                    🏷️ 4" × 2" (100×45mm) Dedicated Roll Label (Continuous)
                  </SelectItem>
                  <SelectItem value="compact-label">
                    🏷️ Compact Roll Label (2" × 1.2" / 50×30mm)
                  </SelectItem>
                  <SelectItem value="a4">
                    📄 A4 Paper (210 × 297mm - 2 cols × 5 rows)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cut-lines" className="text-xs font-semibold">Cut-Line Border Guides</Label>
                <button
                  type="button"
                  onClick={() => setShowCutLines(!showCutLines)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                    showCutLines ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {showCutLines ? "Cut Lines: ON" : "Cut Lines: OFF (Roll Labels)"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                • Turn <strong>ON</strong> for <strong>US Letter</strong> or <strong>A4</strong> paper to guide scissor / paper trimmer cutting (10 labels per sheet).<br />
                • Turn <strong>OFF</strong> for <strong>4" × 2" die-cut roll labels</strong> to remove borders.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="codes" className="text-xs font-semibold">Codes to Print (One per line)</Label>
              <span className="text-xs font-mono text-muted-foreground">
                Total: <strong className="text-foreground font-bold">{codes.length}</strong>
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
              Physical Shelf Rack Label Preview ({symbology === "qr" ? "2D QR Code" : "1D Barcode"} • {codes.length} labels)
            </h4>
          </div>
          <span className="text-xs text-muted-foreground">
            Official Size: 100mm × 45mm (approx 4" × 1.8")
          </span>
        </div>

        <div className="border p-6 bg-muted/20 rounded-xl overflow-x-auto">
          <div className="flex flex-wrap gap-6 justify-center">
            {codes.map((code, index) => (
              <div
                key={`preview-${index}`}
                className="shadow-sm rounded overflow-hidden bg-white hover:shadow-md transition-shadow shrink-0"
              >
                <ShelfRackLabelCard
                  code={code}
                  showCutLines={showCutLines}
                  symbology={symbology}
                  qrPlacement={qrPlacement}
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
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
