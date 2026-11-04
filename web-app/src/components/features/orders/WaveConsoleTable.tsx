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
  Layers,
  CheckCircle2,
  Clock,
  Play,
  ShoppingBag,
  Check,
  Search,
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

import { PickingWave } from "@/services/wave.service"
import { OrderData } from "@/services/orders.service"
import { createWaveServerAction, completeWaveServerAction } from "@/app/(dashboard)/orders/waves/actions"
import { CreateWaveDialog } from "./CreateWaveDialog"

interface WaveConsoleTableProps {
  waves: PickingWave[]
  pendingOrders: OrderData[]
}

export function WaveConsoleTable({
  waves,
  pendingOrders,
}: WaveConsoleTableProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const handleCreateWaveSubmit = async (formData: FormData) => {
    setLoading(true)
    const res = await createWaveServerAction(formData)
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("파동 출고(Wave)가 성공적으로 생성되었습니다.")
      setDialogOpen(false)
      router.refresh()
    }
  }

  const handleCompleteWave = async (waveId: string, waveNo: string) => {
    if (!confirm(`'${waveNo}' 파동 출고를 완료 처리하시겠습니까? 포함된 모든 주문이 출고 완료(PACKED)로 전이됩니다.`)) {
      return
    }

    setLoading(true)
    const res = await completeWaveServerAction(waveId)
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`'${waveNo}' 파동 출고가 완료되었습니다.`)
      router.refresh()
    }
  }

  const columns = React.useMemo<ColumnDef<PickingWave>[]>(() => [
    {
      accessorKey: "wave_no",
      header: "웨이브 번호",
      cell: ({ row }) => {
        const w = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono font-bold text-xs text-blue-400">
              {w.wave_no}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "name",
      header: "웨이브 명칭 / 대상 가맹점",
      cell: ({ row }) => {
        const w = row.original
        const stores = (w.wave_orders || []).map(wo => wo.order?.store?.name).filter(Boolean)
        return (
          <div className="flex flex-col gap-1 max-w-[280px]">
            <span className="font-semibold text-xs text-foreground truncate" title={w.name}>
              {w.name}
            </span>
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-muted-foreground">
              <ShoppingBag className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate">
                {stores.length > 0 ? stores.join(", ") : `${w.total_orders}개 주문 할당`}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => {
        const status = row.original.status
        const badgeConfig = {
          CREATED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
          RELEASED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          PICKING: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
          COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          CANCELLED: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        }[status] || "bg-zinc-500/15 text-zinc-400"

        return (
          <Badge variant="outline" className={`text-[10px] font-bold ${badgeConfig}`}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "zone_type",
      header: "구역 (Zone)",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px] font-mono">
          {row.original.zone_type}
        </Badge>
      ),
    },
    {
      accessorKey: "total_orders",
      header: "주문 수",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {row.original.total_orders}개 매장
        </span>
      ),
    },
    {
      accessorKey: "progress",
      header: "피킹 진행률",
      cell: ({ row }) => {
        const w = row.original
        const total = w.total_qty || 0
        const picked = w.picked_qty || 0
        const ratio = total > 0 ? Math.min(100, Math.round((picked / total) * 100)) : 0

        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted-foreground">{picked} / {total}개</span>
              <span className="font-bold text-foreground">{ratio}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  w.status === "COMPLETED" ? "bg-emerald-500" : "bg-blue-500"
                }`}
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">관리</div>,
      cell: ({ row }) => {
        const w = row.original
        const isCompleted = w.status === "COMPLETED"

        return (
          <div className="flex items-center justify-end gap-1">
            {!isCompleted ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => handleCompleteWave(w.id, w.wave_no)}
              >
                <Check className="w-3.5 h-3.5" />
                완료 처리
              </Button>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                ✓ 출고 완료
              </Badge>
            )}
          </div>
        )
      },
    },
  ], [handleCompleteWave])

  const filteredWaves = React.useMemo(() => {
    return waves.filter((w) => {
      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase()
        const matchesNo = w.wave_no.toLowerCase().includes(s)
        const matchesName = w.name.toLowerCase().includes(s)
        if (!matchesNo && !matchesName) return false
      }
      if (statusFilter !== "all" && w.status !== statusFilter) return false
      return true
    })
  }, [waves, searchQuery, statusFilter])

  const table = useReactTable({
    data: filteredWaves,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="웨이브 번호, 명칭 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="RELEASED">RELEASED (배포)</SelectItem>
              <SelectItem value="PICKING">PICKING (진행중)</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED (완료)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="h-9 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          신규 파동 출고(Wave) 생성
        </Button>
      </div>

      {/* Table */}
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
                  생성된 파동 출고(Wave) 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <CreateWaveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateWaveSubmit}
        loading={loading}
        pendingOrders={pendingOrders}
      />
    </div>
  )
}
