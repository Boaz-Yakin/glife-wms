"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ScannerStatusBadge } from "@/components/features/inventory/scanner-status-badge";
import { LogOut, ArrowLeftRight } from "lucide-react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isManager, setIsManager] = useState(false);
  
  // Hide bottom tab bar on count page
  const isCountPage = pathname?.includes('/inventory/count');

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isManager) setIsManager(true);
      })
      .catch(() => {});
  }, []);

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
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      {/* Global Header */}
      <header className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight">INVENTORY</h1>
          {isManager && (
            <Link
              href="/mode"
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1 hover:bg-purple-500/20"
            >
              <ArrowLeftRight className="w-2.5 h-2.5" />
              <span>Mode</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ScannerStatusBadge />
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${isCountPage ? 'pb-0' : 'pb-[80px]'}`}>
        {children}
      </main>

      {/* Bottom Navigation Tabs */}
      {!isCountPage && (
        <nav className="fixed bottom-0 w-full h-[76px] bg-zinc-950 border-t border-zinc-800 flex items-center justify-around z-50">
          <Link href="/inventory" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-xl mb-0.5">🏠</span>
            <span className="text-[11px] font-medium">Home</span>
          </Link>
          <Link href="/inventory/lookup" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-xl mb-0.5">🔍</span>
            <span className="text-[11px] font-medium">Lookup</span>
          </Link>
          <Link href="/inventory/put-away" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-xl mb-0.5">📥</span>
            <span className="text-[11px] font-medium">Put-away</span>
          </Link>
          <Link href="/inventory/transfer" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-xl mb-0.5">🔄</span>
            <span className="text-[11px] font-medium">Transfer</span>
          </Link>
          <Link href="/inventory/queue" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-xl mb-0.5">📋</span>
            <span className="text-[11px] font-medium">Queue</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
