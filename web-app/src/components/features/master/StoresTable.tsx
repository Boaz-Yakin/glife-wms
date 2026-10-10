"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Phone,
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


import { StoreData } from "@/services/stores.service"
import {
  createStoreAction,
  updateStoreAction,
  toggleStoreStatusAction,
  deleteStoreAction,
} from "@/app/(dashboard)/master/stores/actions"
import { StoreFormDialog } from "./StoreFormDialog"
import { StoreDeleteDialog } from "./StoreDeleteDialog"

interface StoresTableProps {
  data: StoreData[]
  clients: Array<{ id: string; name: string; code: string }>
  activeClientId: string | null
}

export function StoresTable({ data, clients, activeClientId }: StoresTableProps) {
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all")
  const [selectedStore, setSelectedStore] = React.useState<StoreData | null>(null)

  const activeClientObj = clients.find((c) => c.id === activeClientId)

  const handleEdit = React.useCallback((store: StoreData) => {
    setSelectedStore(store)
    setFormDialogOpen(true)
  }, [])

  const handleDeletePrompt = React.useCallback((store: StoreData) => {
    setSelectedStore(store)
    setDeleteDialogOpen(true)
  }, [])

  const handleToggleStatus = React.useCallback(async (store: StoreData) => {
    setLoading(true)
    const nextStatus = !store.is_active
    const res = await toggleStoreStatusAction(store.id, nextStatus)
    setLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(
        `Store '${store.name}' has been ${nextStatus ? "activated" : "deactivated"}.`
      )
    }
  }, [])

  const columns = React.useMemo<ColumnDef<StoreData>[]>(() => [
    {
      accessorKey: "store_no",
      header: "Store Code",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-xs px-2 py-1 bg-muted rounded">
          {row.original.store_no}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Store Name",
      cell: ({ row }) => {
        const store = row.original
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{store.name}</span>
            {store.note && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[200px]" title={store.note}>
                  {store.note}
                </span>
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => {
        const client = row.original.client
        if (!client) return <span className="text-muted-foreground text-xs">-</span>
        return (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{client.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {client.code}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "contact",
      header: "Contact / Phone",
      cell: ({ row }) => {
        const { contact_person, phone } = row.original
        if (!contact_person && !phone) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        return (
          <div className="flex flex-col text-xs space-y-0.5">
            {contact_person && (
              <span className="flex items-center gap-1 text-foreground">
                <User className="h-3 w-3 text-muted-foreground" />
                {contact_person}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                <Phone className="h-3 w-3 text-muted-foreground" />
                {phone}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => {
        const address = row.original.address
        if (!address) return <span className="text-muted-foreground text-xs">-</span>
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[260px] truncate" title={address}>
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "orders_count",
      header: "Orders",
      cell: ({ row }) => {
        const count = row.original.orders_count ?? 0
        return (
          <Badge variant={count > 0 ? "secondary" : "outline"} className="tabular-nums font-mono text-xs">
            {count}
          </Badge>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const store = row.original
        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(store)}
            className="cursor-pointer group flex items-center gap-1"
            title="Click to toggle status"
          >
            {store.is_active ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Inactive
              </Badge>
            )}
          </button>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const store = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEdit(store)}
              title="Edit Store"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit Store</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeletePrompt(store)}
              title="Delete / Deactivate"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete Store</span>
            </Button>
          </div>
        )
      },
    },
  ], [handleEdit, handleDeletePrompt, handleToggleStatus])

  // Client-side filtering for fast interactive search & status filtering
  const filteredData = React.useMemo(() => {
    let result = data

    // 1. Status Filter
    if (statusFilter === "active") {
      result = result.filter((s) => s.is_active)
    } else if (statusFilter === "inactive") {
      result = result.filter((s) => !s.is_active)
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.store_no.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q)) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
          (s.client?.name && s.client.name.toLowerCase().includes(q))
      )
    }

    return result
  }, [data, statusFilter, searchQuery])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleFormSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = selectedStore
      ? await updateStoreAction(formData)
      : await createStoreAction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(
        `Store successfully ${selectedStore ? "updated" : "registered"}.`
      )
      setFormDialogOpen(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedStore) return
    setLoading(true)
    const res = await deleteStoreAction(selectedStore.id)
    setLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Store '${selectedStore.name}' successfully deleted.`)
      setDeleteDialogOpen(false)
    }
  }

  const handleDeactivateConfirm = async () => {
    if (!selectedStore) return
    setLoading(true)
    const res = await toggleStoreStatusAction(selectedStore.id, false)
    setLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Store '${selectedStore.name}' has been deactivated.`)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search store name, code, address..."
            className="w-full sm:w-72 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="w-36 bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          {activeClientObj && (
            <Badge variant="outline" className="px-2.5 py-1 text-xs bg-muted/50 hidden md:inline-flex">
              Filtered by: <span className="font-semibold ml-1">{activeClientObj.name}</span>
            </Badge>
          )}
        </div>

        <Button
          onClick={() => {
            setSelectedStore(null)
            setFormDialogOpen(true)
          }}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Store
        </Button>
      </div>

      {/* Forms & Dialogs */}
      <StoreFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSubmit={handleFormSubmit}
        loading={loading}
        store={selectedStore}
        clients={clients}
        activeClientId={activeClientId}
      />

      <StoreDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={handleDeleteConfirm}
        onDeactivate={handleDeactivateConfirm}
        loading={loading}
        store={selectedStore}
      />

      {/* Data Table */}
      <div className="rounded-md border bg-background shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={!row.original.is_active ? "opacity-60 bg-muted/20" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground"
                >
                  No stores found. Click &quot;Add Store&quot; to register a new store.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Showing {filteredData.length} of {data.length} stores
        </div>
        <div className="flex gap-3">
          <span>Active: {data.filter((s) => s.is_active).length}</span>
          <span>•</span>
          <span>Inactive: {data.filter((s) => !s.is_active).length}</span>
        </div>
      </div>
    </div>
  )
}
