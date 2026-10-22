"use client";

import Link from "next/link";
import { useState } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, QrCode, MapPin, Package, AlertCircle, ClipboardCheck, Loader2, ArrowRight } from "lucide-react";
import { CameraBarcodeScanner } from "@/components/features/camera-scanner";
import { feedback } from "@/lib/feedback";

interface LocationData {
  id: string;
  code: string;
  zone_type: string;
}

interface ItemStock {
  inventoryId: string;
  itemId: string;
  sku: string;
  name: string;
  upc: string;
  uom: string;
  onHandQty: number;
  allocatedQty: number;
  availableQty: number;
}

interface ItemData {
  id: string;
  sku: string;
  name: string;
  upc: string;
  uom: string;
  category?: string;
}

interface LocationStock {
  inventoryId: string;
  locationId: string;
  code: string;
  zone_type: string;
  onHandQty: number;
  allocatedQty: number;
  availableQty: number;
}

export default function LookupPage() {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state from real DB
  const [lookupResult, setLookupResult] = useState<{
    type: "LOCATION" | "ITEM";
    location?: LocationData;
    items?: ItemStock[];
    item?: ItemData;
    locations?: LocationStock[];
  } | null>(null);

  const performLookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLastScanned(trimmed);
    setLoading(true);
    setError(null);
    setLookupResult(null);

    try {
      const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        feedback.error();
        setError(data.error || `No matching records found for "${trimmed}".`);
        return;
      }

      feedback.normal();
      if (data.type === "LOCATION") {
        setLookupResult({
          type: "LOCATION",
          location: data.data.location,
          items: data.data.items,
        });
      } else {
        setLookupResult({
          type: "ITEM",
          item: data.data.item,
          locations: data.data.locations,
        });
      }
    } catch (err) {
      console.error(err);
      feedback.error();
      setError("Network or server error during lookup.");
    } finally {
      setLoading(false);
    }
  };

  useBarcodeScanner({
    onLocation: (code) => performLookup(code),
    onItem: (code) => performLookup(code),
    onError: (raw) => {
      setLastScanned(raw);
      setError(`Unrecognized barcode format (${raw})`);
    },
  });

  return (
    <div className="p-4 flex flex-col h-full gap-4 max-w-lg mx-auto">
      {/* Camera Barcode Scanner Modal */}
      {isCameraOpen && (
        <CameraBarcodeScanner
          onScan={(code) => {
            setIsCameraOpen(false);
            performLookup(code);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Main Scanner Action Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-md">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400">
          <Camera className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Inventory Lookup</h2>
        <p className="text-zinc-400 text-xs mb-4 max-w-xs">
          Scan shelf rack Location QR codes (e.g. <span className="text-emerald-400 font-mono font-bold">LOC-A0101A01</span>) or item barcodes.
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
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
          <QrCode className="w-3.5 h-3.5 text-zinc-400" />
          <span>Ring Scanner Ready • Scan anytime</span>
        </div>
      </div>

      {/* Manual Input Fallback */}
      <div className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              performLookup(manualInput);
              setManualInput("");
            }
          }}
          placeholder="Manual barcode (e.g. LOC-A0101A01, CND-001)"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono uppercase"
        />
        <Button
          onClick={() => {
            performLookup(manualInput);
            setManualInput("");
          }}
          disabled={!manualInput.trim() || loading}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 rounded-xl"
        >
          Query
        </Button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="py-8 flex flex-col items-center justify-center text-zinc-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-xs">Querying warehouse database...</span>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-red-950/50 border border-red-800/80 rounded-xl p-4 text-xs text-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="font-bold text-red-300">Not Found</div>
            <p className="mt-0.5 text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {/* Real DB Results */}
      {lookupResult && !loading && (
        <div className="space-y-3 pb-8">
          {/* LOCATION Result View */}
          {lookupResult.type === "LOCATION" && lookupResult.location && (
            <div>
              <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500">Scanned Location</div>
                      <div className="text-xl font-mono font-black text-white">{lookupResult.location.code}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg">
                    Zone {lookupResult.location.zone_type}
                  </span>
                </div>
              </div>

              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Stored Items ({lookupResult.items?.length || 0})
              </div>

              {lookupResult.items?.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center text-xs text-zinc-500">
                  This location is currently empty (0 items).
                </div>
              ) : (
                lookupResult.items?.map((it) => (
                  <Card key={it.inventoryId} className="bg-zinc-900 border-zinc-800 mb-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <div className="text-xs font-mono font-bold text-emerald-400">{it.sku}</div>
                          <div className="text-sm font-bold text-white mt-0.5">{it.name}</div>
                          {it.upc && <div className="text-[10px] text-zinc-500 font-mono mt-0.5">UPC: {it.upc}</div>}
                        </div>
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono">
                          {it.uom}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-black/40 rounded-lg p-2.5 text-center my-3 border border-zinc-850">
                        <div>
                          <div className="text-[10px] text-zinc-500">On-Hand</div>
                          <div className="text-sm font-bold text-white">{it.onHandQty}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">Allocated</div>
                          <div className="text-sm font-bold text-amber-400">{it.allocatedQty}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">Available</div>
                          <div className="text-sm font-bold text-emerald-400">{it.availableQty}</div>
                        </div>
                      </div>

                      <Link
                        href={`/inventory/count?locId=${lookupResult.location?.id}&itemId=${it.itemId}&locCode=${lookupResult.location?.code}&sku=${it.sku}&name=${encodeURIComponent(it.name)}&expected=${it.onHandQty}&invId=${it.inventoryId}`}
                        className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Start Count & Audit</span>
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ITEM Result View */}
          {lookupResult.type === "ITEM" && lookupResult.item && (
            <div>
              <div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500">{lookupResult.item.sku}</div>
                      <div className="text-base font-bold text-white">{lookupResult.item.name}</div>
                      {lookupResult.item.upc && (
                        <div className="text-[10px] text-zinc-400 font-mono">UPC: {lookupResult.item.upc}</div>
                      )}
                    </div>
                  </div>
                  {lookupResult.item.category && (
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-lg">
                      {lookupResult.item.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Storage Locations ({lookupResult.locations?.length || 0})
              </div>

              {lookupResult.locations?.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center text-xs text-zinc-500">
                  This item is not currently assigned to any warehouse location.
                </div>
              ) : (
                lookupResult.locations?.map((loc) => (
                  <Card key={loc.inventoryId} className="bg-zinc-900 border-zinc-800 mb-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono font-bold text-white text-sm">{loc.code}</span>
                        </div>
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                          Zone {loc.zone_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-black/40 rounded-lg p-2.5 text-center my-3 border border-zinc-850">
                        <div>
                          <div className="text-[10px] text-zinc-500">On-Hand</div>
                          <div className="text-sm font-bold text-white">{loc.onHandQty}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">Allocated</div>
                          <div className="text-sm font-bold text-amber-400">{loc.allocatedQty}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">Available</div>
                          <div className="text-sm font-bold text-emerald-400">{loc.availableQty}</div>
                        </div>
                      </div>

                      <Link
                        href={`/inventory/count?locId=${loc.locationId}&itemId=${lookupResult.item?.id}&locCode=${loc.code}&sku=${lookupResult.item?.sku}&name=${encodeURIComponent(lookupResult.item?.name || '')}&expected=${loc.onHandQty}&invId=${loc.inventoryId}`}
                        className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Audit Count at {loc.code}</span>
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
