"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

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
import { Plus } from "lucide-react"

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

export type ItemData = {
  id: string
  sku: string
  name: string
  barcode: string
  created_at: string
}

const columns: ColumnDef<ItemData>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <div className="font-medium">{row.original.sku}</div>,
  },
  {
    accessorKey: "name",
    header: "상품명",
  },
  {
    accessorKey: "barcode",
    header: "바코드",
    cell: ({ row }) => <div className="font-mono text-muted-foreground">{row.original.barcode || '-'}</div>,
  },
  {
    accessorKey: "created_at",
    header: "등록일",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums">{date.toLocaleDateString('ko-KR')}</div>
    }
  },
]

interface ItemsTableProps {
  data: ItemData[]
  totalCount: number
}

export function ItemsTable({ data, totalCount }: ItemsTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>신규 상품 등록</DialogTitle>
              <DialogDescription>
                새로운 SKU를 마스터 데이터에 추가합니다.
              </DialogDescription>
            </DialogHeader>
            <form action={async (formData) => {
               // Client-side action dummy for UI visualization
               alert("준비 중인 기능입니다.")
               setIsDialogOpen(false)
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sku" className="text-right">SKU</Label>
                  <Input id="sku" name="sku" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">상품명</Label>
                  <Input id="name" name="name" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="barcode" className="text-right">바코드</Label>
                  <Input id="barcode" name="barcode" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">등록</Button>
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
