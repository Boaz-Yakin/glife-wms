"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void | Promise<void>
  isPending?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  variant = "default",
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !isPending && onOpenChange(val)}>
      <DialogContent className="sm:max-w-sm p-5 space-y-3">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            {variant === "destructive" ? (
              <AlertCircle className="size-4 text-destructive shrink-0" />
            ) : (
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            )}
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            disabled={isPending}
            onClick={async () => {
              await onConfirm()
            }}
            className="flex-1 sm:flex-none text-xs font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1" />
                처리 중...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
