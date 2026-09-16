"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer } from "lucide-react"

export function PrintClient() {
  const [code, setCode] = React.useState("SKU-123456")

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8">
      {/* Control panel (hidden when printing) */}
      <div className="print:hidden space-y-4 max-w-md border p-6 rounded-lg bg-card">
        <h3 className="font-semibold text-lg">Label Print Settings</h3>
        <div className="space-y-2">
          <Label htmlFor="code">Barcode Text (SKU or Location)</Label>
          <Input 
            id="code" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
          />
        </div>
        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 h-4 w-4" />
          Print Label (Save to PDF)
        </Button>
      </div>

      {/* Print area (visible on screen and rendered when printing) */}
      <div className="print:block print:w-[50mm] print:h-[30mm] print:m-0 print:p-0">
        <div className="border-2 border-black w-64 h-32 p-4 flex flex-col items-center justify-center bg-white text-black print:border-none print:w-[50mm] print:h-[30mm]">
          {/* Symbolic design instead of real barcode (jsbarcode can be added later) */}
          <div className="flex gap-[2px] h-12 items-end justify-center w-full px-4 mb-2">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className="bg-black h-full" 
                style={{ width: `${Math.max(1, Math.random() * 4)}px` }}
              />
            ))}
          </div>
          <p className="font-mono text-sm tracking-widest">{code}</p>
        </div>
        
        <p className="print:hidden text-sm text-muted-foreground mt-2">
          ↑ Screen Preview (May differ from actual print size)
        </p>
      </div>
    </div>
  )
}
