"use client"

import * as React from "react"
import { ItemData } from "@/services/master.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Printer,
  Search,
  Plus,
  Trash2,
  Barcode as BarcodeIcon,
  QrCode,
  Layers,
  Sparkles,
  RotateCcw,
  Tag,
  CheckCircle2,
} from "lucide-react"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export type ItemPaperSize = "roll-50x30" | "roll-60x40" | "roll-80x50" | "a4-24up"
export type ItemSymbology = "barcode" | "qr"

interface QueueItem {
  item: ItemData
  copies: number
}

export function ItemBarcodePrintClient({ items }: { items: ItemData[] }) {
  const [search, setSearch] = React.useState("")
  const [selectedQueue, setSelectedQueue] = React.useState<QueueItem[]>([])
  const [paperSize, setPaperSize] = React.useState<ItemPaperSize>("roll-50x30")
  const [symbology, setSymbology] = React.useState<ItemSymbology>("barcode")
  const [includePrice, setIncludePrice] = React.useState(false)

  // Filter available items by search
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items.slice(0, 15) // Show top 15 when empty
    const q = search.toLowerCase()
    return items.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.name_en.toLowerCase().includes(q) ||
        (item.desc_en && item.desc_en.toLowerCase().includes(q)) ||
        (item.upc && item.upc.toLowerCase().includes(q))
    )
  }, [items, search])

  // Total labels in queue
  const totalLabelsCount = React.useMemo(() => {
    return selectedQueue.reduce((acc, q) => acc + q.copies, 0)
  }, [selectedQueue])

  // Helper to format Item Name (Description)
  const formatFullName = (item: ItemData) => {
    const name = item.name_en?.trim() || "N/A"
    const desc = item.desc_en?.trim()
    return desc ? `${name} (${desc})` : name
  }

  // Add item to queue
  const addItemToQueue = (item: ItemData, copies = 1) => {
    setSelectedQueue((prev) => {
      const existing = prev.find((q) => q.item.id === item.id)
      if (existing) {
        return prev.map((q) => (q.item.id === item.id ? { ...q, copies: q.copies + copies } : q))
      }
      return [...prev, { item, copies }]
    })
    toast.success(`Added ${item.sku} (${copies} copy)`)
  }

  // Batch add all filtered items
  const addAllFiltered = () => {
    if (filteredItems.length === 0) return
    setSelectedQueue((prev) => {
      const map = new Map(prev.map((q) => [q.item.id, q]))
      for (const item of filteredItems) {
        if (map.has(item.id)) {
          const existing = map.get(item.id)!
          existing.copies += 1
        } else {
          map.set(item.id, { item, copies: 1 })
        }
      }
      return Array.from(map.values())
    })
    toast.success(`Added ${filteredItems.length} items to print queue.`)
  }

  // Stepper update copies
  const updateCopies = (itemId: string, delta: number) => {
    setSelectedQueue((prev) =>
      prev
        .map((q) => {
          if (q.item.id === itemId) {
            const nextCopies = Math.max(1, q.copies + delta)
            return { ...q, copies: nextCopies }
          }
          return q
        })
        .filter((q) => q.copies > 0)
    )
  }

  // Remove from queue
  const removeFromQueue = (itemId: string) => {
    setSelectedQueue((prev) => prev.filter((q) => q.item.id !== itemId))
  }

  // Print action
  const handlePrint = () => {
    if (totalLabelsCount === 0) {
      toast.error("Please add at least one item to print queue.")
      return
    }
    window.print()
  }

  // Flatten queue items for rendering (repeats according to copies)
  const flattenedLabels = React.useMemo(() => {
    const list: ItemData[] = []
    for (const q of selectedQueue) {
      for (let i = 0; i < q.copies; i++) {
        list.push(q.item)
      }
    }
    return list
  }, [selectedQueue])

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          Controls & Queue Management (Hidden when printing)
      ───────────────────────────────────────────────────────────── */}
      <div className="print:hidden space-y-6">
        {/* Step 1: Configuration Toolbar */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Tag className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-none">Item Barcode Print Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select label paper size, barcode type, and target products to print.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  onClick={handlePrint}
                  disabled={totalLabelsCount === 0}
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 cursor-pointer shadow-sm"
                >
                  <Printer className="size-4" />
                  <span>Print {totalLabelsCount} Labels</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              {/* Paper Format */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Label Paper Size</Label>
                <Select value={paperSize} onValueChange={(val) => setPaperSize(val as ItemPaperSize)}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roll-50x30">Roll: 50mm × 30mm (2" × 1.2" Compact)</SelectItem>
                    <SelectItem value="roll-60x40">Roll: 60mm × 40mm (2.4" × 1.6" Standard)</SelectItem>
                    <SelectItem value="roll-80x50">Roll: 80mm × 50mm (3.1" × 2" Large Box)</SelectItem>
                    <SelectItem value="a4-24up">Sheet: A4 24-Up (70mm × 37mm Sticker)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Barcode Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Barcode Symbology</Label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted/70 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSymbology("barcode")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                      symbology === "barcode"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <BarcodeIcon className="size-3.5" />
                    1D Code128
                  </button>
                  <button
                    type="button"
                    onClick={() => setSymbology("qr")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                      symbology === "qr"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <QrCode className="size-3.5" />
                    2D QR
                  </button>
                </div>
              </div>

              {/* Price display toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Price Display</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIncludePrice(!includePrice)}
                  className={cn(
                    "w-full h-9 justify-start font-normal cursor-pointer text-xs",
                    includePrice && "border-primary/50 bg-primary/5 text-primary font-medium"
                  )}
                >
                  <CheckCircle2 className={cn("size-3.5 mr-2", includePrice ? "text-primary" : "text-muted-foreground")} />
                  {includePrice ? "Include Unit Price ($)" : "Hide Unit Price"}
                </Button>
              </div>

              {/* Preset quick actions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Queue Actions</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedQueue([])}
                    disabled={selectedQueue.length === 0}
                    className="flex-1 h-9 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Item Selection Grid & Print Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Search & Catalog (5 cols) */}
          <Card className="lg:col-span-5 border border-border/80 shadow-xs flex flex-col h-[520px]">
            <div className="p-3.5 border-b border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Product Master Catalog</h4>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredItems.length} SKUs
                </Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search SKU, Item Name, or UPC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">Click item to add to print queue</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addAllFiltered}
                  className="h-7 text-xs text-primary font-medium hover:bg-primary/10 cursor-pointer"
                >
                  <Plus className="size-3 mr-1" />
                  Add All Filtered
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-1">
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addItemToQueue(item, 1)}
                    className="p-2.5 hover:bg-muted/50 rounded-md transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-foreground">{item.sku}</span>
                        {item.upc && (
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1 rounded">
                            UPC: {item.upc}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                        {formatFullName(item)}
                      </p>
                    </div>

                    <Button
                      size="xs"
                      variant="outline"
                      className="shrink-0 size-7 p-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No items found matching "{search}".
                </div>
              )}
            </div>
          </Card>

          {/* Right Panel: Selected Print Queue (7 cols) */}
          <Card className="lg:col-span-7 border border-border/80 shadow-xs flex flex-col h-[520px]">
            <div className="p-3.5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Print Queue & Copies</h4>
                <p className="text-xs text-muted-foreground">
                  Adjust label copies for each SKU before printing.
                </p>
              </div>
              <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-xs">
                Total: {totalLabelsCount} labels
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2">
              {selectedQueue.length ? (
                selectedQueue.map((q) => (
                  <div key={q.item.id} className="p-3 flex items-center justify-between gap-4 hover:bg-muted/30 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">{q.item.sku}</span>
                        {q.item.upc && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            [{q.item.upc}]
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate mt-0.5" title={formatFullName(q.item)}>
                        {formatFullName(q.item)}
                      </p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => updateCopies(q.item.id, -5)}
                        className="h-7 px-1.5 font-mono text-[11px] text-muted-foreground cursor-pointer"
                        title="-5 copies"
                      >
                        -5
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => updateCopies(q.item.id, -1)}
                        className="size-7 p-0 cursor-pointer"
                      >
                        -
                      </Button>

                      <Input
                        type="number"
                        min={1}
                        value={q.copies}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1)
                          setSelectedQueue((prev) =>
                            prev.map((item) => (item.item.id === q.item.id ? { ...item, copies: val } : item))
                          )
                        }}
                        className="w-14 h-7 text-center font-mono font-bold text-xs"
                      />

                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => updateCopies(q.item.id, 1)}
                        className="size-7 p-0 cursor-pointer"
                      >
                        +
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => updateCopies(q.item.id, 5)}
                        className="h-7 px-1.5 font-mono text-[11px] text-muted-foreground cursor-pointer"
                        title="+5 copies"
                      >
                        +5
                      </Button>

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => removeFromQueue(q.item.id)}
                        className="size-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer ml-1"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                  <div className="p-3 rounded-full bg-muted">
                    <Tag className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Print queue is empty</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Select products from the left catalog or search by SKU to build your label batch.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Printable Area & Preview
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="print:hidden flex items-center justify-between pt-2 border-t border-border/80">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              Live Label Preview & Layout
            </h3>
            <Badge variant="outline" className="text-xs font-mono">
              {paperSize.toUpperCase()}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Print preview displays actual physical dimensions.
          </span>
        </div>

        {/* Physical Labels Container */}
        <div
          id="item-barcode-print-area"
          className={cn(
            "p-4 bg-muted/20 border border-dashed border-border rounded-xl print:p-0 print:border-none print:bg-transparent",
            paperSize === "a4-24up"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-2"
              : "flex flex-wrap gap-3 print:gap-0"
          )}
        >
          {flattenedLabels.length > 0 ? (
            flattenedLabels.map((item, idx) => {
              const barcodeValue = item.upc || item.sku
              const fullName = formatFullName(item)

              return (
                <div
                  key={`${item.id}-${idx}`}
                  className={cn(
                    "item-label-card bg-white text-black border border-black/80 rounded-sm flex flex-col justify-between overflow-hidden relative shadow-xs print:shadow-none print:border-black print:break-inside-avoid",
                    // Size specific styles
                    paperSize === "roll-50x30" && "w-[50mm] h-[30mm] p-[1.5mm]",
                    paperSize === "roll-60x40" && "w-[60mm] h-[40mm] p-[2.5mm]",
                    paperSize === "roll-80x50" && "w-[80mm] h-[50mm] p-[3.5mm]",
                    paperSize === "a4-24up" && "w-[70mm] h-[37mm] p-[2mm]"
                  )}
                  style={{
                    boxSizing: "border-box",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  {/* Top: SKU & Price */}
                  <div className="flex items-start justify-between gap-1 leading-tight">
                    <span className="font-mono font-black text-[11px] sm:text-[12px] tracking-tight">
                      {item.sku}
                    </span>
                    {includePrice && item.unit_price > 0 && (
                      <span className="font-mono font-bold text-[10px] text-black">
                        ${Number(item.unit_price).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Product Full Name (Description) */}
                  <div
                    className={cn(
                      "font-sans font-bold leading-tight line-clamp-2 text-black my-0.5",
                      paperSize === "roll-50x30" ? "text-[8.5px]" : "text-[10px]"
                    )}
                    title={fullName}
                  >
                    {fullName}
                  </div>

                  {/* Center: Barcode or QR */}
                  <div className="flex items-center justify-center my-auto py-0.5">
                    {symbology === "barcode" ? (
                      <div className="flex flex-col items-center justify-center scale-95 origin-center">
                        <Barcode
                          value={barcodeValue}
                          format="CODE128"
                          width={paperSize === "roll-50x30" ? 1.05 : 1.3}
                          height={paperSize === "roll-50x30" ? 24 : 32}
                          fontSize={9}
                          margin={0}
                          displayValue={false}
                        />
                        <span className="font-mono text-[8px] sm:text-[9px] tracking-widest mt-0.5">
                          {barcodeValue}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <QRCodeSVG value={barcodeValue} size={paperSize === "roll-50x30" ? 42 : 54} level="M" />
                        <span className="font-mono text-[9px] font-bold">{barcodeValue}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Meta info */}
                  <div className="flex items-center justify-between text-[7.5px] font-mono text-neutral-600 border-t border-neutral-300 pt-0.5">
                    <span>{item.category || "GLIFE WMS"}</span>
                    <span>UOM: {item.uom || "EA"}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="w-full py-12 text-center text-muted-foreground text-xs print:hidden">
              Select products from the catalog above to view real-time label previews.
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Global Print CSS Rules
      ───────────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          header,
          footer,
          nav,
          aside,
          .print\\:hidden {
            display: none !important;
          }
          #item-barcode-print-area {
            display: flex !important;
            flex-wrap: wrap !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
          }
          .item-label-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            border: 1px solid #000 !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  )
}
