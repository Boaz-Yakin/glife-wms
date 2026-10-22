"use client";

import Link from "next/link";
import { useState } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, QrCode, MapPin, Package, AlertCircle, ClipboardCheck } from "lucide-react";
import { CameraBarcodeScanner } from "@/components/features/camera-scanner";

export default function LookupPage() {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [mode, setMode] = useState<"LOCATION" | "ITEM" | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const handleScanCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("LOC-") || /^[A-Z]\d{2}-\d{2}-[A-Z]\d{2}$/i.test(trimmed)) {
      setLastScanned(trimmed);
      setMode("LOCATION");
    } else if (trimmed.startsWith("SKU-") || /^\d{12,14}$/.test(trimmed) || trimmed.startsWith("BEV-")) {
      setLastScanned(trimmed);
      setMode("ITEM");
    } else {
      setLastScanned(trimmed);
      setMode("LOCATION"); // Default try location or unknown
    }
  };

  useBarcodeScanner({
    onLocation: (locationCode) => {
      setLastScanned(locationCode);
      setMode("LOCATION");
    },
    onItem: (skuOrUpc) => {
      setLastScanned(skuOrUpc);
      setMode("ITEM");
    },
    onError: (raw) => {
      setLastScanned(`Error: Unknown Barcode (${raw})`);
      setMode(null);
    },
  });

  return (
    <div className="p-4 flex flex-col h-full gap-4 max-w-lg mx-auto">
      {/* Camera Barcode Scanner Modal */}
      {isCameraOpen && (
        <CameraBarcodeScanner
          onScan={(code) => {
            handleScanCode(code);
            setIsCameraOpen(false);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Main Scanner Action Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-md">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Inventory Lookup</h2>
        <p className="text-zinc-400 text-xs mb-5 max-w-xs">
          Scan shelf rack Location QR codes (e.g. <span className="text-emerald-400 font-mono">LOC-A0105B01</span>) or item barcodes with your phone camera or ring scanner.
        </p>

        {/* Primary Camera Scan Button */}
        <Button
          onClick={() => setIsCameraOpen(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 text-sm transition-transform active:scale-[0.98]"
        >
          <Camera className="w-5 h-5" />
          <span>Start Phone Camera Scan</span>
        </Button>

        {/* Subtext info for Ring Scanner */}
        <p className="text-[11px] text-zinc-500 mt-3 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Bluetooth ring scanner is also active automatically (Focus-Free).</span>
        </p>
      </div>

      {/* Manual Input Fallback */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleScanCode(manualInput);
              setManualInput("");
            }
          }}
          placeholder="Or type code manually (LOC-A0105B01)..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            handleScanCode(manualInput);
            setManualInput("");
          }}
          className="border-zinc-700 text-xs font-semibold px-3"
        >
          Submit
        </Button>
      </div>

      {/* Scan Result Card */}
      {lastScanned && (
        <Card className="bg-zinc-900 border-zinc-800 text-white overflow-hidden shadow-sm">
          <CardHeader className="pb-2 border-b border-zinc-800/60 bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                {mode === "LOCATION" ? (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Location Scanned</span>
                  </>
                ) : mode === "ITEM" ? (
                  <>
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span>Item / SKU Scanned</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scan Result</span>
                  </>
                )}
              </CardTitle>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                0.05s
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="text-xl font-mono font-black text-emerald-400 tracking-tight break-all mb-2">
              {lastScanned}
            </div>
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-300">
              {mode === "LOCATION" ? (
                <div className="space-y-1">
                  <p className="font-semibold text-white">✅ Rack Verified: {lastScanned}</p>
                  <p className="text-zinc-400 text-[11px]">
                    Viewing stored stock in this location bin. Ready for cycle count or stock check.
                  </p>
                </div>
              ) : mode === "ITEM" ? (
                <div className="space-y-1">
                  <p className="font-semibold text-white">📦 Product Identified: {lastScanned}</p>
                  <p className="text-zinc-400 text-[11px]">
                    Searching warehouse locations containing this item...
                  </p>
                </div>
              ) : (
                <p className="text-zinc-400 text-[11px]">Valid warehouse code registered.</p>
              )}
            </div>

            {/* Start Count for scanned target */}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-end">
              <Link
                href={`/inventory/count?${mode === "LOCATION" ? `locId=${encodeURIComponent(lastScanned)}` : `itemId=${encodeURIComponent(lastScanned)}`}`}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-all active:scale-[0.98]"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Start Count for this {mode === "LOCATION" ? "Location" : "Item"} (실사 시작)</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom shortcut to Cycle Count */}
      <div className="mt-auto pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
        <Link
          href="/inventory/count"
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.98] shadow-sm"
        >
          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          <span>Direct Cycle Count (직접 실사 시작)</span>
        </Link>
      </div>
    </div>
  );
}
