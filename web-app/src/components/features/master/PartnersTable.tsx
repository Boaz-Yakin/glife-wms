"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { Plus } from "lucide-react"

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

import { createPartnerAction } from "@/app/(dashboard)/master/partners/actions"
import { PartnerFormDialog } from "./PartnerFormDialog"

export interface PartnerData {
  id: string
  name: string
  type: "MANUFACTURER" | "SUPPLIER" | "BOTH"
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

const columns: ColumnDef<PartnerData>[] = [
  {
    accessorKey: "name",
    header: "Partner Name",
    cell: ({ row }) => <div className="font-semibold">{row.original.name}</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type
      let color = "bg-slate-100 text-slate-800"
      if (type === 'MANUFACTURER') color = "bg-blue-100 text-blue-800"
      if (type === 'SUPPLIER') color = "bg-emerald-100 text-emerald-800"
      
      return <Badge variant="secondary" className={color}>{type}</Badge>
    },
  },
  {
    accessorKey: "contact_person",
    header: "Contact Person",
    cell: ({ row }) => row.original.contact_person || "-",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone || "-",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "-",
  },
  {
    accessorKey: "created_at",
    header: "Registered Date",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <div className="tabular-nums text-muted-foreground">{date.toLocaleDateString('en-US')}</div>
    }
  },
]

interface PartnersTableProps {
  data: PartnerData[]
}

export function PartnersTable({ data }: PartnersTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data
    const lowerQuery = searchQuery.toLowerCase()
    return data.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.contact_person && p.contact_person.toLowerCase().includes(lowerQuery))
    )
  }, [data, searchQuery])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await createPartnerAction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Partner successfully registered.")
      setIsDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input 
            placeholder="Search Partner Name..." 
            className="max-w-sm bg-background" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <PartnerFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        loading={loading}
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
                  No partners found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        Total {filteredData.length} partners
      </div>
    </div>
  )
}
