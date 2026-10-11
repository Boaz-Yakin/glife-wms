"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Printer } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Barcode from "react-barcode"

type PaperSize = "letter" | "a4" | "label"

export function PrintClient() {
  const [codesInput, setCodesInput] = React.useState("LOC-A01-01\nLOC-A01-02\nLOC-A01-03\nLOC-A01-04\nLOC-A01-05")
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
        }
      `}} />

      {/* Control panel (hidden when printing) */}
      <div className="print:hidden space-y-6 max-w-2xl border p-6 rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Batch Label Print Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="paper-size">Paper Size</Label>
            <Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}>
              <SelectTrigger id="paper-size">
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
              rows={6}
              placeholder="LOC-001\nLOC-002..."
            />
            <p className="text-xs text-muted-foreground">
              Total {codes.length} labels to print.
            </p>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 h-4 w-4" />
          Print Labels (Save to PDF)
        </Button>
      </div>

      {/* Actual Print area (hidden on screen, visible on print) */}
      <div className={`hidden ${paperSize === 'label' ? 'print:block' : 'print:grid print:grid-cols-3 print:gap-x-4 print:gap-y-6'}`}>
        {codes.map((code, index) => (
          <div 
            key={index} 
            className={`
              flex flex-col items-center justify-center bg-white text-black
              ${paperSize === 'label' 
                ? 'w-[50mm] h-[30mm] print:break-after-page' 
                : 'p-4'}
            `}
          >
            <Barcode value={code} width={1.5} height={50} fontSize={14} displayValue={true} background="#ffffff" lineColor="#000000" />
          </div>
        ))}
      </div>

      {/* Screen Preview (visible on screen, hidden on print) */}
      <div className="print:hidden">
        <h4 className="font-medium mb-4">Screen Preview ({codes.length} labels)</h4>
        <div className={`
          border p-6 bg-muted/20 rounded-md
          ${paperSize === 'label' ? 'flex flex-col gap-4' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'}
        `}>
          {codes.map((code, index) => (
            <div 
              key={`preview-${index}`} 
              className={`
                flex flex-col items-center justify-center bg-white text-black border shadow-sm mx-auto w-full
                ${paperSize === 'label' ? 'max-w-[200px] h-[120px]' : 'py-6'}
              `}
            >
              <Barcode value={code} width={1.2} height={40} fontSize={12} displayValue={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
