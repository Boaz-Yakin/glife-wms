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

export type LocationData = {
  id: string
  barcode: string
  zone: string
  aisle: string
  section: string
  tier: string
}

const columns: ColumnDef<LocationData>[] = [
  {
    accessorKey: "barcode",
    header: "Location Barcode",
    cell: ({ row }) => <div className="font-bold">{row.original.barcode}</div>,
  },
  { accessorKey: "zone", header: "Zone" },
  { accessorKey: "aisle", header: "Aisle" },
  { accessorKey: "section", header: "Section" },
  { accessorKey: "tier", header: "Tier" },
]

interface LocationsTableProps {
  data: LocationData[]
}

export function LocationsTable({ data }: LocationsTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input placeholder="Search location barcode..." className="max-w-sm bg-background" />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Register New Location
        </Button>
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
                  No locations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        Total {data.length} locations
      </div>
    </div>
  )
}
