"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Loader2, Play } from "lucide-react";
import type { Order } from "@/services/picking.service";

export default function PickingDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/picking/orders');
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error("Failed to fetch picking orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOrders();
    // In a real app, we would use Supabase Realtime to subscribe to new ALLOCATED orders
  }, []);

  const handleStartPicking = (orderId: string) => {
    // Navigate to the fullscreen picking runner
    router.push(`/picking/run?orderId=${orderId}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* PWA Header (Minimal) */}
      <div className="px-4 py-5 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">READY TO PICK</h1>
          <p className="text-sm text-zinc-400 font-medium mt-1">Select an order to start runner</p>
        </div>
        <div className="bg-zinc-900 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400 border border-zinc-800">
          {orders.length} PENDING
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto pb-safe">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading assigned orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-300 mb-2">No Active Orders</h2>
            <p className="text-zinc-500 text-sm">You are all caught up. New orders will appear here automatically.</p>
          </div>
        ) : (
          orders.map(order => (
            <Card 
              key={order.id} 
              className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer active:scale-[0.98]"
              onClick={() => handleStartPicking(order.id)}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-400">#{order.order_number}</span>
                    {order.priority === 'URGENT' && (
                      <Badge variant="destructive" className="bg-rose-600 text-[10px] px-1.5 h-5">URGENT</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">
                  {order.stores?.name || 'Unknown Store'}
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
        )}
      </div>
    </div>
  );
}
