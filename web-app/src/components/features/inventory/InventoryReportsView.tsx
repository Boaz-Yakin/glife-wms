"use client"

import * as React from "react"
import {
  InventoryReportsData,
  ReorderItemReport,
  StockoutRiskReport,
  ExpiryReport,
  SurplusReport,
} from "@/services/reports.service"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Zap,
  Clock,
  Archive,
  Search,
  ShoppingCart,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUpDown,
} from "lucide-react"
import { exportToExcel, exportMultiSheetExcel } from "@/lib/export"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function InventoryReportsView({ data }: { data: InventoryReportsData }) {
  const [activeTab, setActiveTab] = React.useState<"reorder" | "stockout" | "expiry" | "surplus">("reorder")
  const [search, setSearch] = React.useState("")
  const [urgencyFilter, setUrgencyFilter] = React.useState("ALL")
  const [riskFilter, setRiskFilter] = React.useState("ALL")
  const [expiryFilter, setExpiryFilter] = React.useState("ALL")
  const [surplusFilter, setSurplusFilter] = React.useState("ALL")

  const { kpis, reorderItems, stockoutRiskItems, expiryItems, surplusItems } = data

  // Filtered lists
  const filteredReorders = React.useMemo(() => {
    return reorderItems.filter((item) => {
      const matchSearch =
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        item.locationCode.toLowerCase().includes(search.toLowerCase())
      const matchUrgency = urgencyFilter === "ALL" || item.urgency === urgencyFilter
      return matchSearch && matchUrgency
    })
  }, [reorderItems, search, urgencyFilter])

  const filteredStockoutRisks = React.useMemo(() => {
    return stockoutRiskItems.filter((item) => {
      const matchSearch =
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        item.locationCode.toLowerCase().includes(search.toLowerCase())
      const matchRisk = riskFilter === "ALL" || item.riskLevel === riskFilter
      return matchSearch && matchRisk
    })
  }, [stockoutRiskItems, search, riskFilter])

  const filteredExpiry = React.useMemo(() => {
    return expiryItems.filter((item) => {
      const matchSearch =
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        item.locationCode.toLowerCase().includes(search.toLowerCase()) ||
        item.lotNo.toLowerCase().includes(search.toLowerCase())
      const matchStatus = expiryFilter === "ALL" || item.status === expiryFilter
      return matchSearch && matchStatus
    })
  }, [expiryItems, search, expiryFilter])

  const filteredSurplus = React.useMemo(() => {
    return surplusItems.filter((item) => {
      const matchSearch =
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        item.locationCode.toLowerCase().includes(search.toLowerCase())
      const matchClass = surplusFilter === "ALL" || item.classification === surplusFilter
      return matchSearch && matchClass
    })
  }, [surplusItems, search, surplusFilter])

  // Single tab exports
  const handleExportCurrentTab = () => {
    if (activeTab === "reorder") {
      const rows = filteredReorders.map((r) => ({
        Urgency: r.urgency,
        SKU: r.sku,
        "Item Name": r.nameEn,
        Locations: r.locationCode,
        Available: r.available,
        "Safety Stock": r.safetyStock,
        "Reorder Point": r.reorderPoint,
        "Deficit Qty": r.deficitQty,
        "Recommended ROQ": r.recommendedRoq,
        "Daily Velocity (ADU)": r.dailyVelocity,
        "Lead Time (Days)": r.leadTimeDays,
      }))
      exportToExcel(rows, `Reorder_Suggestions_${new Date().toISOString().slice(0, 10)}`, "Reorder Suggestions")
      toast.success("Reorder Suggestions exported to Excel.")
    } else if (activeTab === "stockout") {
      const rows = filteredStockoutRisks.map((s) => ({
        "Risk Level": s.riskLevel,
        SKU: s.sku,
        "Item Name": s.nameEn,
        Locations: s.locationCode,
        Available: s.available,
        "Daily Velocity (ADU)": s.dailyVelocity,
        "Days of Supply (DOS)": s.daysOfSupply,
        "Lead Time (Days)": s.leadTimeDays,
      }))
      exportToExcel(rows, `Stockout_Risk_DOS_${new Date().toISOString().slice(0, 10)}`, "Stockout Risk")
      toast.success("Stockout Risk report exported to Excel.")
    } else if (activeTab === "expiry") {
      const rows = filteredExpiry.map((e) => ({
        Status: e.status,
        "Days Remaining": e.daysRemaining,
        "Exp. Date": e.expirationDate,
        "Lot No": e.lotNo,
        SKU: e.sku,
        "Item Name": e.nameEn,
        Location: e.locationCode,
        "On Hand Qty": e.onHandQty,
      }))
      exportToExcel(rows, `FEFO_Expiry_Alert_${new Date().toISOString().slice(0, 10)}`, "FEFO Expiry Alert")
      toast.success("FEFO Expiry Alert exported to Excel.")
    } else {
      const rows = filteredSurplus.map((s) => ({
        Classification: s.classification,
        SKU: s.sku,
        "Item Name": s.nameEn,
        Locations: s.locationCode,
        Available: s.available,
        "Daily Velocity (ADU)": s.dailyVelocity,
        "Surplus Threshold": s.surplusPoint,
      }))
      exportToExcel(rows, `Dead_Stock_and_Surplus_${new Date().toISOString().slice(0, 10)}`, "Overstock & Dead Stock")
      toast.success("Dead Stock & Surplus report exported to Excel.")
    }
  }

  // All 4 sheets export
  const handleExportFullPackage = () => {
    toast.promise(
      new Promise<void>((resolve) => {
        exportMultiSheetExcel(
          [
            {
              sheetName: "Reorder Suggestions",
              data: reorderItems.map((r) => ({
                Urgency: r.urgency,
                SKU: r.sku,
                "Item Name": r.nameEn,
                Locations: r.locationCode,
                Available: r.available,
                "Safety Stock": r.safetyStock,
                "Reorder Point": r.reorderPoint,
                "Deficit Qty": r.deficitQty,
                "Recommended ROQ": r.recommendedRoq,
                "Daily Velocity (ADU)": r.dailyVelocity,
                "Lead Time (Days)": r.leadTimeDays,
              })),
            },
            {
              sheetName: "Stockout Risk (DOS)",
              data: stockoutRiskItems.map((s) => ({
                "Risk Level": s.riskLevel,
                SKU: s.sku,
                "Item Name": s.nameEn,
                Locations: s.locationCode,
                Available: s.available,
                "Daily Velocity (ADU)": s.dailyVelocity,
                "Days of Supply (DOS)": s.daysOfSupply,
                "Lead Time (Days)": s.leadTimeDays,
              })),
            },
            {
              sheetName: "FEFO Expiry Matrix",
              data: expiryItems.map((e) => ({
                Status: e.status,
                "Days Remaining": e.daysRemaining,
                "Exp. Date": e.expirationDate,
                "Lot No": e.lotNo,
                SKU: e.sku,
                "Item Name": e.nameEn,
                Location: e.locationCode,
                "On Hand Qty": e.onHandQty,
              })),
            },
            {
              sheetName: "Dead Stock & Surplus",
              data: surplusItems.map((s) => ({
                Classification: s.classification,
                SKU: s.sku,
                "Item Name": s.nameEn,
                Locations: s.locationCode,
                Available: s.available,
                "Daily Velocity (ADU)": s.dailyVelocity,
                "Surplus Threshold": s.surplusPoint,
              })),
            },
          ],
          `Inventory_Reports_Full_Package_${new Date().toISOString().slice(0, 10)}`
        )
        resolve()
      }),
      {
        loading: "Compiling full analytics package...",
        success: "Executive 4-in-1 Report downloaded!",
        error: "Failed to compile Excel workbook",
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Global Export Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="size-6 text-primary" />
            Inventory Reports & Analytics Hub
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Statistical replenishment triggers, stockout forecast, FEFO expiry risks, and dormant inventory analysis.
          </p>
        </div>

        <Button
          onClick={handleExportFullPackage}
          className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer shadow-sm font-medium"
        >
          <FileSpreadsheet className="size-4" />
          <span>Export Full Package (.xlsx)</span>
        </Button>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Reorder Needed */}
        <Card
          onClick={() => setActiveTab("reorder")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border",
            activeTab === "reorder" ? "border-amber-500 bg-amber-500/5 shadow-xs" : "hover:border-amber-500/50"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reorder Needed</CardTitle>
            <ShoppingCart className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {kpis.reorderCount} <span className="text-xs font-normal text-muted-foreground">SKUs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-rose-600 dark:text-rose-400">{kpis.criticalReorderCount}</span> Critical / High priority
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Stockout Risk */}
        <Card
          onClick={() => setActiveTab("stockout")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border",
            activeTab === "stockout" ? "border-rose-500 bg-rose-500/5 shadow-xs" : "hover:border-rose-500/50"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stockout Risk (&le;14d)</CardTitle>
            <Zap className="size-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {kpis.stockoutRiskCount} <span className="text-xs font-normal text-muted-foreground">SKUs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-rose-600 dark:text-rose-400">{kpis.urgentStockoutCount}</span> Urgent (&le; 3 Days of Supply)
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Expiry Watch */}
        <Card
          onClick={() => setActiveTab("expiry")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border",
            activeTab === "expiry" ? "border-orange-500 bg-orange-500/5 shadow-xs" : "hover:border-orange-500/50"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FEFO Expiry Watch</CardTitle>
            <Calendar className="size-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-orange-600 dark:text-orange-400">
              {kpis.expiryWatchCount} <span className="text-xs font-normal text-muted-foreground">Lots</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.expiredCount > 0 ? (
                <span className="font-semibold text-rose-600">{kpis.expiredCount} Expired</span>
              ) : (
                "0 Expired"
              )}
              {", "}
              <span>{kpis.expiryWatchCount - kpis.expiredCount} within 90 days</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Dead Stock & Surplus */}
        <Card
          onClick={() => setActiveTab("surplus")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border",
            activeTab === "surplus" ? "border-sky-500 bg-sky-500/5 shadow-xs" : "hover:border-sky-500/50"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dead Stock & Surplus</CardTitle>
            <Archive className="size-4 text-sky-600 dark:text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
              {kpis.surplusCount} <span className="text-xs font-normal text-muted-foreground">SKUs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{kpis.deadStockCount}</span> Dead stock (0 sales in 30d)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex border-b border-border/80">
        <button
          onClick={() => { setActiveTab("reorder"); setSearch("") }}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer",
            activeTab === "reorder"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          )}
        >
          <ShoppingCart className="size-4" />
          Reorder Suggestions
          <Badge variant="secondary" className="text-xs ml-1 font-mono">
            {reorderItems.length}
          </Badge>
        </button>

        <button
          onClick={() => { setActiveTab("stockout"); setSearch("") }}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer",
            activeTab === "stockout"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          )}
        >
          <Zap className="size-4" />
          Stockout Risk & DOS
          <Badge variant="secondary" className="text-xs ml-1 font-mono">
            {stockoutRiskItems.length}
          </Badge>
        </button>

        <button
          onClick={() => { setActiveTab("expiry"); setSearch("") }}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer",
            activeTab === "expiry"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          )}
        >
          <Calendar className="size-4" />
          FEFO Expiry Alert
          <Badge variant="secondary" className="text-xs ml-1 font-mono">
            {expiryItems.length}
          </Badge>
        </button>

        <button
          onClick={() => { setActiveTab("surplus"); setSearch("") }}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all cursor-pointer",
            activeTab === "surplus"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          )}
        >
          <Archive className="size-4" />
          Dead Stock & Surplus
          <Badge variant="secondary" className="text-xs ml-1 font-mono">
            {surplusItems.length}
          </Badge>
        </button>
      </div>

      {/* Filter Toolbar & Tab Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU, Item Name, or Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>

          {/* Context Filter Dropdowns */}
          {activeTab === "reorder" && (
            <Select value={urgencyFilter} onValueChange={(val) => setUrgencyFilter(val || "ALL")}>
              <SelectTrigger className="w-[140px] h-9 bg-background">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Urgencies</SelectItem>
                <SelectItem value="CRITICAL">🔴 Critical (Stockout)</SelectItem>
                <SelectItem value="HIGH">🟠 High (&le; SS)</SelectItem>
                <SelectItem value="NORMAL">🟡 Normal (&le; ROP)</SelectItem>
              </SelectContent>
            </Select>
          )}

          {activeTab === "stockout" && (
            <Select value={riskFilter} onValueChange={(val) => setRiskFilter(val || "ALL")}>
              <SelectTrigger className="w-[140px] h-9 bg-background">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Risks</SelectItem>
                <SelectItem value="URGENT">🔴 Urgent (&le; 3d)</SelectItem>
                <SelectItem value="WARNING">🟠 Warning (&le; 7d)</SelectItem>
                <SelectItem value="WATCH">🟡 Watch (&le; 14d)</SelectItem>
              </SelectContent>
            </Select>
          )}

          {activeTab === "expiry" && (
            <Select value={expiryFilter} onValueChange={(val) => setExpiryFilter(val || "ALL")}>
              <SelectTrigger className="w-[140px] h-9 bg-background">
                <SelectValue placeholder="Expiry Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Expiries</SelectItem>
                <SelectItem value="EXPIRED">🔴 Expired</SelectItem>
                <SelectItem value="CRITICAL">🔴 Critical (&le; 14d)</SelectItem>
                <SelectItem value="WARNING">🟠 Warning (&le; 45d)</SelectItem>
                <SelectItem value="WATCH">🟡 Watch (&le; 90d)</SelectItem>
              </SelectContent>
            </Select>
          )}

          {activeTab === "surplus" && (
            <Select value={surplusFilter} onValueChange={(val) => setSurplusFilter(val || "ALL")}>
              <SelectTrigger className="w-[160px] h-9 bg-background">
                <SelectValue placeholder="Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="DEAD_STOCK">📦 Dead Stock (0 30d)</SelectItem>
                <SelectItem value="SURPLUS">🔵 Surplus (&ge; Cap)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleExportCurrentTab}
          className="shrink-0 bg-background gap-2 cursor-pointer font-medium border-border"
        >
          <Download className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>Export Tab Data (.xlsx)</span>
        </Button>
      </div>

      {/* Tab 1: Reorder Suggestions Table */}
      {activeTab === "reorder" && (
        <div className="rounded-md border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urgency</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Safety Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right font-bold text-amber-600 dark:text-amber-400">Deficit Qty</TableHead>
                <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Rec. ROQ</TableHead>
                <TableHead className="text-right">Daily ADU</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReorders.length ? (
                filteredReorders.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      {item.urgency === "CRITICAL" ? (
                        <Badge variant="destructive" className="bg-rose-600 text-white font-mono text-[11px]">
                          CRITICAL
                        </Badge>
                      ) : item.urgency === "HIGH" ? (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-mono text-[11px]">
                          HIGH
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-mono text-[11px]">
                          NORMAL
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate" title={item.nameEn}>
                      {item.nameEn}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{item.locationCode}</TableCell>
                    <TableCell className="text-right font-mono font-bold tabular-nums">
                      <span className={item.available <= 0 ? "text-rose-600" : ""}>{item.available}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{item.safetyStock}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">{item.reorderPoint}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      -{item.deficitQty}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{item.recommendedRoq}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{item.dailyVelocity}/d</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{item.leadTimeDays}d</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    No reorder items found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 2: Stockout Risk Table */}
      {activeTab === "stockout" && (
        <div className="rounded-md border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk Level</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead className="text-right">Available Qty</TableHead>
                <TableHead className="text-right">Daily Velocity (ADU)</TableHead>
                <TableHead className="text-right font-bold">Days of Supply (DOS)</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStockoutRisks.length ? (
                filteredStockoutRisks.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      {item.riskLevel === "URGENT" ? (
                        <Badge variant="destructive" className="bg-rose-600 text-white font-mono text-[11px] animate-pulse">
                          URGENT (&le;3d)
                        </Badge>
                      ) : item.riskLevel === "WARNING" ? (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-mono text-[11px]">
                          WARNING (&le;7d)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-mono text-[11px]">
                          WATCH (&le;14d)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-medium max-w-sm truncate" title={item.nameEn}>
                      {item.nameEn}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{item.locationCode}</TableCell>
                    <TableCell className="text-right font-mono font-bold tabular-nums">{item.available}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{item.dailyVelocity} / day</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      {item.daysOfSupply} Days
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{item.leadTimeDays}d</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No items currently under stockout risk (&le;14 days of supply).
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 3: FEFO & Expiry Alert Table */}
      {activeTab === "expiry" && (
        <div className="rounded-md border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status / D-Day</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">On Hand Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpiry.length ? (
                filteredExpiry.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.status === "EXPIRED" ? (
                        <Badge variant="destructive" className="bg-rose-700 text-white font-mono text-[11px] animate-pulse">
                          EXPIRED ({Math.abs(item.daysRemaining)}d ago)
                        </Badge>
                      ) : item.status === "CRITICAL" ? (
                        <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 font-mono text-[11px] font-bold">
                          D-{item.daysRemaining} (Critical)
                        </Badge>
                      ) : item.status === "WARNING" ? (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-mono text-[11px]">
                          D-{item.daysRemaining} (Warning)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-mono text-[11px]">
                          D-{item.daysRemaining} (Watch)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{item.expirationDate}</TableCell>
                    <TableCell className="font-mono text-xs">{item.lotNo}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-medium max-w-sm truncate" title={item.nameEn}>
                      {item.nameEn}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{item.locationCode}</TableCell>
                    <TableCell className="text-right font-mono font-bold tabular-nums">{item.onHandQty}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No expiring items within 90 days or expired lots found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 4: Dead Stock & Surplus Table */}
      {activeTab === "surplus" && (
        <div className="rounded-md border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classification</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead className="text-right">Available Qty</TableHead>
                <TableHead className="text-right">30-Day Velocity</TableHead>
                <TableHead className="text-right">Surplus Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSurplus.length ? (
                filteredSurplus.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      {item.classification === "DEAD_STOCK" ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-[11px]">
                          DEAD STOCK (0 Outbound)
                        </Badge>
                      ) : (
                        <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40 font-mono text-[11px]">
                          SURPLUS (&gt; Cap)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-medium max-w-sm truncate" title={item.nameEn}>
                      {item.nameEn}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{item.locationCode}</TableCell>
                    <TableCell className="text-right font-mono font-bold tabular-nums">{item.available}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{item.dailyVelocity} / day</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{item.surplusPoint}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No dead stock or surplus items detected.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
