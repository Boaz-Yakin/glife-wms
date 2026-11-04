"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Loader2, Play, LogOut, Layers, ShoppingBag } from "lucide-react";
import type { Order } from "@/services/picking.service";
import type { MobileWave } from "@/services/wave.service";

export default function PickingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"WAVE" | "SINGLE">("WAVE");
  const [orders, setOrders] = useState<Order[]>([]);
  const [waves, setWaves] = useState<MobileWave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, wavesRes] = await Promise.all([
          fetch("/api/picking/orders").then((r) => r.json()).catch(() => ({ success: false })),
          fetch("/api/picking/waves").then((r) => r.json()).catch(() => ({ success: false })),
        ]);

        if (ordersRes.success) setOrders(ordersRes.orders || []);
        if (wavesRes.success) setWaves(wavesRes.waves || []);
      } catch (err) {
        console.error("Failed to fetch picking data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isManager) setIsManager(true);
      })
      .catch(() => {});
  }, []);

  const handleStartPicking = (orderId: string) => {
    router.push(`/picking/run?orderId=${orderId}`);
  };

  const handleStartWavePicking = (waveId: string) => {
    router.push(`/picking/wave/run?waveId=${waveId}`);
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to log out?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      router.replace("/login");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* PWA Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white">PICKING RUNNER</h1>
            {isManager && (
              <button
                onClick={() => router.push("/mode")}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1 hover:bg-purple-500/20"
              >
                Mode
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            {activeTab === "WAVE" ? "파동 출고 (다중 카트 토트 분배)" : "개별 주문 단일 피킹"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-2 bg-zinc-900/60 border-b border-zinc-800 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("WAVE")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === "WAVE"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          WAVE PICK ({waves.length})
        </button>
        <button
          onClick={() => setActiveTab("SINGLE")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${
            activeTab === "SINGLE"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          SINGLE ORDERS ({orders.length})
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-safe">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>작업 목록 로딩 중...</p>
          </div>
        ) : activeTab === "WAVE" ? (
          /* Wave Batches List */
          waves.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-zinc-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-300 mb-2">진행 중인 파동(Wave)이 없습니다</h2>
              <p className="text-zinc-500 text-sm">웹 관리자 콘솔에서 신규 파동 출고를 생성하면 여기에 즉시 나타납니다.</p>
            </div>
          ) : (
            waves.map((wave) => (
              <Card
                key={wave.id}
                className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer active:scale-[0.98]"
                onClick={() => handleStartWavePicking(wave.id)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                        {wave.wave_no}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-zinc-800 border-zinc-700">
                        {wave.zone_type} ZONE
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(wave.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                    {wave.name}
                  </h3>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-lg mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">매장 오더</span>
                      <span className="text-sm font-black text-white font-mono">{wave.total_orders}건</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">피킹 품목</span>
                      <span className="text-sm font-black text-white font-mono">{wave.total_items}종</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">총 수량</span>
                      <span className="text-sm font-black text-blue-400 font-mono">{wave.total_qty}개</span>
                    </div>
                  </div>

                  {/* Totes Preview */}
                  {wave.totes && wave.totes.length > 0 && (
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 text-[10px] font-mono">
                      <ShoppingBag className="w-3.5 h-3.5 text-zinc-500 shrink-0 mr-1" />
                      {wave.totes.slice(0, 4).map((t) => (
                        <span key={t.tote_no} className="bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300 truncate max-w-[80px]">
                          T{t.tote_no}: {t.store_name}
                        </span>
                      ))}
                      {wave.totes.length > 4 && (
                        <span className="text-zinc-500">+{wave.totes.length - 4}</span>
                      )}
                    </div>
                  )}

                  <button
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartWavePicking(wave.id);
                    }}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    START PICK-TO-TOTE
                  </button>
                </CardContent>
              </Card>
            ))
          )
        ) : (
          /* Single Orders List */
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-zinc-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-300 mb-2">대기 중인 개별 주문이 없습니다</h2>
              <p className="text-zinc-500 text-sm">새로운 주문이 인입되면 여기에 자동으로 표시됩니다.</p>
            </div>
          ) : (
            orders.map((order) => (
              <Card
                key={order.id}
                className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer active:scale-[0.98]"
                onClick={() => handleStartPicking(order.id)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-400">#{order.order_number}</span>
                      {order.priority === "URGENT" && (
                        <Badge variant="destructive" className="bg-rose-600 text-[10px] px-1.5 h-5">
                          URGENT
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-4">
                    {order.stores?.name || "Unknown Store"}
                  </h3>

                  <button
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartPicking(order.id);
                    }}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    START PICKING
                  </button>
                </CardContent>
              </Card>
            ))
          )
        )}
      </div>
    </div>
  );
}
