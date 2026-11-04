"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  Tag,
  Building2,
  Package,
  Layers,
  ArrowUpDown,
  Search,
  Percent,
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

import { StoreItemPriceData, PriceTier } from "@/services/pricing.service"
import { upsertPricingAction, deletePricingAction } from "@/app/(dashboard)/master/pricing/actions"
import { PricingFormDialog } from "./PricingFormDialog"

interface PricingTableProps {
  data: StoreItemPriceData[]
  items: Array<{
    id: string
    name_en: string
    sku: string
    unit_price?: number | null
    box_price?: number | null
    pack_price?: number | null
  }>
  stores: Array<{ id: string; name: string; store_no: string; price_tier?: string }>
  clients: Array<{ id: string; name: string; code: string }>
  activeClientId: string | null
}

export function PricingTable({
  data,
  items,
  stores,
  clients,
  activeClientId,
}: PricingTableProps) {
  const router = useRouter()
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [tierFilter, setTierFilter] = React.useState<string>("all")
  const [scopeFilter, setScopeFilter] = React.useState<"all" | "tier" | "store">("all")
  const [selectedPricing, setSelectedPricing] = React.useState<StoreItemPriceData | null>(null)

  const handleEdit = React.useCallback((pricing: StoreItemPriceData) => {
    setSelectedPricing(pricing)
    setFormDialogOpen(true)
  }, [])

  const handleDelete = React.useCallback(async (id: string, itemName: string) => {
    if (!confirm(`'${itemName}' 품목의 특수 단가를 삭제하고 마스터 기본가로 복원하시겠습니까?`)) {
      return
    }

    setLoading(true)
    const res = await deletePricingAction(id)
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("특수 단가가 삭제되었습니다.")
      router.refresh()
    }
  }, [router])

  const handleFormSubmit = async (formData: FormData) => {
    setLoading(true)
    const res = await upsertPricingAction(formData)
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("특수 단가가 성공적으로 저장되었습니다.")
      setFormDialogOpen(false)
      setSelectedPricing(null)
      router.refresh()
    }
  }

  const columns = React.useMemo<ColumnDef<StoreItemPriceData>[]>(() => [
    {
      accessorKey: "scope",
      header: "적용 대상 (Scope)",
      cell: ({ row }) => {
        const item = row.original
        if (item.store) {
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-xs text-blue-400">
                  {item.store.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                [{item.store.store_no}] 매장 전용가
              </span>
            </div>
          )
        }

        const tier = item.price_tier || "STANDARD"
        const tierBadgeVariant =
          tier === "VIP"
            ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
            : tier === "WHOLESALE"
            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
            : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30"

        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-xs font-bold ${tierBadgeVariant}`}>
              {tier} 등급 전체
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "item",
      header: "품목 정보 (SKU / Name)",
      cell: ({ row }) => {
        const item = row.original.item
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-foreground">
              {item?.name_en || "알 수 없는 품목"}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              SKU: {item?.sku || "-"}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "uom",
      header: "단위 (UOM)",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {row.original.uom}
        </Badge>
      ),
    },
    {
      accessorKey: "master_base",
      header: "마스터 기본가",
      cell: ({ row }) => {
        const p = row.original
        let base = Number(p.item?.unit_price || 0)
        if (p.uom === "BOX") base = Number(p.item?.box_price || base)
        if (p.uom === "PACK") base = Number(p.item?.pack_price || base)
        return (
          <span className="font-mono text-xs text-muted-foreground">
            ₩{base.toLocaleString()}
          </span>
        )
      },
    },
    {
      accessorKey: "custom_price",
      header: "지정 공급 단가",
      cell: ({ row }) => {
        const price = Number(row.original.custom_price || 0)
        return (
          <span className="font-mono font-bold text-sm text-emerald-400">
            ₩{price.toLocaleString()}
          </span>
        )
      },
    },
    {
      accessorKey: "discount",
      header: "할인율 / 마진",
      cell: ({ row }) => {
        const p = row.original
        let base = Number(p.item?.unit_price || 0)
        if (p.uom === "BOX") base = Number(p.item?.box_price || base)
        if (p.uom === "PACK") base = Number(p.item?.pack_price || base)

        if (base <= 0) return <span className="text-muted-foreground text-xs">-</span>
        const diff = ((Number(p.custom_price) - base) / base) * 100
        const rounded = Math.round(diff * 10) / 10

        return (
          <span
            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
              rounded < 0
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : rounded > 0
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {rounded > 0 ? `+${rounded}%` : `${rounded}%`}
          </span>
        )
      },
    },
    {
      accessorKey: "note",
      header: "비고 / 메모",
      cell: ({ row }) => {
        const note = row.original.note
        if (!note) return <span className="text-muted-foreground text-xs">-</span>
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={note}>
            {note}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => handleEdit(p)}
              title="Edit Price"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/15"
              onClick={() => handleDelete(p.id, p.item?.name_en || p.id)}
              title="Delete and Restore Master Price"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete])

  // Filter Data
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase()
        const matchesSku = item.item?.sku?.toLowerCase().includes(s)
        const matchesName = item.item?.name_en?.toLowerCase().includes(s)
        const matchesStore = item.store?.name?.toLowerCase().includes(s) || item.store?.store_no?.toLowerCase().includes(s)
        if (!matchesSku && !matchesName && !matchesStore) return false
      }

      // 2. Scope Filter
      if (scopeFilter === "tier" && item.store_id) return false
      if (scopeFilter === "store" && !item.store_id) return false

      // 3. Tier Filter
      if (tierFilter !== "all" && item.price_tier !== tierFilter) return false

      return true
    })
  }, [data, searchQuery, scopeFilter, tierFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Action Header & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="품목명, SKU, 매장 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Scope Filter */}
          <Select value={scopeFilter} onValueChange={(val) => setScopeFilter(val as any)}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="적용 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 범위</SelectItem>
              <SelectItem value="tier">등급 전체</SelectItem>
              <SelectItem value="store">매장 개별</SelectItem>
            </SelectContent>
          </Select>

          {/* Tier Filter */}
          <Select value={tierFilter} onValueChange={(val) => setTierFilter(val || "all")}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="등급 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 등급</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="WHOLESALE">WHOLESALE</SelectItem>
              <SelectItem value="STANDARD">STANDARD</SelectItem>
              <SelectItem value="RETAIL">RETAIL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            setSelectedPricing(null)
            setFormDialogOpen(true)
          }}
          className="h-9 text-xs font-semibold gap-1.5"
        >
          <Plus className="h-4 w-4" />
          특수 단가 등록
        </Button>
      </div>

      {/* Pricing Data Table */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-xs text-muted-foreground">
                  등록된 특수 단가가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pricing Form Modal */}
      <PricingFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSubmit={handleFormSubmit}
        loading={loading}
        pricing={selectedPricing}
        items={items}
        stores={stores}
        clients={clients}
        activeClientId={activeClientId}
      />
    </div>
  )
}
