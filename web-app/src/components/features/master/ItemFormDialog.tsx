"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface Partner {
  id: string
  name: string
  type?: string
}

interface ItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partners: Partner[]
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
}

export function ItemFormDialog({ open, onOpenChange, partners, onSubmit, loading }: ItemFormDialogProps) {
  const [uom, setUom] = useState<string>("EA")
  const [zoneType, setZoneType] = useState<string>("A")
  const [manufacturerId, setManufacturerId] = useState<string>("none")
  const [supplierId, setSupplierId] = useState<string>("none")

  // Reset form state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setUom("EA")
      setZoneType("A")
      setManufacturerId("none")
      setSupplierId("none")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] top-[10%] translate-y-0">
        <DialogHeader>
          <DialogTitle>Register New Item</DialogTitle>
          <DialogDescription>
            Add a new SKU with comprehensive details. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <Tabs defaultValue="basic" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & UOM</TabsTrigger>
              <TabsTrigger value="settings">Settings & Details</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sku" className="text-right">SKU <span className="text-red-500">*</span></Label>
                <Input id="sku" name="sku" className="col-span-3" required placeholder="e.g. SKU-1001" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="upc" className="text-right">UPC / Barcode</Label>
                <Input id="upc" name="upc" className="col-span-3" placeholder="Leave blank to auto-generate" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name_en" className="text-right">Name (En) <span className="text-red-500">*</span></Label>
                <Input id="name_en" name="name_en" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name_kr" className="text-right">Name (Kr)</Label>
                <Input id="name_kr" name="name_kr" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Input id="category" name="category" className="col-span-3" placeholder="e.g. FOOD, ELECTRONICS" />
              </div>
            </TabsContent>

            {/* Pricing & UOM Tab */}
            <TabsContent value="pricing" className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="uom" className="text-right">UOM <span className="text-red-500">*</span></Label>
                <Select name="uom" value={uom} onValueChange={(v) => setUom(v || "EA")} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select UOM">
                      {uom === "EA" ? "EA (Each)" : uom === "PACK" ? "PACK" : uom === "BOX" ? "BOX" : "Select UOM"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EA">EA (Each)</SelectItem>
                    <SelectItem value="PACK">PACK</SelectItem>
                    <SelectItem value="BOX">BOX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="units_per_box" className="text-right text-sm">Units per Box</Label>
                <Input id="units_per_box" name="units_per_box" type="number" defaultValue="1" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit_price" className="text-right">Unit Price</Label>
                <Input id="unit_price" name="unit_price" type="number" step="0.01" defaultValue="0" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pack_price" className="text-right">Pack Price</Label>
                <Input id="pack_price" name="pack_price" type="number" step="0.01" defaultValue="0" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="box_price" className="text-right">Box Price</Label>
                <Input id="box_price" name="box_price" type="number" step="0.01" defaultValue="0" className="col-span-3" />
              </div>
            </TabsContent>

            {/* Settings & Details Tab */}
            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zone_type" className="text-right">Zone Type <span className="text-red-500">*</span></Label>
                <Select name="zone_type" value={zoneType} onValueChange={(v) => setZoneType(v || "A")} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Zone">
                      {zoneType === "A" ? "Ambient" : zoneType === "F" ? "Frozen" : zoneType === "R" ? "Cold" : "Select Zone"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Ambient</SelectItem>
                    <SelectItem value="F">Frozen</SelectItem>
                    <SelectItem value="R">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="min_stock_qty" className="text-right text-sm">Min Stock Qty</Label>
                <Input id="min_stock_qty" name="min_stock_qty" type="number" defaultValue="0" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item_volume" className="text-right">Volume (m³)</Label>
                <Input id="item_volume" name="item_volume" type="number" step="0.001" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shelf_life_days" className="text-right text-sm">Shelf Life (Days)</Label>
                <Input id="shelf_life_days" name="shelf_life_days" type="number" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="manufacturer_id" className="text-right text-sm">Manufacturer</Label>
                <Select name="manufacturer_id" value={manufacturerId} onValueChange={(v) => setManufacturerId(v || "none")}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Manufacturer">
                      {manufacturerId === "none" ? "None" : (partners.find(p => p.id === manufacturerId)?.name || "Select Manufacturer")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {partners.filter(p => p.type === 'MANUFACTURER' || p.type === 'BOTH').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supplier_id" className="text-right text-sm">Supplier</Label>
                <Select name="supplier_id" value={supplierId} onValueChange={(v) => setSupplierId(v || "none")}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Supplier">
                      {supplierId === "none" ? "None" : (partners.find(p => p.id === supplierId)?.name || "Select Supplier")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="note" className="text-right pt-2">Notes</Label>
                <Input id="note" name="note" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 pt-2">
                <div className="col-start-2 col-span-3 flex items-center space-x-2">
                  <Checkbox id="is_active" name="is_active" value="true" defaultChecked />
                  <Label htmlFor="is_active" className="cursor-pointer">Active (Available for picking)</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
