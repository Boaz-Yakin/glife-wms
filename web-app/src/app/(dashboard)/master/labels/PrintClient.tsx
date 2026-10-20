"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Printer } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Barcode from "react-barcode"

type PaperSize = "letter" | "a4" | "label"

const DEFAULT_LOCATION_CODES = [
  "LOC-A0101A01",
  "LOC-A0101A02",
  "LOC-A0101B01",
  "LOC-A0101B02",
  "LOC-A0101C01",
  "LOC-A0101C02",
].join("\n")

const ZONE_F_LOCATION_CODES = [
  "LOC-F0101A01",
  "LOC-F0101A02",
  "LOC-F0101B01",
  "LOC-F0101B02",
  "LOC-F0101C01",
  "LOC-F0101C02",
].join("\n")

const SAMPLE_SKU_CODES = [
  "BEV-001",
  "BEV-002",
  "BEV-003",
  "BEV-004",
  "BEV-005",
  "BEV-006",
].join("\n")

interface ParsedLocation {
  zone: string
  aisle: string
  bay: string
  level: string
  bin: string
  summary: string
}

function parseLocationCode(code: string): ParsedLocation | null {
  const match = code.trim().match(/^LOC-([A-Z])([0-9]{2})([0-9]{2})([A-D])([0-9]{2})$/)
  if (!match) return null
  const zoneLetter = match[1]
  const zoneName = zoneLetter === 'F' ? 'Zone F (Cold)' : `Zone ${zoneLetter} (Ambient)`
  return {
    zone: zoneName,
    aisle: match[2],
    bay: match[3],
    level: match[4],
    bin: match[5],
    summary: `${zoneName} • Aisle ${match[2]} • Bay ${match[3]} • Tier ${match[4]}-${match[5]}`,
  }
}

export function PrintClient() {
  const [codesInput, setCodesInput] = React.useState(DEFAULT_LOCATION_CODES)
  const [paperSize, setPaperSize] = React.useState<PaperSize>("letter")

  const codes = codesInput.split('\n').map(c => c.trim()).filter(Boolean)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Print Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${paperSize === 'label' ? '50mm 30mm' : paperSize};
            margin: ${paperSize === 'label' ? '0' : '0.5in'};
          }
          body {
            -webkit-print-color-adjust: exact;
          }
          /* Hide App UI elements when printing */
          header, aside, [data-sidebar="sidebar"] {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          svg {
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}} />

      {/* Control panel (hidden when printing) */}
      <div className="print:hidden space-y-6 max-w-2xl border p-6 rounded-xl bg-card shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-foreground">Batch Label Print Settings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard format: <code className="font-mono text-primary font-semibold">LOC-&#123;Zone:1&#125;&#123;Aisle:2&#125;&#123;Bay:2&#125;&#123;Tier:1&#125;&#123;Bin:2&#125;</code> (e.g. <span className="font-mono font-bold text-foreground">LOC-A0101A01</span>)
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Quick Presets</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(DEFAULT_LOCATION_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              Zone A Ambient (Rack 01)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(ZONE_F_LOCATION_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              Zone F Cold (Rack 01)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCodesInput(SAMPLE_SKU_CODES)}
              className="text-xs h-7 px-2.5 font-medium"
            >
              Sample SKUs
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="paper-size">Paper Size</Label>
            <Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}>
              <SelectTrigger id="paper-size" className="w-full">
                <SelectValue placeholder="Select paper size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">Letter (8.5" x 11")</SelectItem>
                <SelectItem value="a4">A4 (210 x 297mm)</SelectItem>
                <SelectItem value="label">Label Printer (50 x 30mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="codes">Barcodes (One per line)</Label>
            <Textarea 
              id="codes" 
              value={codesInput} 
              onChange={(e) => setCodesInput(e.target.value)} 
              rows={7}
              placeholder={"LOC-A0101A01\nLOC-A0101A02\nLOC-F0101A01..."}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Total <span className="font-semibold text-foreground">{codes.length}</span> labels to print.
            </p>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full font-semibold shadow-xs">
          <Printer className="mr-2 h-4 w-4" />
          Print Labels (Save to PDF)
        </Button>
      </div>

      {/* Actual Print area (hidden on screen, visible on print) */}
      <div className={`hidden ${paperSize === 'label' ? 'print:block' : 'print:grid print:grid-cols-3 print:gap-x-4 print:gap-y-6'}`}>
        {codes.map((code, index) => {
          const locInfo = parseLocationCode(code)
          return (
            <div 
              key={index} 
              className={`
                flex flex-col items-center justify-center bg-white text-black mx-auto w-full overflow-hidden
                ${paperSize === 'label' 
                  ? ('h-[30mm] p-1.5 ' + (index < codes.length - 1 ? 'print:break-after-page' : ''))
                  : 'p-4 print:border print:border-dashed print:border-gray-400'}
              `}
            >
              {locInfo && (
                <div className="w-full text-center px-1 mb-1 leading-tight select-none">
                  <span className="block text-[9px] font-bold text-gray-900 tracking-wider uppercase">
                    {locInfo.zone}
                  </span>
                  <span className="block text-[8px] font-semibold text-gray-600 tracking-wide uppercase">
                    Aisle {locInfo.aisle} • Bay {locInfo.bay} • Tier {locInfo.level}-{locInfo.bin}
                  </span>
                </div>
              )}
              <div className="w-full flex items-center justify-center overflow-hidden px-1 [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block">
                <Barcode 
                  value={code} 
                  width={paperSize === 'label' ? 1.1 : 1.2} 
                  height={paperSize === 'label' ? 34 : 42} 
                  fontSize={12} 
                  font="monospace"
                  displayValue={true} 
                  margin={0} 
                  background="#ffffff" 
                  lineColor="#000000" 
                  className="max-w-full h-auto block"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Screen Preview (visible on screen, hidden on print) */}
      <div className="print:hidden">
        <h4 className="font-semibold text-base mb-4 text-foreground">Screen Preview ({codes.length} labels)</h4>
        <div className={`
          border p-6 bg-muted/20 rounded-xl
          ${paperSize === 'label' ? 'flex flex-col gap-4 items-start' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'}
        `}>
          {codes.map((code, index) => {
            const locInfo = parseLocationCode(code)
            return (
              <div 
                key={`preview-${index}`} 
                className={`
                  flex flex-col items-center justify-center bg-white text-black rounded-lg overflow-hidden transition-shadow hover:shadow-md
                  ${paperSize === 'label' ? 'border shadow-xs w-[60mm] min-h-[35mm] p-3' : 'border border-dashed border-gray-300 py-4 px-3 shadow-xs min-w-0'}
                `}
              >
                {locInfo && (
                  <div className="w-full text-center px-1 mb-1.5 leading-tight select-none">
                    <span className="block text-[10px] font-bold text-gray-900 tracking-wider uppercase">
                      {locInfo.zone}
                    </span>
                    <span className="block text-[9px] font-semibold text-gray-600 tracking-wide uppercase">
                      Aisle {locInfo.aisle} • Bay {locInfo.bay} • Tier {locInfo.level}-{locInfo.bin}
                    </span>
                  </div>
                )}
                <div className="w-full flex items-center justify-center overflow-hidden px-1 [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block">
                  <Barcode 
                    value={code} 
                    width={1.15} 
                    height={38} 
                    fontSize={12} 
                    font="monospace"
                    displayValue={true} 
                    margin={0} 
                    className="max-w-full h-auto block"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
