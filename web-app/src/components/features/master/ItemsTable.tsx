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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"

// Dialog components moved to ItemFormDialog
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemData } from "@/services/master.service"
import { createItemAction, bulkCreateItemsAction } from "@/app/(dashboard)/master/items/actions"
import { BulkImportDialog } from "./BulkImportDialog"
import { ItemFormDialog } from "./ItemFormDialog"
import { Upload, MoreHorizontal, Trash } from "lucide-react"
import { deleteItemAction } from "@/app/(dashboard)/master/items/actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ActionCell = ({ id }: { id: string }) => {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return
    setIsDeleting(true)
    const res = await deleteItemAction(id)
    setIsDeleting(false)
    if (res.error) toast.error(res.error)
    else toast.success("Item deleted successfully")
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted focus:outline-none">
        <span className="sr-only">Open menu</span>
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 cursor-pointer">
          <Trash className="mr-2 h-4 w-4" />
          Delete Item
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns: ColumnDef<ItemData>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <div className="font-medium">{row.original.sku}</div>,
  },
  {
    accessorKey: "name_en",
    header: "Item Name",
  },
  {
    accessorKey: "uom",
    header: "UOM",
  },
  {
    accessorKey: "unit_price",
    header: "Unit Price",
    cell: ({ row }) => <div className="text-right tabular-nums">${row.original.unit_price?.toFixed(2)}</div>,
  },
  {
    accessorKey: "zone_type",
    header: "Zone",
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
    cell: ({ row }) => <div className="text-muted-foreground">{row.original.manufacturer?.name || '-'}</div>,
  },
  {
    accessorKey: "created_at",
    header: "Registered Date",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums text-muted-foreground">{date.toLocaleDateString('ko-KR')}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell id={row.original.id} />,
  },
]

interface Partner {
  id: string
  name: string
}

interface ItemsTableProps {
  data: ItemData[]
  totalCount: number
  partners: Partner[]
}

export function ItemsTable({ data, totalCount, partners }: ItemsTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await createItemAction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Item successfully registered.")
      setIsDialogOpen(false)
    }
  }

  const handleBulkImport = async (items: any[]) => {
    return await bulkCreateItemsAction(items)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input placeholder="Search Item Name or SKU..." className="max-w-sm bg-background" />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>

          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register New Item
          </Button>
        </div>
      </div>
      
      <ItemFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        partners={partners}
        onSubmit={handleSubmit}
        loading={loading}
      />
      
      <BulkImportDialog 
        open={isBulkDialogOpen} 
        onOpenChange={setIsBulkDialogOpen} 
        onImport={handleBulkImport} 
      />

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        Total {totalCount} items
      </div>
    </div>
  )
}
