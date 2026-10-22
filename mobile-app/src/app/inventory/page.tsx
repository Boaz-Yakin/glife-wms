import { createClient } from "@/lib/supabase/server";
import { getInventorySummary } from "@/services/inventory.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UrgentQueueBanner } from "@/components/features/inventory/urgent-queue-banner";
import { MapPin, Package, CheckCircle2, Clock, ShieldAlert, PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function InventoryHomePage() {
  const supabase = await createClient();
  const summary = await getInventorySummary(supabase);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto">
      {/* Urgent Queue Banner */}
      <UrgentQueueBanner count={summary.urgentCount} />

      {/* Real-time Summary Cards */}
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-base font-bold text-white tracking-tight">Warehouse Real-time Summary</h2>
        <span className="text-[10px] text-zinc-500 font-mono">SUPABASE LIVE</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Urgent Task Card */}
        <Link href="/inventory/queue" className="block">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-rose-500/50 transition-colors">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                <span>Urgent Counts</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-black text-rose-400">{summary.urgentCount}</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Picking skip shortage</p>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Queue Card */}
        <Link href="/inventory/queue" className="block">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-colors">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                <span>Pending Queue</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-black text-amber-400">{summary.pendingCount}</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Awaiting inspection</p>
            </CardContent>
          </Card>
        </Link>

        {/* Adjustments Completed Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span>Adjustments</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-emerald-400">{summary.completedCount}</div>
            <p className="text-[10px] text-zinc-500 mt-0.5">Audited stock updates</p>
          </CardContent>
        </Card>

        {/* Warehouse Capacity Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span>Locations</span>
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-blue-400">{summary.totalLocations}</div>
            <p className="text-[10px] text-zinc-500 mt-0.5">{summary.totalItems} active SKUs</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Put-away CTA Banner */}
      <Link href="/inventory/put-away" className="block">
        <div className="bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 hover:border-emerald-500 rounded-xl p-3.5 flex items-center justify-between transition-all active:scale-[0.99] shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Put-away & Stock In</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">신규/초기적치</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                빈 랙 스캔 ➔ 상품 스캔 ➔ 초기 재고 즉시 등록
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      </Link>

      {/* Guidelines & Quick Action Info */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-2 mt-2">
        <div className="font-bold text-zinc-200 flex items-center gap-1.5">
          <span>⚡</span>
          <span>Field Operation Instructions</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 text-zinc-400">
          <li>Check <strong className="text-rose-400 font-semibold">Urgent queue</strong> first for items skipped during picking.</li>
          <li>Use <strong className="text-emerald-400 font-semibold">🔍 Lookup</strong> to scan rack Location QR codes or product UPCs.</li>
          <li>Tap <strong className="text-blue-400 font-semibold">Transfer</strong> to move inventory between bins atomically.</li>
        </ul>
      </div>
    </div>
  );
}
