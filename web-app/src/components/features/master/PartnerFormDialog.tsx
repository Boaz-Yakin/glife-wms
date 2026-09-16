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

export interface PartnerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
}

export function PartnerFormDialog({ open, onOpenChange, onSubmit, loading }: PartnerFormDialogProps) {
  const [phone, setPhone] = useState("")

  React.useEffect(() => {
    if (!open) setPhone("")
  }, [open])

  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] top-[10%] translate-y-0">
        <DialogHeader>
          <DialogTitle>Register New Partner</DialogTitle>
          <DialogDescription>
            Add a new manufacturer or supplier. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <div className="grid gap-4 py-4 mt-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Partner Name <span className="text-red-500">*</span></Label>
              <Input id="name" name="name" className="col-span-3" required placeholder="e.g. Nongshim" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type <span className="text-red-500">*</span></Label>
              <Select name="type" defaultValue="BOTH" required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact_person" className="text-right">Contact Person</Label>
              <Input id="contact_person" name="contact_person" className="col-span-3" placeholder="Manager Name" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input 
                id="phone" 
                name="phone" 
                className="col-span-3" 
                placeholder="e.g. (555) 123-4567" 
                value={phone}
                onChange={handlePhoneChange}
                maxLength={14}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" className="col-span-3" placeholder="contact@partner.com" />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="address" className="text-right pt-2">Address</Label>
              <Input id="address" name="address" className="col-span-3" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Partner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
