"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InlineNumberPad } from "@/components/features/inventory/inline-number-pad";
import { CameraBarcodeScanner } from "@/components/features/camera-scanner";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { feedback } from "@/lib/feedback";
import { ArrowRight, CheckCircle2, MapPin, Package, RefreshCw, AlertCircle, Camera, Loader2 } from "lucide-react";

interface StoredItem {
  inventoryId: string;
  itemId: string;
  sku: string;
  name: string;
  upc: string;
  onHandQty: number;
  allocatedQty: number;
  availableQty: number;
}

export default function TransferPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"SOURCE" | "DEST">("SOURCE");

  // Transfer Wizard State
  const [sourceLoc, setSourceLoc] = useState<{ id: string; code: string } | null>(null);
  const [availableItems, setAvailableItems] = useState<StoredItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StoredItem | null>(null);
  const [transferQty, setTransferQty] = useState(1);
  const [destLoc, setDestLoc] = useState<{ id: string; code: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load items from source location
  const handleSelectSourceLocation = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || data.type !== "LOCATION") {
        feedback.error();
        setError(`Source location "${code}" not found in warehouse.`);
        return;
      }

      const loc = data.data.location;
      const items = (data.data.items || []).filter((it: StoredItem) => it.availableQty > 0);

      if (items.length === 0) {
        feedback.error();
        setError(`Location "${loc.code}" has no available inventory to move.`);
        return;
      }

      feedback.normal();
      setSourceLoc({ id: loc.id, code: loc.code });
      setAvailableItems(items);
      setSelectedItem(items[0]);
      setTransferQty(1);
      setStep(2);
    } catch (e) {
      console.error(e);
      feedback.error();
      setError("Failed to fetch source location items.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify destination location
  const handleSelectDestLocation = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || data.type !== "LOCATION") {
        feedback.error();
        setError(`Destination location "${code}" not found.`);
        return;
      }

      const loc = data.data.location;
      if (sourceLoc && loc.id === sourceLoc.id) {
        feedback.error();
        setError("Destination location cannot be the same as source location.");
        return;
      }

      feedback.normal();
      setDestLoc({ id: loc.id, code: loc.code });
      setStep(4);
    } catch (e) {
      console.error(e);
      feedback.error();
      setError("Failed to verify destination location.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    if (step === 1) {
      handleSelectSourceLocation(code);
    } else if (step === 3 || step === 4) {
      handleSelectDestLocation(code);
    }
  };

  useBarcodeScanner({
    onLocation: (code) => handleBarcodeScanned(code),
    onItem: (code) => handleBarcodeScanned(code),
    onError: (raw) => {
      setError(`Unrecognized barcode: ${raw}`);
    },
  });

  const handleExecuteTransfer = async () => {
    if (!sourceLoc || !destLoc || !selectedItem || transferQty <= 0) {
      setError("Please complete all transfer steps.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocationId: sourceLoc.id,
          toLocationId: destLoc.id,
          itemId: selectedItem.itemId,
          qty: transferQty,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        feedback.error();
        setError(data.error || "Transfer failed in database.");
        return;
      }

      feedback.complete();
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      feedback.error();
      setError("Network or server error during transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSourceLoc(null);
    setAvailableItems([]);
    setSelectedItem(null);
    setTransferQty(1);
    setDestLoc(null);
    setError(null);
    setIsSuccess(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 max-w-md mx-auto">
      {/* Camera Barcode Scanner Modal */}
      {isCameraOpen && (
        <CameraBarcodeScanner
          onValidate={async (code: string) => {
            try {
              const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code)}`);
              const data = await res.json();
              return Boolean(res.ok && data.success && data.type === "LOCATION");
            } catch {
              return false;
            }
          }}
          onScan={(code) => {
            setIsCameraOpen(false);
            if (cameraTarget === "SOURCE") {
              handleSelectSourceLocation(code);
            } else {
              handleSelectDestLocation(code);
            }
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">Bin-to-Bin Transfer</h1>
          <p className="text-xs text-zinc-400">Move inventory between warehouse locations</p>
        </div>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          title="Reset"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4-Step Progress Indicator */}
      <div className="flex items-center justify-between mb-5 px-1">
        {[
          { num: 1, label: "Source" },
          { num: 2, label: "Item" },
          { num: 3, label: "Qty" },
          { num: 4, label: "Target" },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.num
                  ? "bg-emerald-500 text-black font-black scale-110"
                  : step > s.num
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                  : "bg-zinc-900 text-zinc-600 border border-zinc-800"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/50 border border-red-800/80 rounded-xl p-3 text-xs text-red-200 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-xs">Checking location inventory...</span>
        </div>
      )}

      {/* Success Screen */}
      {isSuccess && (
        <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-6 text-center my-auto shadow-xl">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Transfer Complete!</h2>
          <p className="text-xs text-zinc-400 mb-5">Stock ledger has been atomically updated in Supabase.</p>

          <div className="bg-black/40 border border-zinc-800 rounded-xl p-3 text-xs space-y-1.5 mb-6 text-left">
            <div className="flex justify-between">
              <span className="text-zinc-500">Moved Product:</span>
              <span className="font-bold text-white">{selectedItem?.sku} ({selectedItem?.name})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Quantity:</span>
              <span className="font-bold text-emerald-400">{transferQty} BOX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Route:</span>
              <span className="font-mono text-zinc-300">{sourceLoc?.code} ➔ {destLoc?.code}</span>
            </div>
          </div>

          <Button
            onClick={handleReset}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl text-sm"
          >
            Start Another Transfer
          </Button>
        </div>
      )}

      {/* Step 1: Scan Source Location */}
      {!isSuccess && step === 1 && !isLoading && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">Step 1: Scan Source Bin</h2>
            <p className="text-xs text-zinc-400 mb-5 max-w-xs mx-auto">
              Scan the Location QR code where the item is currently stored (e.g. <span className="text-emerald-400 font-mono font-bold">LOC-A0101A01</span>).
            </p>

            <Button
              onClick={() => {
                setCameraTarget("SOURCE");
                setIsCameraOpen(true);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-950/40"
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scan Source Bin</span>
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Item to Move */}
      {!isSuccess && step === 2 && !isLoading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Source: <strong className="text-white font-mono">{sourceLoc?.code}</strong></span>
            <button onClick={() => setStep(1)} className="text-emerald-400 hover:underline">Change</button>
          </div>

          <div className="text-xs font-bold text-zinc-300">Select Item to Transfer:</div>

          {availableItems.map((it) => (
            <Card
              key={it.inventoryId}
              onClick={() => {
                setSelectedItem(it);
                setTransferQty(1);
                setStep(3);
              }}
              className={`border cursor-pointer transition-all ${
                selectedItem?.inventoryId === it.inventoryId
                  ? "bg-zinc-900 border-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <CardContent className="p-3.5 flex justify-between items-center">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{it.sku}</div>
                  <div className="text-sm font-bold text-white">{it.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Available: {it.availableQty} BOX (On-hand: {it.onHandQty})</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 3: Select Quantity */}
      {!isSuccess && step === 3 && selectedItem && !isLoading && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs flex justify-between items-center">
            <div>
              <div className="text-zinc-500">Source: <span className="font-mono text-white font-bold">{sourceLoc?.code}</span></div>
              <div className="font-bold text-white mt-0.5">{selectedItem.sku} • {selectedItem.name}</div>
            </div>
            <div className="text-right">
              <div className="text-zinc-500">Max Movable</div>
              <div className="text-emerald-400 font-bold">{selectedItem.availableQty} BOX</div>
            </div>
          </div>

          {/* Qty Display */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Transfer Quantity</div>
            <div className="text-5xl font-black font-mono text-white tracking-tight my-1">
              {transferQty} <span className="text-lg font-normal text-zinc-500">BOX</span>
            </div>
          </div>

          {/* Number Pad */}
          <InlineNumberPad
            onAdjust={(amt) => {
              setTransferQty((prev) => {
                const next = prev + amt;
                if (next < 1) return 1;
                if (next > selectedItem.availableQty) return selectedItem.availableQty;
                return next;
              });
            }}
          />

          <Button
            onClick={() => {
              setCameraTarget("DEST");
              setStep(4);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl text-sm mt-2"
          >
            Continue to Destination Bin →
          </Button>
        </div>
      )}

      {/* Step 4: Scan Destination Bin & Confirm */}
      {!isSuccess && step === 4 && selectedItem && !isLoading && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">From Source Bin:</span>
              <span className="font-mono font-bold text-white">{sourceLoc?.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Moving Product:</span>
              <span className="font-bold text-white">{selectedItem.sku} ({transferQty} BOX)</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
              <span className="text-zinc-500">To Destination Bin:</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {destLoc ? destLoc.code : "Not scanned yet"}
              </span>
            </div>
          </div>

          {!destLoc ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center">
              <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-sm font-bold text-white mb-1">Scan Destination Bin</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Scan the target rack location QR code to place the item.
              </p>
              <Button
                onClick={() => {
                  setCameraTarget("DEST");
                  setIsCameraOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Destination Location</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setCameraTarget("DEST");
                  setIsCameraOpen(true);
                }}
                variant="outline"
                className="w-full border-zinc-800 text-zinc-300 text-xs h-10"
              >
                Rescan Destination Bin
              </Button>

              <Button
                onClick={handleExecuteTransfer}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-14 rounded-xl text-base shadow-lg shadow-emerald-950/40"
              >
                {isSubmitting ? "Executing DB Transfer..." : `CONFIRM TRANSFER (${transferQty} BOX)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
