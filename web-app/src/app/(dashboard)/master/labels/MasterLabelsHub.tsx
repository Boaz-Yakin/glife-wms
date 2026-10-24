"use client"

import * as React from "react"
import { ItemData } from "@/services/master.service"
import { PrintClient } from "./PrintClient"
import { ItemBarcodePrintClient } from "./ItemBarcodePrintClient"
import { MapPin, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

interface MasterLabelsHubProps {
  initialDbCodes: string[]
  items: ItemData[]
}

export function MasterLabelsHub({ initialDbCodes, items }: MasterLabelsHubProps) {
  const [activeTab, setActiveTab] = React.useState<"location" | "item">("location")

  return (
    <div className="flex flex-col gap-6 print:m-0 print:p-0 print:block">
      {/* Header & Mode Switcher (Hidden when printing) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {activeTab === "location"
                ? "Shelf Rack Physical Labels (Location QR / Barcode)"
                : "Product Barcode Labels (Item / SKU Stickers)"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {activeTab === "location"
                ? "Generate official warehouse shelf rack labels (65mm Compact Width) with Level color bands and 2D QR / 1D barcodes."
                : "Generate and print adhesive product barcode stickers (50×30mm / 60×40mm / 80×50mm Roll or A4) with SKU and Item Name (Description)."}
            </p>
          </div>

          {/* Mode Segmented Switcher */}
          <div className="flex items-center p-1 bg-muted/80 rounded-xl border border-border shrink-0 self-start sm:self-auto shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("location")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "location"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="size-3.5 text-primary" />
              <span>Rack Locations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("item")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "item"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Tag className="size-3.5 text-primary" />
              <span>Item Barcodes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Shelf Rack Locations */}
      {activeTab === "location" && <PrintClient initialDbCodes={initialDbCodes} />}

      {/* Tab 2: Item SKU Barcodes */}
      {activeTab === "item" && <ItemBarcodePrintClient items={items} />}
    </div>
  )
}
