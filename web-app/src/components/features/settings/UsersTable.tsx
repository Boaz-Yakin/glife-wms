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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type UserData = {
  id: string
  email: string
  role: string
  last_sign_in_at: string
}

const columns: ColumnDef<UserData>[] = [
  {
    accessorKey: "email",
    header: "이메일(계정)",
    cell: ({ row }) => <div className="font-medium">{row.original.email}</div>,
  },
  {
    accessorKey: "role",
    header: "역할(Role)",
    cell: ({ row }) => {
      const role = row.original.role
      return (
        <Select defaultValue={role}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="역할 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">관리자 (ADMIN)</SelectItem>
            <SelectItem value="SUPERVISOR">감독자 (SUPERVISOR)</SelectItem>
            <SelectItem value="PICKER">피커 (PICKER)</SelectItem>
            <SelectItem value="INSPECTOR">검수자 (INSPECTOR)</SelectItem>
          </SelectContent>
        </Select>
      )
    }
  },
  {
    accessorKey: "last_sign_in_at",
    header: "최근 로그인",
    cell: ({ row }) => {
      const dateStr = row.original.last_sign_in_at
      if (!dateStr) return <span className="text-muted-foreground">-</span>
      return <div className="tabular-nums">{new Date(dateStr).toLocaleString('ko-KR')}</div>
    }
  },
  {
    id: "status",
    header: "계정 상태",
    cell: () => <Badge variant="default" className="bg-green-600">활성</Badge>,
  }
]

interface UsersTableProps {
  data: UserData[]
}

export function UsersTable({ data }: UsersTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
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
                  조회된 사용자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        총 {data.length} 명의 사용자
      </div>
    </div>
  )
}
