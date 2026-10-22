"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Boxes, ShieldCheck, LogOut } from "lucide-react";

export default function ModeSelectPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
      router.replace("/login");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 max-w-md mx-auto">
      <div className="pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Manager Mode</h1>
              <p className="text-xs text-zinc-400">Select operational workspace</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Logout
          </Button>
        </div>

        <div className="space-y-4">
          {/* Option 1: Picking */}
          <Link href="/picking" className="block group">
            <div className="bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Picking Runner</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No-click full screen barcode picker with S-shape routing and cold chain gates.
              </p>
              <div className="mt-4 inline-flex items-center text-xs font-bold text-blue-400">
                Launch Picking →
              </div>
            </div>
          </Link>

          {/* Option 2: Inventory & Inspection */}
          <Link href="/inventory" className="block group">
            <div className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Boxes className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Inventory & Inspection</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Location/SKU barcode lookup, cycle counting, stock adjustments, and bin transfers.
              </p>
              <div className="mt-4 inline-flex items-center text-xs font-bold text-emerald-400">
                Launch Inventory →
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="py-6 text-center text-xs text-zinc-600">
        WMS Field Platform • Glife Operations
      </div>
    </div>
  );
}
