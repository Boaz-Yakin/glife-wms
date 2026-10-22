"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineNumberPad } from "@/components/features/inventory/inline-number-pad";
import { ReasonCodeSelector, ReasonCode } from "@/components/features/inventory/reason-code-selector";
import { feedback } from "@/lib/feedback";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldAlert, Loader2, MapPin, Package } from "lucide-react";
import Link from "next/link";

function CountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loadingItem, setLoadingItem] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real inventory item state
  const [item, setItem] = useState<{
    inventoryId: string;
    locationCode: string;
    sku: string;
    name: string;
    upc?: string;
    expectedQty: number;
    allocatedQty: number;
    requestId?: string;
  } | null>(null);

  const [actualQty, setActualQty] = useState(0);
  const [reason, setReason] = useState<ReasonCode | null>(null);

  useEffect(() => {
    async function loadItem() {
      setLoadingItem(true);
      setErrorMessage(null);

      const invId = searchParams.get("invId");
      const locCode = searchParams.get("locCode");
      const sku = searchParams.get("sku");
      const name = searchParams.get("name");
      const expected = searchParams.get("expected");
      const reqId = searchParams.get("reqId") || undefined;
      const locId = searchParams.get("locId");
      const itemId = searchParams.get("itemId");

      // 1. If passed directly via query params from Lookup
      if (invId && locCode && sku) {
        const exp = parseInt(expected || "0", 10);
        setItem({
          inventoryId: invId,
          locationCode: locCode,
          sku,
          name: name ? decodeURIComponent(name) : sku,
          expectedQty: exp,
          allocatedQty: 0,
          requestId: reqId,
        });
        setActualQty(exp);
        setLoadingItem(false);
        return;
      }

      // 2. If locId or itemId is passed without invId, resolve via Lookup API
      if (locId || itemId) {
        try {
          const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(locId || itemId || "")}`);
          const data = await res.json();
          if (data.success) {
            if (data.type === "LOCATION" && data.data.items?.length > 0) {
              const target = data.data.items[0];
              setItem({
                inventoryId: target.inventoryId,
                locationCode: data.data.location.code,
                sku: target.sku,
                name: target.name,
                expectedQty: target.onHandQty,
                allocatedQty: target.allocatedQty,
                requestId: reqId,
              });
              setActualQty(target.onHandQty);
              setLoadingItem(false);
              return;
            } else if (data.type === "ITEM" && data.data.locations?.length > 0) {
              const target = data.data.locations[0];
              setItem({
                inventoryId: target.inventoryId,
                locationCode: target.code,
                sku: data.data.item.sku,
                name: data.data.item.name,
                expectedQty: target.onHandQty,
                allocatedQty: target.allocatedQty,
                requestId: reqId,
              });
              setActualQty(target.onHandQty);
              setLoadingItem(false);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Fallback: check pending queue
      try {
        const queueRes = await fetch("/api/inventory/queue");
        const queueData = await queueRes.json();
        if (queueData.success && queueData.queue?.length > 0) {
          const firstTask = queueData.queue[0];
          // lookup inventory for this task's location and item
          const lookupRes = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(firstTask.locations?.code || firstTask.location_id)}`);
          const lData = await lookupRes.json();
          if (lData.success && lData.data.items?.length > 0) {
            const matchItem = lData.data.items.find((it: any) => it.itemId === firstTask.item_id) || lData.data.items[0];
            setItem({
              inventoryId: matchItem.inventoryId,
              locationCode: lData.data.location.code,
              sku: matchItem.sku,
              name: matchItem.name,
              expectedQty: matchItem.onHandQty,
              allocatedQty: matchItem.allocatedQty,
              requestId: firstTask.id,
            });
            setActualQty(matchItem.onHandQty);
            setLoadingItem(false);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      setLoadingItem(false);
      setErrorMessage("No active inventory item selected for audit. Please scan a location in Lookup.");
    }

    loadItem();
  }, [searchParams]);

  if (loadingItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm">Loading inventory data from warehouse database...</p>
      </div>
    );
  }

  if (!item || errorMessage) {
    return (
      <div className="p-6 max-w-md mx-auto text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
          <Package className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">No Target Selected</h2>
        <p className="text-xs text-zinc-400 mb-6 max-w-xs">
          {errorMessage || "Please select an item from the 실사 Queue or scan a location QR code in Lookup."}
        </p>
        <Link
          href="/inventory/lookup"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-transform active:scale-95"
        >
          Go to Scanner Lookup →
        </Link>
      </div>
    );
  }

  const diff = actualQty - item.expectedQty;
  const isMatched = diff === 0;
  const isInvalid = actualQty < 0 || actualQty < item.allocatedQty;

  const handleAdjust = (amount: number) => {
    setActualQty((prev) => Math.max(0, prev + amount));
  };

  const handleSubmit = async () => {
    if (isInvalid) {
      feedback.error();
      alert(`Cannot adjust below allocated quantity (${item.allocatedQty}).`);
      return;
    }

    if (!isMatched && !reason) {
      feedback.error();
      alert("Please select a reason code for the stock discrepancy.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: item.inventoryId,
          newQty: actualQty,
          reason: isMatched ? "COUNT_MISMATCH" : reason,
          requestId: item.requestId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        feedback.complete();
        alert(`Inventory successfully audited & adjusted to ${actualQty} BOX.`);
        router.push("/inventory/queue");
        router.refresh();
      } else {
        feedback.error();
        alert(`Error: ${data.error || "Adjustment failed"}`);
      }
    } catch (err) {
      console.error(err);
      feedback.error();
      alert("Network or database error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 max-w-md mx-auto">
      {/* Top Bar with Back Button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold">Physical Inventory Audit</h1>
          <p className="text-xs text-zinc-400">Verify on-hand stock with physical count</p>
        </div>
      </div>

      {/* Target Item Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-white text-base">{item.locationCode}</span>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">
            LIVE STOCK
          </span>
        </div>

        <div className="text-xs font-mono font-bold text-emerald-400 mb-0.5">{item.sku}</div>
        <div className="text-sm font-bold text-white mb-3">{item.name}</div>

        <div className="grid grid-cols-2 gap-2 bg-black/40 rounded-lg p-2.5 text-center border border-zinc-850">
          <div>
            <div className="text-[10px] text-zinc-500">System Expected</div>
            <div className="text-lg font-bold text-white">{item.expectedQty} BOX</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500">Allocated (Locked)</div>
            <div className="text-lg font-bold text-amber-400">{item.allocatedQty} BOX</div>
          </div>
        </div>
      </div>

      {/* Actual Count Display Card */}
      <div
        className={`p-5 rounded-2xl border text-center transition-all mb-4 ${
          isMatched
            ? "bg-emerald-950/20 border-emerald-500/40"
            : diff < 0
            ? "bg-rose-950/20 border-rose-500/40"
            : "bg-amber-950/20 border-amber-500/40"
        }`}
      >
        <div className="text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Actual Counted Stock</div>
        <div className="text-5xl font-black font-mono tracking-tight my-1 text-white">
          {actualQty} <span className="text-lg font-normal text-zinc-400">BOX</span>
        </div>
        <div className="text-xs font-bold mt-2">
          {isMatched ? (
            <span className="text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> System & Physical stock 100% Match
            </span>
          ) : (
            <span className={diff < 0 ? "text-rose-400" : "text-amber-400"}>
              Discrepancy: {diff > 0 ? `+${diff}` : diff} BOX
            </span>
          )}
        </div>
      </div>

      {/* One-Tap Exact Match Button */}
      {!isMatched && (
        <Button
          onClick={() => {
            setActualQty(item.expectedQty);
            feedback.normal();
          }}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-11 rounded-xl mb-3 text-xs"
        >
          Reset to System Expected ({item.expectedQty} BOX)
        </Button>
      )}

      {/* In-line Thumb Increments */}
      <div className="mb-4">
        <InlineNumberPad onAdjust={handleAdjust} />
      </div>

      {/* Reason Selector if Discrepancy */}
      {!isMatched && (
        <div className="mb-4">
          <ReasonCodeSelector value={reason} onChange={setReason} />
        </div>
      )}

      {/* Confirm & Submit Button */}
      <div className="mt-auto pb-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || isInvalid || (!isMatched && !reason)}
          className={`w-full h-14 font-black text-base rounded-xl shadow-lg transition-transform active:scale-[0.98] ${
            isMatched
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50"
              : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50"
          }`}
        >
          {isSubmitting ? (
            "Auditing & Updating..."
          ) : isMatched ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Confirm Match (One-Tap)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirm Adjustment ({diff > 0 ? `+${diff}` : diff} BOX)
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500 gap-2">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading audit interface...</p>
        </div>
      }
    >
      <CountContent />
    </Suspense>
  );
}
