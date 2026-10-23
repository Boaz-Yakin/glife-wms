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
import { 
  Plus, 
  Loader2, 
  Download, 
  Upload, 
  MoreHorizontal, 
  Trash, 
  Edit2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from "lucide-react"

// Dialog components moved to ItemFormDialog
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ItemData } from "@/services/master.service"
import { getItemEffectivePrice } from "@/lib/pricing"
import { 
  createItemAction, 
  bulkCreateItemsAction, 
  deleteItemAction,
  getAllItemsForExportAction 
} from "@/app/(dashboard)/master/items/actions"
import { exportToExcel } from "@/lib/export"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { BulkImportDialog } from "./BulkImportDialog"
import { ItemFormDialog } from "./ItemFormDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

const ActionCell = ({ item, onEdit }: { item: ItemData, onEdit: (item: ItemData) => void }) => {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return
    setIsDeleting(true)
    const res = await deleteItemAction(item.id)
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
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Item
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 cursor-pointer">
            <Trash className="mr-2 h-4 w-4" />
            Delete Item
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const getColumns = (onEdit: (item: ItemData) => void): ColumnDef<ItemData>[] => [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <div className="font-medium">{row.original.sku}</div>,
  },
  {
    accessorKey: "name_en",
    header: "Item Name",
    cell: ({ row }) => {
      const name = row.original.name_en
      const desc = row.original.desc_en?.trim()
      return (
        <div className="font-medium">
          {name}
          {desc ? (
            <span className="text-muted-foreground ml-1 font-normal">({desc})</span>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "uom",
    header: "UOM",
  },
  {
    id: "price",
    accessorFn: (row) => getItemEffectivePrice(row),
    header: () => <div className="text-center">Price</div>,
    cell: ({ row }) => {
      const price = getItemEffectivePrice(row.original)
      return <div className="text-center tabular-nums">${price.toFixed(2)}</div>
    },
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
    cell: ({ row }) => <ActionCell item={row.original} onEdit={onEdit} />,
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
  currentPage?: number
  pageSize?: number
}

export function ItemsTable({ 
  data, 
  totalCount, 
  partners, 
  currentPage = 1, 
  pageSize = 50 
}: ItemsTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<ItemData | null>(null)
  
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  
  const defaultSearch = searchParams.get("search") || ""
  const [searchTerm, setSearchTerm] = React.useState(defaultSearch)
  
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchTerm) {
        params.set("search", searchTerm)
        params.delete("page") // Reset to page 1 on search
      } else {
        params.delete("search")
      }
      router.replace(`${pathname}?${params.toString()}`)
    }, 300)
    
    return () => clearTimeout(timeout)
  }, [searchTerm, pathname, router, searchParams])
  
  const handleEdit = (item: ItemData) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const table = useReactTable({
    data,
    columns: getColumns(handleEdit),
    getCoreRowModel: getCoreRowModel(),
  })

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    let result;
    if (editingItem) {
      formData.append("id", editingItem.id)
      result = await createItemAction(formData)
    } else {
      result = await createItemAction(formData)
    }
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(editingItem ? "Item successfully updated." : "Item successfully registered.")
      setIsDialogOpen(false)
      router.refresh()
    }
  }

  const handleBulkImport = async (items: any[]) => {
    const res = await bulkCreateItemsAction(items)
    router.refresh()
    return res
  }

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const allItems = await getAllItemsForExportAction()
      exportToExcel(allItems.length ? allItems : data, "Items_Master_Full_Report")
      toast.success(`Exported ${allItems.length || data.length} items to Excel.`)
    } catch (e: any) {
      exportToExcel(data, "Items_Master_Report")
    } finally {
      setExporting(false)
    }
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handlePageSizeChange = (newSize: string | null) => {
    if (!newSize) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("limit", newSize)
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const getVisiblePages = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }
    return pages
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input 
            placeholder="Search Item Name, SKU, or Description..." 
            className="max-w-sm bg-background" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportAll} 
            disabled={exporting}
            className="flex items-center gap-1.5"
            title="Download full Excel report with all items"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Items List
          </Button>

          <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>

          <Button onClick={() => {
            setEditingItem(null)
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Register New Item
          </Button>
        </div>
      </div>
      
      <ItemFormDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setTimeout(() => setEditingItem(null), 200)
        }}
        partners={partners}
        onSubmit={handleSubmit}
        loading={loading}
        initialData={editingItem}
      />
      
      <BulkImportDialog 
        open={isBulkDialogOpen} 
        onOpenChange={setIsBulkDialogOpen} 
        onImport={handleBulkImport} 
      />

      <div className="rounded-md border bg-background shadow-xs">
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
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center text-muted-foreground">
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Showing <strong className="font-semibold text-foreground">{startItem}</strong> to{" "}
            <strong className="font-semibold text-foreground">{endItem}</strong> of{" "}
            <strong className="font-semibold text-foreground">{totalCount}</strong> items
          </span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-[68px] text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
              title="First Page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-8 px-2 text-xs flex items-center gap-1"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>

            <div className="flex items-center gap-1 px-1">
              {getVisiblePages().map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(p as number)}
                    className={`h-8 w-8 p-0 text-xs ${p === currentPage ? "font-bold" : ""}`}
                  >
                    {p}
                  </Button>
                )
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="h-8 px-2 text-xs flex items-center gap-1"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Last Page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
