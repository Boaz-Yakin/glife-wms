"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { InlineNumberPad } from "@/components/features/inventory/inline-number-pad";
import { ReasonCodeSelector } from "@/components/features/inventory/reason-code-selector";
import { Database } from "@/types/supabase";
import { feedback } from "@/lib/feedback";

type ReasonCode = Database['public']['Enums']['adjustment_reason'];

function CycleCountInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const reqId = searchParams.get('reqId');
  const locId = searchParams.get('locId');
  const paramItemId = searchParams.get('itemId');

  const [isLoading, setIsLoading] = useState(false);

  // In a real app we'd fetch this using the locId and paramItemId.
  // For now we keep the dummy data but override with params if they exist.
  const item = {
    location: locId || "A01-05-B01",
    sku: "SKU-APPLE-01",
    upc: "8801234567890",
    name: "Fresh Apple 1kg",
    systemQty: 24,
    allocatedQty: 4,
    inventoryId: 'test-inv-id' // Mock inventory id for adjustment API
  };

  const [actualQty, setActualQty] = useState(item.systemQty);
  const [reason, setReason] = useState<ReasonCode | null>(null);

  const diff = actualQty - item.systemQty;
  const isMatched = diff === 0;
  const isInvalid = actualQty < 0 || actualQty < item.allocatedQty;

  const handleAdjust = (amount: number) => {
    setActualQty(prev => prev + amount);
  };

  const handleSubmit = async () => {
    if (isInvalid) {
      feedback.error();
      return;
    }
    
    if (!isMatched && !reason) {
      feedback.error();
      alert("Please select a reason for the discrepancy.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: item.inventoryId, // In real app, resolved from location/item
          newQty: actualQty,
          userId: 'USR-TEST-1', // Mock user id
          reason: isMatched ? 'COUNT_MISMATCH' : reason,
          requestId: reqId
        })
      });

      const data = await res.json();
      if (data.success) {
        feedback.complete();
        alert(`Inventory adjusted: ${actualQty} BOX`);
        router.push('/inventory/queue');
      } else {
        feedback.error();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      feedback.error();
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-zinc-800 bg-zinc-950">
        <button onClick={() => router.back()} className="mr-3 text-zinc-400 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">Location: {item.location}</h2>
      </div>

      <div className="p-4 flex flex-col flex-1 pb-safe">
        {/* Item Info */}
        <div className="mb-4">
          <h3 className="text-xl font-bold">{item.name}</h3>
          <p className="text-sm text-zinc-400">SKU: {item.sku} | UPC: {item.upc}</p>
        </div>

        {/* Big Number Cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-zinc-400 mb-1">System Qty</div>
              <div className="text-4xl font-bold text-zinc-300">{item.systemQty}</div>
            </CardContent>
          </Card>
          <Card className={`border-2 ${isMatched ? 'bg-emerald-950/20 border-emerald-900/50' : isInvalid ? 'bg-rose-950/20 border-rose-900' : 'bg-amber-950/20 border-amber-900/50'}`}>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-zinc-400 mb-1">Actual Count</div>
              <div className={`text-4xl font-bold ${isMatched ? 'text-emerald-400' : isInvalid ? 'text-rose-500' : 'text-amber-400'}`}>
                {actualQty}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Difference Alert */}
        {!isMatched && (
          <div className={`text-center font-bold mb-2 ${isInvalid ? 'text-rose-500' : 'text-amber-500'}`}>
            {isInvalid ? (
              <span className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Cannot be negative or less than allocated!
              </span>
            ) : (
              `🚨 Diff: ${diff > 0 ? '+' : ''}${diff} BOX (${diff > 0 ? 'Over' : 'Short'})`
            )}
          </div>
        )}

        {/* Inline Number Pad */}
        <InlineNumberPad onAdjust={handleAdjust} />

        {/* Reason Code */}
        {!isMatched && !isInvalid && (
          <div className="mt-2 mb-4 animate-in fade-in slide-in-from-top-2">
            <ReasonCodeSelector value={reason} onChange={setReason} />
          </div>
        )}

        <div className="flex-1"></div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isInvalid || (!isMatched && !reason) || isLoading}
          className={`w-full h-16 text-lg font-bold transition-all ${
            isMatched 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isMatched ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Matches System ({item.systemQty})
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Actual ({actualQty})
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CycleCountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full bg-black text-white items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold">Loading...</h2>
        </div>
      }
    >
      <CycleCountInner />
    </Suspense>
  );
}
