"use client"

import * as React from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StoreData } from "@/services/stores.service"

export interface StoreDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => Promise<void>
  onDeactivate: () => Promise<void>
  loading: boolean
  store: StoreData | null
}

export function StoreDeleteDialog({
  open,
  onOpenChange,
  onDelete,
  onDeactivate,
  loading,
  store,
}: StoreDeleteDialogProps) {
  if (!store) return null

  const hasOrders = (store.orders_count ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>
              {hasOrders ? "Cannot Delete Store" : "Delete Store"}
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-foreground/80 leading-relaxed">
            {hasOrders ? (
              <span>
                Store <strong>{store.name}</strong> ({store.store_no}) has{" "}
                <span className="font-semibold text-destructive">
                  {store.orders_count} linked order(s)
                </span>
                . Deleting this store would break order history integrity.
                <br /><br />
                We strongly recommend <strong>deactivating</strong> the store instead so it cannot be selected for new orders.
              </span>
            ) : (
              <span>
                Are you sure you want to permanently delete store{" "}
                <strong>{store.name}</strong> ({store.store_no})? This action cannot be undone.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          {hasOrders ? (
            <Button
              type="button"
              variant="default"
              onClick={onDeactivate}
              disabled={loading || !store.is_active}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {store.is_active ? "Deactivate Store" : "Already Inactive"}
            </Button>
          ) : (
            <div className="flex gap-2">
              {store.is_active && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDeactivate}
                  disabled={loading}
                >
                  Deactivate Instead
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Permanently
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
