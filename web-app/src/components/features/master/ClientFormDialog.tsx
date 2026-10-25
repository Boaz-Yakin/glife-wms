"use client"

import * as React from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import type { ClientData } from "@/services/master.service"

interface ClientFormDialogProps {
  initialData?: ClientData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
}

export function ClientFormDialog({
  initialData,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: ClientFormDialogProps) {
  const [code, setCode] = React.useState("")
  const [name, setName] = React.useState("")

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name)
        setCode(initialData.code)
      } else {
        setName("")
        setCode("")
      }
    }
  }, [open, initialData])

  // Auto-slug code when creating new client
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!initialData) {
      const slug = val
        .trim()
        .replace(/[^A-Za-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .toUpperCase()
      setCode(slug ? `CLIENT-${slug}` : "")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit 3PL Client" : "Register New 3PL Client"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Modify the client company name and operational code."
              : "Enter details for the new 3PL tenant company. Products, inventory, and stores will be isolated under this client."}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4 py-2">
          {initialData && <input type="hidden" name="id" value={initialData.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. bb.q Chicken USA"
              value={name}
              onChange={handleNameChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">
              Client Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              name="code"
              required
              placeholder="e.g. CLIENT-BBQ"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Unique identifier used in system logs, tenant routing, and API integrations.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="is_active"
              name="is_active"
              value="true"
              defaultChecked={initialData ? initialData.is_active : true}
            />
            <Label htmlFor="is_active" className="cursor-pointer font-normal text-sm">
              Active Client (Enable warehouse picking & store ordering)
            </Label>
          </div>

          <DialogFooter className="pt-4">
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
              {initialData ? "Update Client" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
