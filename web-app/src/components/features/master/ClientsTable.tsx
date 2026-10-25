"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Power,
  Package,
  Store,
  ClipboardList,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Loader2,
  Radio,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ClientData } from "@/services/master.service"
import { ClientFormDialog } from "./ClientFormDialog"
import {
  createClientAction,
  updateClientAction,
  toggleClientStatusAction,
  deleteClientAction,
} from "@/app/(dashboard)/master/clients/actions"
import { setActiveClientAction } from "@/app/actions/client.actions"

interface ClientsTableProps {
  data: ClientData[]
  activeClientId: string | null
}

export function ClientsTable({ data, activeClientId }: ClientsTableProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState<ClientData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [actionId, setActionId] = React.useState<string | null>(null)

  const handleOpenCreate = () => {
    setEditingClient(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (client: ClientData) => {
    setEditingClient(client)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = editingClient
      ? await updateClientAction(formData)
      : await createClientAction(formData)

    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editingClient ? "Client updated successfully." : "New client registered successfully.")
      setIsDialogOpen(false)
      router.refresh()
    }
  }

  const handleToggleStatus = async (client: ClientData) => {
    setActionId(client.id)
    const res = await toggleClientStatusAction(client.id, client.is_active)
    setActionId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Client ${client.name} is now ${res.is_active ? 'ACTIVE' : 'INACTIVE'}.`)
      router.refresh()
    }
  }

  const handleDelete = async (client: ClientData) => {
    if (!confirm(`Are you sure you want to delete client "${client.name}"?\nThis cannot be undone.`)) {
      return
    }
    setActionId(client.id)
    const res = await deleteClientAction(client.id)
    setActionId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Client "${client.name}" deleted.`)
      router.refresh()
    }
  }

  const handleSelectActive = async (clientId: string) => {
    setActionId(clientId)
    await setActiveClientAction(clientId)
    setActionId(null)
    toast.success("Switched active warehouse tenant.")
    router.refresh()
  }

  const columns: ColumnDef<ClientData>[] = [
    {
      accessorKey: "name",
      header: "Client Name",
      cell: ({ row }) => {
        const isCurrent = row.original.id === activeClientId
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <span>{row.original.name}</span>
                {isCurrent && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-bold px-1.5 py-0">
                    Active Tenant
                  </Badge>
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground">{row.original.code}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "stats",
      header: "Warehouse Footprint",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground" title="Total Registered SKUs">
              <Package className="h-3.5 w-3.5 text-sky-600" />
              <span className="font-semibold text-foreground tabular-nums">{row.original.item_count ?? 0}</span>
              <span>SKUs</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1 text-muted-foreground" title="Active Delivery Stores">
              <Store className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-semibold text-foreground tabular-nums">{row.original.store_count ?? 0}</span>
              <span>Stores</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1 text-muted-foreground" title="Lifetime Orders">
              <ClipboardList className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold text-foreground tabular-nums">{row.original.order_count ?? 0}</span>
              <span>Orders</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.original.is_active
        return (
          <Badge
            variant={active ? "outline" : "secondary"}
            className={
              active
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium"
                : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 font-medium"
            }
          >
            {active ? (
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            ) : (
              <XCircle className="w-3 h-3 mr-1 text-zinc-500" />
            )}
            {active ? "Active" : "Inactive"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Onboarded",
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return <span className="text-xs text-muted-foreground tabular-nums">{date.toLocaleDateString('en-US')}</span>
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const client = row.original
        const isCurrent = client.id === activeClientId
        const isBusy = actionId === client.id

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBusy} />}>
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">Open menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Client Options</DropdownMenuLabel>
                {!isCurrent && client.is_active && (
                  <DropdownMenuItem onClick={() => handleSelectActive(client.id)} className="cursor-pointer">
                    <Radio className="mr-2 h-4 w-4 text-emerald-600" />
                    Switch to this Client
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleOpenEdit(client)} className="cursor-pointer">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(client)} className="cursor-pointer">
                  <Power className="mr-2 h-4 w-4" />
                  {client.is_active ? "Deactivate Client" : "Activate Client"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(client)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
            Total {data.length} Clients
          </Badge>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold text-xs">
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                  className={`hover:bg-muted/50 ${row.original.id === activeClientId ? "bg-primary/[0.03]" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                  No 3PL clients registered. Click &quot;Add Client&quot; to onboard your first partner.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <ClientFormDialog
        initialData={editingClient}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  )
}
