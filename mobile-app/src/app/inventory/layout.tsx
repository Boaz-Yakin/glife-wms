"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScannerStatusBadge } from "@/components/features/inventory/scanner-status-badge";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Hide bottom tab bar on count page
  const isCountPage = pathname?.includes('/inventory/count');

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      {/* Global Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-lg font-bold">Inventory (INSPECTOR)</h1>
        <ScannerStatusBadge />
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${isCountPage ? 'pb-0' : 'pb-[80px]'}`}>
        {children}
      </main>

      {/* Bottom Navigation Tabs */}
      {!isCountPage && (
        <nav className="fixed bottom-0 w-full h-[80px] bg-zinc-950 border-t border-zinc-800 flex items-center justify-around z-50">
          <Link href="/inventory" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/inventory/lookup" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-2xl mb-1">🔍</span>
            <span className="text-xs font-medium">Lookup</span>
          </Link>
          <Link href="/inventory/queue" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-2xl mb-1">📋</span>
            <span className="text-xs font-medium">Queue</span>
          </Link>
          <Link href="/inventory/transfer" className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-emerald-500 active:text-emerald-400">
            <span className="text-2xl mb-1">🔄</span>
            <span className="text-xs font-medium">Transfer</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
