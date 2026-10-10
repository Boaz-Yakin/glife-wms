"use client"

import * as React from "react"
import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StoreData } from "@/services/stores.service"

export interface StoreFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
  store?: StoreData | null
  clients: Array<{ id: string; name: string; code: string }>
  activeClientId: string | null
}

export function StoreFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  store,
  clients,
  activeClientId,
}: StoreFormDialogProps) {
  const [phone, setPhone] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [isActive, setIsActive] = useState<boolean>(true)

  useEffect(() => {
    if (open) {
      if (store) {
        setPhone(store.phone || "")
        setSelectedClientId(store.client_id)
        setIsActive(store.is_active)
      } else {
        setPhone("")
        // Default to activeClientId if exists, else first client
        setSelectedClientId(activeClientId || clients[0]?.id || "")
        setIsActive(true)
      }
    }
  }, [open, store, activeClientId, clients])

  const formatPhoneNumber = (value: string) => {
    if (!value) return value
    const phoneNumber = value.replace(/[^\d]/g, "")
    const phoneNumberLength = phoneNumber.length
    if (phoneNumberLength < 4) return phoneNumber
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{store ? "Edit Store" : "Register New Store"}</DialogTitle>
          <DialogDescription>
            {store
              ? "Update store information and contact details."
              : "Register a new branch or retail store for a client."}{" "}
            Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          {store && <input type="hidden" name="id" value={store.id} />}
          <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />

          <div className="space-y-4 py-2">
            {/* Client Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="client_id">
                Client (화주사) <span className="text-destructive">*</span>
              </Label>
              <Select
                name="client_id"
                value={selectedClientId}
                onValueChange={(val) => setSelectedClientId(val || "")}
                required
              >
                <SelectTrigger id="client_id" className="w-full">
                  <span className="flex-1 text-left truncate">
                    {clients.find((c) => c.id === selectedClientId)
                      ? `${clients.find((c) => c.id === selectedClientId)?.name} (${clients.find((c) => c.id === selectedClientId)?.code})`
                      : "Select client"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Store No & Store Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="store_no">
                  Store Code / No <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="store_no"
                  name="store_no"
                  required
                  placeholder="e.g. ST-001 or 101"
                  defaultValue={store?.store_no || ""}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Store Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Downtown Branch"
                  defaultValue={store?.name || ""}
                />
              </div>
            </div>

            {/* Contact Person & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  placeholder="Manager / PIC"
                  defaultValue={store?.contact_person || ""}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={14}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Delivery Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Full delivery / store address"
                defaultValue={store?.address || ""}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="note">Delivery Note / Memo</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Access instructions, preferred delivery hours, etc."
                rows={2}
                defaultValue={store?.note || ""}
              />
            </div>

            {/* Active Status Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_active_checkbox"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="is_active_checkbox" className="font-normal cursor-pointer">
                Store is currently <span className="font-semibold">{isActive ? "Active (활성)" : "Inactive (비활성)"}</span>
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {store ? "Update Store" : "Register Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
