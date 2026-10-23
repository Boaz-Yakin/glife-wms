"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InlineNumberPad } from "@/components/features/inventory/inline-number-pad";
import { CameraBarcodeScanner } from "@/components/features/camera-scanner";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { feedback } from "@/lib/feedback";
import {
  MapPin,
  Package,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Camera,
  ArrowRight,
  RotateCcw,
  Layers,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface LocationData {
  id: string;
  code: string;
  zone_type: string;
}

interface ItemData {
  id: string;
  sku: string;
  name: string;
  upc: string;
  uom: string;
}

function PutAwayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLocParam = searchParams.get("loc");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"LOC" | "ITEM">("LOC");

  // State
  const [targetLoc, setTargetLoc] = useState<LocationData | null>(null);
  const [existingItemsInLoc, setExistingItemsInLoc] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [existingItemQtyInLoc, setExistingItemQtyInLoc] = useState<number>(0);
  const [putAwayQty, setPutAwayQty] = useState<number>(1);
  const [reasonType, setReasonType] = useState<string>("INITIAL_STOCK_IN");

  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Auto-load location if provided in query params
  useEffect(() => {
    if (initialLocParam && !targetLoc) {
      handleScanLocation(initialLocParam);
    }
  }, [initialLocParam]);

  // Hardware Barcode Scanner Hook
  useBarcodeScanner({
    onLocation: (code) => {
      if (step === 1) handleScanLocation(code);
    },
    onItem: (code) => {
      if (step === 2) handleScanItem(code);
    },
    onScan: (res) => {
      const val = res.value || res.raw;
      if (!val) return;
      if (step === 1) {
        handleScanLocation(val);
      } else if (step === 2) {
        handleScanItem(val);
      }
    },
  });

  // Step 1: Scan / Resolve Target Location
  const handleScanLocation = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.success || data.type !== "LOCATION") {
        feedback.error();
        setError(`Location "${code}" not found. Please scan a valid rack barcode.`);
        return;
      }

      feedback.match();
      setTargetLoc(data.data.location);
      setExistingItemsInLoc(data.data.items || []);
      setInputVal("");
      setStep(2);
    } catch {
      feedback.error();
      setError("Failed to query location. Check network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Scan / Resolve Item
  const handleScanItem = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.success || data.type !== "ITEM") {
        feedback.error();
        setError(`Item "${code}" not found in catalog. Check barcode or SKU.`);
        return;
      }

      feedback.normal();
      const itm = data.data.item;
      setSelectedItem({
        id: itm.id,
        sku: itm.sku,
        name: itm.name,
        upc: itm.upc,
        uom: itm.uom || "BOX",
      });

      // Check if this item is already stored in the target location
      const matchInBin = existingItemsInLoc.find(
        (it) => it.itemId === itm.id || it.sku === itm.sku
      );
      setExistingItemQtyInLoc(matchInBin ? matchInBin.onHandQty : 0);

      setInputVal("");
      setStep(3);
    } catch (e) {
      feedback.error();
      setError("Failed to query item. Check network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Submit Put-away / Stock-In
  const handleConfirmPutAway = async () => {
    if (!targetLoc || !selectedItem || putAwayQty <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/inventory/put-away", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationCode: targetLoc.code,
          itemCode: selectedItem.sku || selectedItem.id,
          qty: putAwayQty,
          reason:
            reasonType === "INITIAL_STOCK_IN"
              ? `INITIAL_STOCK: Initial rack stocking (${putAwayQty} ${selectedItem.uom})`
              : `PUT_AWAY: Inbound stocking (${putAwayQty} ${selectedItem.uom})`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        feedback.error();
        const errStr =
          typeof data.error === "string"
            ? data.error
            : typeof data.error === "object" && data.error !== null && "message" in data.error
            ? String(data.error.message)
            : data.error
            ? JSON.stringify(data.error)
            : "Failed to stock item into rack.";
        setError(errStr);
        return;
      }

      feedback.complete();
      setSuccessData(data.inventory);
    } catch (e: unknown) {
      feedback.error();
      const errStr =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "An unexpected error occurred while saving inventory.";
      setError(errStr);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for another item in same bin
  const handlePutAwayAnotherInSameLoc = () => {
    setSelectedItem(null);
    setPutAwayQty(1);
    setSuccessData(null);
    setError(null);
    setStep(2);
    // Refresh existing items list in this location
    if (targetLoc) {
      fetch(`/api/inventory/lookup?code=${encodeURIComponent(targetLoc.code)}`)
        .then((res) => res.json())
        .then((d) => {
          if (d.success && d.type === "LOCATION") {
            setExistingItemsInLoc(d.data.items || []);
          }
        });
    }
  };

  // Full reset
  const handleFullReset = () => {
    setTargetLoc(null);
    setExistingItemsInLoc([]);
    setSelectedItem(null);
    setPutAwayQty(1);
    setSuccessData(null);
    setError(null);
    setInputVal("");
    setStep(1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#090A0F] text-slate-100 p-4 pb-20 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            Put-away & Stock In
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            랙 바코드 스캔 ➔ 상품 스캔 ➔ 초기 재고 즉시 등록
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFullReset}
          className="border-slate-700 bg-slate-900 text-slate-300 text-xs h-9 px-3 hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div
          className={`h-1.5 rounded-full transition-all ${
            step >= 1 ? "bg-emerald-500 shadow-sm" : "bg-slate-800"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-all ${
            step >= 2 ? "bg-emerald-500 shadow-sm" : "bg-slate-800"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-all ${
            step >= 3 ? "bg-emerald-500 shadow-sm" : "bg-slate-800"
          }`}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-rose-950/80 border border-rose-600 rounded-xl flex items-start gap-2.5 text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {successData ? (
        <Card className="bg-[#13161F] border-emerald-500/50 shadow-2xl p-6 text-center my-auto">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">Stocked Successfully!</h2>
          <p className="text-sm text-slate-400 mb-6 font-medium">재고 원장에 즉시 등록되었습니다.</p>

          <div className="bg-[#1E2333] border border-slate-700 rounded-xl p-4 text-left space-y-2.5 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Rack Location:</span>
              <span className="font-mono font-bold text-emerald-400 text-base">
                {successData.locationCode}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Item:</span>
              <span className="font-bold text-white text-right truncate max-w-[200px]">
                {successData.name} ({successData.sku})
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700/60">
              <span className="text-slate-400">Inventory Change:</span>
              <span className="font-mono font-bold text-base text-white">
                <span className="text-slate-400">{successData.previousQty}</span> ➔{" "}
                <span className="text-emerald-400 text-lg">{successData.newQty}</span>{" "}
                <span className="text-xs text-slate-400">{successData.uom}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button
              onClick={handlePutAwayAnotherInSameLoc}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base rounded-xl"
            >
              + Put Away Another Item in this Bin
            </Button>
            <Button
              onClick={handleFullReset}
              variant="outline"
              className="w-full h-12 border-slate-700 bg-slate-900 text-slate-300 font-bold text-sm rounded-xl"
            >
              Next Location / New Rack
            </Button>
            <Button
              onClick={() => router.push("/inventory")}
              variant="ghost"
              className="w-full text-slate-400 hover:text-white text-xs h-10"
            >
              Return to Inventory Home
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* STEP 1: SCAN TARGET LOCATION */}
          {step === 1 && (
            <div className="space-y-4 flex-1 flex flex-col">
              <Card className="bg-[#13161F] border-slate-800 shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>Step 1: Scan Target Rack Location</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    재고를 배치할 선반 랙의 2D QR 코드 또는 바코드(예:{" "}
                    <code className="text-emerald-300">LOC-A0101A01</code>)를 스캔하십시오.
                  </p>

                  {/* Prominent Full-Width Camera Scan Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      setCameraTarget("LOC");
                      setIsCameraOpen(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 text-sm active:scale-[0.98] transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Open Camera Scanner (QR / Barcode)</span>
                  </Button>

                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-[1px] bg-slate-800" />
                    <span className="text-[11px] text-slate-500 font-semibold tracking-wider">OR ENTER MANUALLY</span>
                    <div className="flex-1 h-[1px] bg-slate-800" />
                  </div>

                  {/* Manual Type & Verify Row */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="e.g. LOC-A0101A01"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inputVal.trim()) {
                          handleScanLocation(inputVal);
                        }
                      }}
                      className="flex-1 min-w-0 bg-[#1E2333] border border-slate-700 rounded-xl px-3.5 py-3 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none placeholder:text-slate-500"
                    />
                    <Button
                      type="button"
                      onClick={() => handleScanLocation(inputVal)}
                      disabled={isLoading || !inputVal.trim()}
                      className="shrink-0 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold px-4 py-3 rounded-xl h-auto text-sm"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Guide hint */}
              <div className="mt-auto bg-[#13161F]/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 팁</p>
                <p>• 블루투스 링 스캐너로 랙 라벨을 직접 조준하면 자동으로 2단계로 넘어갑니다.</p>
                <p>• 빈 랙(Empty Bin)이더라도 상관없이 바로 새 상품을 적치할 수 있습니다.</p>
              </div>
            </div>
          )}

          {/* STEP 2: SCAN ITEM */}
          {step === 2 && targetLoc && (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Selected Location Banner */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
                      Target Rack
                    </div>
                    <div className="font-mono font-black text-white text-lg">
                      {targetLoc.code}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Current Items</span>
                  <div className="font-bold text-slate-200 text-xs">
                    {existingItemsInLoc.length > 0
                      ? `${existingItemsInLoc.length} SKU(s)`
                      : "Empty Bin"}
                  </div>
                </div>
              </div>

              {/* Item Scanner Input */}
              <Card className="bg-[#13161F] border-slate-800 shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Package className="w-4 h-4" />
                    <span>Step 2: Scan Item Barcode (UPC / SKU)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    이 랙에 적치할 상품의 단품 바코드(UPC) 또는 SKU를 스캔하십시오.
                  </p>

                  {/* Prominent Full-Width Camera Scan Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      setCameraTarget("ITEM");
                      setIsCameraOpen(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 text-sm active:scale-[0.98] transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Open Camera Scanner (Barcode)</span>
                  </Button>

                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-[1px] bg-slate-800" />
                    <span className="text-[11px] text-slate-500 font-semibold tracking-wider">OR ENTER MANUALLY</span>
                    <div className="flex-1 h-[1px] bg-slate-800" />
                  </div>

                  {/* Manual Type & Verify Row */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Scan or type UPC / SKU..."
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inputVal.trim()) {
                          handleScanItem(inputVal);
                        }
                      }}
                      className="flex-1 min-w-0 bg-[#1E2333] border border-slate-700 rounded-xl px-3.5 py-3 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none placeholder:text-slate-500"
                    />
                    <Button
                      type="button"
                      onClick={() => handleScanItem(inputVal)}
                      disabled={isLoading || !inputVal.trim()}
                      className="shrink-0 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold px-4 py-3 rounded-xl h-auto text-sm"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Existing items preview in this bin */}
              {existingItemsInLoc.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Already in this bin:
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {existingItemsInLoc.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleScanItem(item.sku)}
                        className="p-2.5 bg-[#1E2333]/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:border-slate-700 active:scale-[0.99]"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="text-slate-400 ml-1.5 font-mono">({item.sku})</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-400">
                            {item.onHandQty}
                          </span>{" "}
                          <span className="text-slate-500">{item.uom}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: QUANTITY & CONFIRMATION */}
          {step === 3 && targetLoc && selectedItem && (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Rack & Item Summary Card */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Location:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {targetLoc.code}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Current in bin:{" "}
                    <span className="font-bold text-white font-mono">
                      {existingItemQtyInLoc}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 font-mono">{selectedItem.sku}</div>
                  <div className="text-base font-black text-white">{selectedItem.name}</div>
                </div>

                {/* Reason Pill Selector */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReasonType("INITIAL_STOCK_IN")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      reasonType === "INITIAL_STOCK_IN"
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}
                  >
                    초기 재고 설정
                  </button>
                  <button
                    type="button"
                    onClick={() => setReasonType("PUT_AWAY")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      reasonType === "PUT_AWAY"
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}
                  >
                    입고 적치 (Inbound)
                  </button>
                </div>
              </div>

              {/* Quantity Display & Quick Increment Buttons */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-4 text-center">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Quantity to Stock
                </span>
                <div className="font-mono text-4xl font-black text-emerald-400 my-1">
                  {putAwayQty} <span className="text-base text-slate-400">{selectedItem.uom}</span>
                </div>
                <div className="text-xs text-slate-400">
                  New Total:{" "}
                  <span className="text-white font-bold font-mono">
                    {existingItemQtyInLoc + putAwayQty}
                  </span>{" "}
                  {selectedItem.uom}
                </div>

                {/* Quick Increment Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1, 5, 10, 50].map((add) => (
                    <Button
                      key={add}
                      type="button"
                      variant="outline"
                      onClick={() => setPutAwayQty((prev) => Math.max(1, prev + add))}
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs h-10"
                    >
                      +{add}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Inline Number Pad */}
              <div className="bg-[#13161F] border border-slate-800 rounded-xl p-3">
                <InlineNumberPad
                  onAdjust={(delta) => setPutAwayQty((prev) => Math.max(1, prev + delta))}
                />
              </div>

              {/* Submit CTA */}
              <div className="mt-auto pt-2">
                <Button
                  onClick={handleConfirmPutAway}
                  disabled={isSubmitting || putAwayQty <= 0}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base rounded-xl shadow-lg active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Confirm & Stock ({putAwayQty} {selectedItem.uom})
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Camera Barcode Scanner Modal */}
      {isCameraOpen && (
        <CameraBarcodeScanner
          onValidate={async (scannedCode: string) => {
            try {
              const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(scannedCode)}`);
              const data = await res.json();
              if (!res.ok || !data.success) return false;
              if (cameraTarget === "LOC") {
                return data.type === "LOCATION";
              } else {
                return data.type === "ITEM";
              }
            } catch {
              return false;
            }
          }}
          onScan={(scannedCode: string) => {
            setIsCameraOpen(false);
            if (cameraTarget === "LOC") {
              handleScanLocation(scannedCode);
            } else {
              handleScanItem(scannedCode);
            }
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}

export default function PutAwayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#090A0F] text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading Put-away...
        </div>
      }
    >
      <PutAwayContent />
    </Suspense>
  );
}
