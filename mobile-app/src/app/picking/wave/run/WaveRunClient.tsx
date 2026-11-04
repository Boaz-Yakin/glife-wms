"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Snowflake, Lock, PackageCheck,
  Loader2, CheckCircle2, XCircle, SkipForward, Undo2, Flag, Camera,
  Navigation, Zap, Layers, ShoppingBag
} from "lucide-react";
import { feedback as audioFeedback } from "@/lib/feedback";
import { CameraBarcodeScanner } from "@/components/features/camera-scanner";
import { useHardwareScanner } from "@/hooks/useHardwareScanner";
import { calculateNavGuide } from "@/lib/routing/tsp-picker";
import type { WaveConsolidatedPickItem } from "@/services/wave.service";

type ScanState = "WAITING_LOCATION" | "WAITING_ITEM" | "DISTRIBUTING_TOTES";
type ScanFeedback = "idle" | "location_ok" | "location_err" | "item_ok" | "item_err" | "tote_ok" | "tote_err" | "skipped";

function WaveRunInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const waveId = searchParams.get("waveId");

  const [wave, setWave] = useState<any>(null);
  const [items, setItems] = useState<WaveConsolidatedPickItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentToteIdx, setCurrentToteIdx] = useState(0);
  const [scanState, setScanState] = useState<ScanState>("WAITING_LOCATION");
  const [feedback, setFeedback] = useState<ScanFeedback>("idle");
  const [isDone, setIsDone] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Barcode buffer refs
  const inputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────────
  // Hardware scanner integration
  // ──────────────────────────────────────────────
  const { scannerType, triggerSoftScan } = useHardwareScanner({
    onScan: (parsed) => {
      processBarcode(parsed.raw);
    },
    onCommand: (cmd) => {
      processBarcode(cmd);
    },
    disabled: isDone || isCameraOpen,
  });

  // Always keep the hidden input focused
  useEffect(() => {
    const keepFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    keepFocus();
    document.addEventListener("click", keepFocus);
    return () => document.removeEventListener("click", keepFocus);
  }, [isLoading, isDone]);

  // ──────────────────────────────────────────────
  // Fetch Wave and Consolidated Items
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!waveId) {
      router.push("/picking");
      return;
    }
    async function fetchWaveData() {
      try {
        const res = await fetch(`/api/picking/wave?waveId=${waveId}`);
        const data = await res.json();
        if (data.success) {
          setWave(data.wave);
          setItems(data.items);
        }
      } catch (err) {
        console.error("Failed to load wave pick data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWaveData();
  }, [waveId, router]);

  const flashFeedback = useCallback((type: ScanFeedback, durationMs = 700) => {
    setFeedback(type);
    setTimeout(() => setFeedback("idle"), durationMs);
  }, []);

  const handleFinishWave = useCallback(async () => {
    setIsDone(true);
    audioFeedback.complete();
    if (waveId) {
      try {
        await fetch("/api/picking/wave/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waveId }),
        });
      } catch (err) {
        console.error("Failed to mark wave as completed:", err);
      }
    }
  }, [waveId]);

  // ──────────────────────────────────────────────
  // Core Barcode Processor (Wave & Pick-to-Tote)
  // ──────────────────────────────────────────────
  const processBarcode = useCallback((code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    if (trimmed === "CMD-DONE") {
      handleFinishWave();
      return;
    }

    setItems((prev) => {
      const currentItems = [...prev];
      const target = currentItems[currentIndex];
      if (!target) return currentItems;

      if (trimmed === "CMD-SKIP") {
        currentItems[currentIndex] = { ...target, status: "SKIPPED" };
        const next = currentIndex + 1;
        setCurrentIndex(next);
        setCurrentToteIdx(0);
        setScanState("WAITING_LOCATION");
        flashFeedback("skipped");
        audioFeedback.command();
        if (next >= currentItems.length) handleFinishWave();
        return currentItems;
      }

      // Step 1: Scan Location
      if (scanState === "WAITING_LOCATION") {
        const expectedLoc = target.locations?.code?.toUpperCase();
        if (trimmed === expectedLoc || trimmed === expectedLoc?.replace(/^LOC-/, "")) {
          flashFeedback("location_ok");
          setScanState("WAITING_ITEM");
          audioFeedback.match();
        } else {
          flashFeedback("location_err");
          audioFeedback.error();
        }
        return currentItems;
      }

      // Step 2: Scan Item
      if (scanState === "WAITING_ITEM") {
        const expectedSku = target.sku?.toUpperCase();
        const expectedUpc = target.upc?.toUpperCase();

        if (trimmed === expectedSku || trimmed === expectedUpc) {
          flashFeedback("item_ok");
          audioFeedback.match();
          // If this item has tote distributions, transition to tote distribution step
          if (target.tote_distributions && target.tote_distributions.length > 0) {
            setScanState("DISTRIBUTING_TOTES");
            setCurrentToteIdx(0);
          } else {
            // Direct advance
            currentItems[currentIndex] = { ...target, status: "PICKED" };
            const next = currentIndex + 1;
            setCurrentIndex(next);
            setScanState("WAITING_LOCATION");
            if (next >= currentItems.length) handleFinishWave();
          }
        } else {
          flashFeedback("item_err");
          audioFeedback.error();
        }
        return currentItems;
      }

      // Step 3: Scan / Confirm Tote Barcode (e.g. TOTE-01)
      if (scanState === "DISTRIBUTING_TOTES") {
        const dists = target.tote_distributions || [];
        const currentTote = dists[currentToteIdx];

        if (
          trimmed === currentTote?.tote_barcode?.toUpperCase() ||
          trimmed === `TOTE-${currentTote?.tote_no}` ||
          trimmed === String(currentTote?.tote_no)
        ) {
          flashFeedback("tote_ok");
          audioFeedback.complete();

          const nextTote = currentToteIdx + 1;
          if (nextTote < dists.length) {
            setCurrentToteIdx(nextTote);
          } else {
            // All totes for this consolidated item filled!
            currentItems[currentIndex] = { ...target, status: "PICKED" };
            const nextItem = currentIndex + 1;
            setCurrentIndex(nextItem);
            setCurrentToteIdx(0);
            setScanState("WAITING_LOCATION");

            if (nextItem >= currentItems.length) {
              handleFinishWave();
            }
          }
        } else {
          flashFeedback("tote_err");
          audioFeedback.error();
        }
        return currentItems;
      }

      return currentItems;
    });
  }, [currentIndex, currentToteIdx, scanState, flashFeedback, handleFinishWave]);

  const handleScanKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      (e.target as HTMLInputElement).value = "";
      if (value) processBarcode(value);
    }
  }, [processBarcode]);

  // Derived state
  const currentTarget = items[currentIndex];
  const prevTarget = currentIndex > 0 ? items[currentIndex - 1] : null;

  const navGuide = calculateNavGuide(
    prevTarget?.locations
      ? { x: prevTarget.locations.pos_x ?? 0, y: prevTarget.locations.pos_y ?? 0 }
      : { x: 0, y: 0 },
    currentTarget?.locations
      ? {
          x: currentTarget.locations.pos_x ?? 0,
          y: currentTarget.locations.pos_y ?? 0,
          code: currentTarget.locations.code,
        }
      : null
  );

  const currentToteDist = currentTarget?.tote_distributions?.[currentToteIdx];

  // Feedback config
  const feedbackConfig = {
    idle: { bg: "", text: "", icon: null, label: "" },
    location_ok: { bg: "bg-emerald-500/20 border-emerald-500", text: "text-emerald-400", icon: <CheckCircle2 />, label: "로케이션 확인 완료 ✓" },
    location_err: { bg: "bg-rose-500/20 border-rose-500", text: "text-rose-400", icon: <XCircle />, label: "잘못된 로케이션 ✗" },
    item_ok: { bg: "bg-emerald-500/20 border-emerald-500", text: "text-emerald-400", icon: <CheckCircle2 />, label: "품목 확인 ➔ 토트에 분배하세요" },
    item_err: { bg: "bg-rose-500/20 border-rose-500", text: "text-rose-400", icon: <XCircle />, label: "잘못된 품목 바코드 ✗" },
    tote_ok: { bg: "bg-blue-500/20 border-blue-500", text: "text-blue-400", icon: <CheckCircle2 />, label: "토트 분배 완료 ✓" },
    tote_err: { bg: "bg-rose-500/20 border-rose-500", text: "text-rose-400", icon: <XCircle />, label: "지정된 토트 바코드를 스캔하세요 ✗" },
    skipped: { bg: "bg-amber-500/20 border-amber-500", text: "text-amber-400", icon: <SkipForward />, label: "SKIPPED — 다음 품목으로 이동" },
  } as const;

  const fb = feedbackConfig[feedback];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-black text-white items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <h2 className="text-xl font-bold">웨이브 동선 최적화 중...</h2>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col h-full bg-black text-white items-center justify-center text-center px-8">
        <div className="w-28 h-28 bg-emerald-950 rounded-full flex items-center justify-center mb-6">
          <Flag className="w-14 h-14 text-emerald-400" />
        </div>
        <h2 className="text-4xl font-black mb-3">WAVE COMPLETED</h2>
        <p className="text-zinc-400 mb-2">{wave?.name || "파동 출고 작업"}</p>
        <p className="text-zinc-500 text-sm mb-10">총 {wave?.total_orders || 0}개 매장 오더가 카트 토트에 분류되었습니다.</p>
        <button
          onClick={() => router.push("/picking")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 py-4 rounded-xl text-xl transition-colors"
        >
          피킹 목록으로 복귀
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden">
      {/* Hidden input for scanner */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 fixed top-0 left-0 w-0 h-0 pointer-events-none"
        aria-hidden="true"
        onKeyDown={handleScanKeyDown}
      />

      {/* Camera scanner modal */}
      {isCameraOpen && (
        <CameraBarcodeScanner
          onValidate={(code) => {
            const trimmed = code.trim().toUpperCase();
            if (trimmed === "CMD-SKIP" || trimmed === "CMD-DONE") return true;
            if (scanState === "WAITING_LOCATION") {
              return trimmed === currentTarget?.locations?.code?.toUpperCase();
            }
            if (scanState === "WAITING_ITEM") {
              return trimmed === currentTarget?.upc?.toUpperCase() || trimmed === currentTarget?.sku?.toUpperCase();
            }
            if (scanState === "DISTRIBUTING_TOTES") {
              return trimmed === currentToteDist?.tote_barcode?.toUpperCase();
            }
            return false;
          }}
          onScan={(code) => {
            processBarcode(code);
            setIsCameraOpen(false);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3.5 bg-zinc-950 border-b border-zinc-800 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-white p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
              <Layers className="w-3 h-3" /> WAVE PICK
            </span>
            <span className="text-xs font-mono font-bold truncate max-w-[100px]">
              {wave?.wave_no || "WAVE"}
            </span>
          </div>
        </div>

        {/* Laser Soft Trigger */}
        <button
          onClick={() => triggerSoftScan()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 font-bold text-xs shadow-sm"
          title={`Laser Trigger (${scannerType})`}
        >
          <Zap className="w-3.5 h-3.5 fill-amber-400" />
          <span className="text-[11px]">{scannerType === "ZEBRA_DATAWEDGE" ? "Zebra" : "Laser"}</span>
        </button>

        {/* Camera */}
        <button
          onClick={() => setIsCameraOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="text-[11px]">Camera</span>
        </button>

        {/* Progress */}
        <div className="bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-700 text-xs">
          <span className="font-bold text-emerald-400">{currentIndex + 1}</span>
          <span className="text-zinc-500"> / {items.length}</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback !== "idle" && (
        <div className={`flex items-center gap-3 px-5 py-3 border-b-2 transition-all ${fb.bg}`}>
          <span className={`w-5 h-5 shrink-0 ${fb.text}`}>{fb.icon}</span>
          <span className={`font-black text-sm tracking-wide ${fb.text}`}>{fb.label}</span>
        </div>
      )}

      {/* Main View */}
      <div className="flex-1 flex flex-col p-4 bg-black overflow-hidden">
        {/* Navigation HUD Banner */}
        <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2 mb-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 text-base">
              {navGuide.arrowIcon}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-emerald-400" />
                <span className="text-xs font-bold text-white tracking-wide">
                  {navGuide.label}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                통합 최적 경로 (Wave TSP)
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-300 bg-black/60 px-2 py-0.5 rounded border border-zinc-800">
            {navGuide.distanceMeters}m
          </span>
        </div>

        {/* Location & Item View */}
        <div className="flex gap-3 mb-3">
          {/* Location box */}
          <div className={`flex-1 p-3.5 rounded-xl border flex flex-col justify-center ${
            scanState === "WAITING_LOCATION"
              ? "bg-amber-950/30 border-amber-600 animate-pulse"
              : "bg-zinc-900 border-zinc-800"
          }`}>
            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3" />
              {scanState === "WAITING_LOCATION" ? "SCAN LOCATION" : "LOCATION ✓"}
            </span>
            <span className={`text-xl font-black font-mono ${scanState === "WAITING_LOCATION" ? "text-amber-300" : "text-white"}`}>
              {currentTarget?.locations?.code || "NO-LOC"}
            </span>
          </div>

          {/* Consolidated QTY box */}
          <div className="w-28 p-3.5 rounded-xl border bg-zinc-900 border-zinc-800 flex flex-col justify-center items-center">
            <span className="text-[10px] font-bold text-zinc-400 mb-0.5">총 픽업수량</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {currentTarget?.total_qty || 0}
            </span>
          </div>
        </div>

        {/* Item Name card */}
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-3 flex items-center justify-between">
          <div className="flex flex-col truncate pr-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold">
              SKU: {currentTarget?.sku}
            </span>
            <span className="text-sm font-bold text-white truncate">
              {currentTarget?.name}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-zinc-500">
              UPC: {currentTarget?.upc}
            </span>
          </div>
        </div>

        {/* ── MULTI-ORDER PICK-TO-TOTE CART HUD ── */}
        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              카트 토트 분배 (Pick-to-Tote)
            </span>
            <span className="text-[10px] font-mono text-blue-400 font-bold">
              {scanState === "DISTRIBUTING_TOTES"
                ? `진행: ${currentToteIdx + 1} / ${currentTarget?.tote_distributions?.length || 1}`
                : "품목 스캔 대기"}
            </span>
          </div>

          {/* Totes Cart 4~8 Grid */}
          <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto">
            {(currentTarget?.tote_distributions || []).map((tote, idx) => {
              const isCurrent = scanState === "DISTRIBUTING_TOTES" && idx === currentToteIdx;
              const isFilled = idx < currentToteIdx || scanState === "WAITING_LOCATION";

              return (
                <button
                  key={tote.tote_no}
                  onClick={() => {
                    if (isCurrent) {
                      processBarcode(tote.tote_barcode);
                    }
                  }}
                  className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all relative ${
                    isCurrent
                      ? "bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-900/30 ring-2 ring-blue-500/50 animate-pulse"
                      : isFilled
                      ? "bg-emerald-950/20 border-emerald-800/40 opacity-70"
                      : "bg-zinc-900/60 border-zinc-800 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                      isCurrent ? "bg-blue-500 text-white" : isFilled ? "bg-emerald-900 text-emerald-300" : "bg-zinc-800 text-zinc-400"
                    }`}>
                      TOTE #{tote.tote_no}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {tote.tote_barcode}
                    </span>
                  </div>

                  <div className="my-1.5">
                    <span className="text-xs font-bold text-zinc-300 truncate block">
                      {tote.store_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                    <span className="text-[10px] text-zinc-400 font-medium">투입 수량</span>
                    <span className={`text-base font-black font-mono ${
                      isCurrent ? "text-blue-300 text-lg" : "text-white"
                    }`}>
                      +{tote.qty}개
                    </span>
                  </div>

                  {isCurrent && (
                    <div className="mt-1 text-center bg-blue-600 text-white text-[10px] font-black py-1 rounded">
                      여기에 담고 터치/스캔!
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer commands */}
      <div className="flex gap-2 px-4 py-2 bg-zinc-950 border-t border-zinc-800 shrink-0 text-[10px] font-bold text-zinc-500">
        <span className="bg-zinc-900 px-2 py-1 rounded">CMD-SKIP → 품목 건너뛰기</span>
        <span className="bg-zinc-900 px-2 py-1 rounded">CMD-DONE → 웨이브 종료</span>
      </div>
    </div>
  );
}

export default function WaveRunClient() {
  return (
    <Suspense fallback={<div className="h-full bg-black text-white p-4">Loading wave...</div>}>
      <WaveRunInner />
    </Suspense>
  );
}
