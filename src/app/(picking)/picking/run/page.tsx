"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Snowflake, Lock, PackageCheck,
  Loader2, CheckCircle2, XCircle, SkipForward, Undo2, Flag
} from "lucide-react";
import type { PickingItem } from "@/services/picking.service";
import { feedback as audioFeedback } from "@/lib/feedback";

// ──────────────────────────────────────────────
// Command barcode constants
// ──────────────────────────────────────────────
const CMD_SKIP = "CMD-SKIP";
const CMD_UNDO = "CMD-UNDO";
const CMD_DONE = "CMD-DONE";

// Scan state machine
type ScanState = "WAITING_LOCATION" | "WAITING_ITEM";
type ScanFeedback = "idle" | "location_ok" | "location_err" | "item_ok" | "item_err" | "skipped" | "undo";

function PickingRunInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const [items, setItems] = useState<PickingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scanState, setScanState] = useState<ScanState>("WAITING_LOCATION");
  const [feedback, setFeedback] = useState<ScanFeedback>("idle");
  const [isDone, setIsDone] = useState(false);

  // Barcode buffer refs (no re-render)
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef(0);

  // ──────────────────────────────────────────────
  // Always keep the hidden input focused
  // ──────────────────────────────────────────────
  useEffect(() => {
    const keepFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    // Focus immediately
    keepFocus();
    // Re-focus if something else takes focus (e.g., after click)
    document.addEventListener("click", keepFocus);
    return () => document.removeEventListener("click", keepFocus);
  }, [isLoading, isDone]);

  // ──────────────────────────────────────────────
  // Data fetch
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) { router.push("/picking"); return; }
    async function fetchItems() {
      try {
        const res = await fetch(`/api/picking/run?orderId=${orderId}`);
        const data = await res.json();
        if (data.success) setItems(data.items);
      } catch (err) {
        console.error("Failed to fetch picking items:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchItems();
  }, [orderId, router]);

  // ──────────────────────────────────────────────
  // Feedback flash helper
  // ──────────────────────────────────────────────
  const flashFeedback = useCallback((type: ScanFeedback, durationMs = 700) => {
    setFeedback(type);
    setTimeout(() => setFeedback("idle"), durationMs);
  }, []);

  // ──────────────────────────────────────────────
  // Core barcode processor
  // ──────────────────────────────────────────────
  const processBarcode = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // ── CMD-DONE ──
    if (trimmed === CMD_DONE) {
      setIsDone(true);
      return;
    }

    setItems(prev => {
      const currentItems = [...prev];
      const idx = currentIndex;

      // ── CMD-UNDO ──
      if (trimmed === CMD_UNDO) {
        if (idx > 0) {
          currentItems[idx - 1] = { ...currentItems[idx - 1], status: "PENDING" };
          setCurrentIndex(i => i - 1);
          setScanState("WAITING_LOCATION");
          flashFeedback("undo");
          audioFeedback.command();
        } else {
          audioFeedback.error();
        }
        return currentItems;
      }

      const target = currentItems[idx];
      if (!target) return currentItems;

      // ── CMD-SKIP ──
      if (trimmed === CMD_SKIP) {
        currentItems[idx] = { ...target, status: "SKIPPED" };
        fetch("/api/picking/skip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId: target.locations?.id || target.item_id,
            itemId: target.item_id,
            userId: "USR-TEST-1"
          })
        }).catch(console.error);

        const next = idx + 1;
        setCurrentIndex(next);
        setScanState("WAITING_LOCATION");
        flashFeedback("skipped");
        audioFeedback.command();

        if (next >= currentItems.length) setIsDone(true);
        return currentItems;
      }

      // ── Normal scan ──
      if (scanState === "WAITING_LOCATION") {
        if (trimmed === target.locations?.code) {
          flashFeedback("location_ok");
          setScanState("WAITING_ITEM");
          audioFeedback.match();        // 🔊 고음 비프 + 진동
        } else {
          flashFeedback("location_err");
          audioFeedback.error();        // 🔊 저음 버저 2회 + 긴 진동
        }
      } else if (scanState === "WAITING_ITEM") {
        if (trimmed === target.items?.upc || trimmed === target.items?.sku) {
          currentItems[idx] = { ...target, status: "PICKED" };
          flashFeedback("item_ok");
          audioFeedback.complete();     // 🔊 상승 완료음 + 패턴 진동

          const next = idx + 1;
          setCurrentIndex(next);
          setScanState("WAITING_LOCATION");

          if (next >= currentItems.length) setIsDone(true);
        } else {
          flashFeedback("item_err");
          audioFeedback.error();        // 🔊 저음 버저 2회 + 긴 진동
        }
      }

      return currentItems;
    });
  }, [currentIndex, scanState, flashFeedback]);

  // ──────────────────────────────────────────────
  // Handle input from the hidden scanner input field
  // ──────────────────────────────────────────────
  const handleScanKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const SCANNER_THRESHOLD_MS = 300;
    const now = Date.now();
    lastKeyTimeRef.current = now;

    if (e.key === "Enter") {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      (e.target as HTMLInputElement).value = "";
      if (value) processBarcode(value);
    }
  }, [processBarcode]);

  // ──────────────────────────────────────────────
  // Derived state
  // ──────────────────────────────────────────────
  const currentTarget = items[currentIndex];
  const isTargetCold = currentTarget?.locations?.zone === "F";
  const ambientPending = items.some(
    (item, idx) => item.locations?.zone === "A" && item.status !== "PICKED" && item.status !== "SKIPPED" && idx !== currentIndex
  );
  const isColdChainLocked = isTargetCold && ambientPending;

  // Feedback colours/icons
  const feedbackConfig = {
    idle: { bg: "", text: "", icon: null, label: "" },
    location_ok: { bg: "bg-emerald-500/20 border-emerald-500", text: "text-emerald-400", icon: <CheckCircle2 />, label: "Location Confirmed ✓" },
    location_err: { bg: "bg-rose-500/20 border-rose-500", text: "text-rose-400", icon: <XCircle />, label: "Wrong Location ✗" },
    item_ok: { bg: "bg-emerald-500/20 border-emerald-500", text: "text-emerald-400", icon: <CheckCircle2 />, label: "Item Picked ✓" },
    item_err: { bg: "bg-rose-500/20 border-rose-500", text: "text-rose-400", icon: <XCircle />, label: "Wrong Item ✗" },
    skipped: { bg: "bg-amber-500/20 border-amber-500", text: "text-amber-400", icon: <SkipForward />, label: "SKIPPED — Urgent queue created" },
    undo: { bg: "bg-blue-500/20 border-blue-500", text: "text-blue-400", icon: <Undo2 />, label: "UNDO — Reverted" },
  } as const;

  const fb = feedbackConfig[feedback];

  // ──────────────────────────────────────────────
  // Loading / Done states
  // ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-black text-white items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <h2 className="text-xl font-bold">Loading Route...</h2>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col h-full bg-black text-white items-center justify-center text-center px-8">
        <div className="w-28 h-28 bg-emerald-950 rounded-full flex items-center justify-center mb-6">
          <Flag className="w-14 h-14 text-emerald-400" />
        </div>
        <h2 className="text-4xl font-black mb-3">PICKING COMPLETE</h2>
        <p className="text-zinc-400 mb-10">All items have been processed.</p>
        <button
          onClick={() => router.push("/picking")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 py-4 rounded-xl text-xl transition-colors"
        >
          BACK TO DASHBOARD
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full bg-black text-white p-4 items-center justify-center text-zinc-500">
        No items found for this order.
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Main render
  // ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden">
      {/* ── HIDDEN SCANNER INPUT (always focused) ── */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 fixed top-0 left-0 w-0 h-0 pointer-events-none"
        aria-hidden="true"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onKeyDown={handleScanKeyDown}
        readOnly={false}
      />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-white">
            <ArrowLeft className="w-8 h-8" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-500">ORDER</span>
            <span className="text-sm font-mono truncate max-w-[120px]">{orderId}</span>
          </div>
        </div>
        {/* Scan state badge */}
        <div className={`px-4 py-2 rounded-full border font-bold text-sm ${
          scanState === "WAITING_LOCATION"
            ? "bg-amber-950/40 border-amber-800 text-amber-400"
            : "bg-emerald-950/40 border-emerald-800 text-emerald-400"
        }`}>
          {scanState === "WAITING_LOCATION" ? "📍 SCAN LOCATION" : "📦 SCAN ITEM"}
        </div>
        <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-700 flex items-center gap-2">
          <span className="font-bold text-emerald-400">{currentIndex + 1}</span>
          <span className="text-zinc-500 text-sm">/ {items.length}</span>
        </div>
      </div>

      {/* ── FEEDBACK FLASH BANNER ── */}
      {feedback !== "idle" && (
        <div className={`flex items-center gap-3 px-5 py-3 border-b-2 transition-all animate-in slide-in-from-top-2 duration-150 ${fb.bg}`}>
          <span className={`w-5 h-5 shrink-0 ${fb.text}`}>{fb.icon}</span>
          <span className={`font-black text-sm tracking-wide ${fb.text}`}>{fb.label}</span>
        </div>
      )}

      {/* ── MAIN TARGET VIEW ── */}
      <div className="flex-1 flex flex-col p-4 bg-black relative overflow-hidden">
        {isColdChainLocked ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-32 h-32 bg-blue-950 rounded-full flex items-center justify-center mb-6 relative">
              <Lock className="w-16 h-16 text-blue-400 absolute" />
              <Snowflake className="w-24 h-24 text-blue-500/20 absolute" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">COLD CHAIN LOCKED</h2>
            <p className="text-blue-400 font-bold text-center mb-8 px-4">
              Finish ambient zone (Zone A) first.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
            {/* Location card */}
            <div className={`p-6 rounded-2xl mb-4 border-2 flex flex-col items-center justify-center transition-colors ${
              scanState === "WAITING_ITEM"
                ? "bg-emerald-950/40 border-emerald-700"
                : isTargetCold
                  ? "bg-blue-950/30 border-blue-900/50"
                  : "bg-zinc-900 border-zinc-800"
            }`}>
              <div className="flex items-center gap-2 mb-2 text-zinc-400 font-bold tracking-widest text-sm">
                <MapPin className="w-4 h-4" />
                {scanState === "WAITING_ITEM" ? "✓ LOCATION CONFIRMED" : "SCAN LOCATION"}
              </div>
              <div className={`text-5xl sm:text-6xl font-black tracking-tighter ${
                scanState === "WAITING_ITEM"
                  ? "text-emerald-400"
                  : isTargetCold ? "text-blue-400" : "text-white"
              }`}>
                {currentTarget?.locations?.code || "NO-LOC"}
              </div>
              <div className="mt-3 flex gap-3 text-xs font-bold text-zinc-500">
                <span className="bg-black/50 px-3 py-1 rounded">ZONE {currentTarget?.locations?.zone}</span>
                <span className="bg-black/50 px-3 py-1 rounded">AISLE {currentTarget?.locations?.aisle}</span>
              </div>
            </div>

            {/* Item card */}
            <div className={`p-6 bg-zinc-900 rounded-2xl border flex-1 flex flex-col transition-colors ${
              scanState === "WAITING_ITEM" ? "border-emerald-700/50" : "border-zinc-800 opacity-60"
            }`}>
              <div className="text-zinc-500 font-bold mb-1 text-sm tracking-widest">
                {scanState === "WAITING_ITEM" ? "SCAN ITEM UPC" : "NEXT ITEM"}
              </div>
              <h3 className="text-2xl font-bold text-white leading-tight mb-1">
                {currentTarget?.items?.name}
              </h3>
              <p className="text-base text-zinc-400 font-mono mb-auto">
                UPC: {currentTarget?.items?.upc}
              </p>

              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-zinc-500 font-bold text-xs">QTY</span>
                  <span className="text-5xl font-black text-white">{currentTarget?.qty}</span>
                </div>
                <div className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center ${
                  scanState === "WAITING_ITEM"
                    ? "border-emerald-500/70 animate-pulse"
                    : "border-zinc-700 opacity-40"
                }`}>
                  <PackageCheck className={`w-7 h-7 mb-0.5 ${scanState === "WAITING_ITEM" ? "text-emerald-500" : "text-zinc-500"}`} />
                  <span className={`text-[9px] font-bold tracking-wider ${scanState === "WAITING_ITEM" ? "text-emerald-500" : "text-zinc-500"}`}>
                    SCAN
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── COMMAND HINTS ── */}
      <div className="flex gap-2 px-4 pb-3 shrink-0 text-[10px] font-bold text-zinc-600">
        <span className="bg-zinc-900 px-2 py-1 rounded">CMD-SKIP → 결품</span>
        <span className="bg-zinc-900 px-2 py-1 rounded">CMD-UNDO → 취소</span>
        <span className="bg-zinc-900 px-2 py-1 rounded">CMD-DONE → 마감</span>
      </div>

      {/* ── FOOTER PEEK LIST ── */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center overflow-x-auto px-4 gap-2 shrink-0 scrollbar-hide">
        {items.map((item, idx) => {
          const isCold = item.locations?.zone === "F";
          const isCurrent = idx === currentIndex;
          const isPicked = item.status === "PICKED";
          const isSkipped = item.status === "SKIPPED";

          return (
            <div
              key={item.id}
              className={`shrink-0 w-28 h-14 rounded-lg flex flex-col justify-center px-3 border transition-all ${
                isPicked
                  ? "bg-emerald-950/30 border-emerald-900 opacity-50"
                  : isSkipped
                    ? "bg-zinc-900 border-zinc-700 opacity-40"
                    : isCurrent
                      ? isCold
                        ? "bg-blue-900/40 border-blue-500"
                        : "bg-emerald-900/40 border-emerald-500"
                      : "bg-zinc-900 border-zinc-800 opacity-50"
              }`}
            >
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">
                {isPicked ? "✓" : isSkipped ? "SKIP" : `${idx + 1}.`} {item.locations?.code}
              </div>
              <div className="text-[11px] font-bold text-white truncate">
                {item.items?.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PickingRunPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full bg-black text-white items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold">Loading...</h2>
        </div>
      }
    >
      <PickingRunInner />
    </Suspense>
  );
}
