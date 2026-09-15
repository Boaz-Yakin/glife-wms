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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemData } from "@/services/master.service"
import { createItemAction } from "@/app/(dashboard)/master/items/actions"

const columns: ColumnDef<ItemData>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <div className="font-medium">{row.original.sku}</div>,
  },
  {
    accessorKey: "name_en",
    header: "상품명(EN)",
  },
  {
    accessorKey: "uom",
    header: "단위(UOM)",
  },
  {
    accessorKey: "unit_price",
    header: "단가",
    cell: ({ row }) => <div className="text-right tabular-nums">${row.original.unit_price?.toFixed(2)}</div>,
  },
  {
    accessorKey: "zone_type",
    header: "Zone",
  },
  {
    accessorKey: "manufacturer",
    header: "제조사",
    cell: ({ row }) => <div className="text-muted-foreground">{row.original.manufacturer?.name || '-'}</div>,
  },
  {
    accessorKey: "created_at",
    header: "등록일",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums text-muted-foreground">{date.toLocaleDateString('ko-KR')}</div>
    }
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
      toast.success("상품이 성공적으로 등록되었습니다.")
      setIsDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input placeholder="상품명 또는 SKU 검색..." className="max-w-sm bg-background" />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {/* @ts-ignore */}
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              신규 상품 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>신규 상품 등록</DialogTitle>
              <DialogDescription>
                새로운 SKU를 추가합니다. 최소 필수 항목만 우선 등록하세요.
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sku" className="text-right">SKU <span className="text-red-500">*</span></Label>
                  <Input id="sku" name="sku" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name_en" className="text-right">상품명 <span className="text-red-500">*</span></Label>
                  <Input id="name_en" name="name_en" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="uom" className="text-right">단위(UOM) <span className="text-red-500">*</span></Label>
                  <Select name="uom" defaultValue="EA" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="단위 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">EA (Each)</SelectItem>
                      <SelectItem value="BOX">BOX</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit_price" className="text-right">단가 <span className="text-red-500">*</span></Label>
                  <Input id="unit_price" name="unit_price" type="number" step="0.01" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="zone_type" className="text-right">보관 구역 <span className="text-red-500">*</span></Label>
                  <Select name="zone_type" defaultValue="A" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="구역 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">상온 (Ambient)</SelectItem>
                      <SelectItem value="F">냉동 (Frozen)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manufacturer_id" className="text-right text-sm">제조사 (선택)</Label>
                  <Select name="manufacturer_id">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="제조사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  등록 완료
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                  조회된 상품이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        총 {totalCount} 건의 상품
      </div>
    </div>
  )
}
