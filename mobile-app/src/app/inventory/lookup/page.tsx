"use client";

import { useState } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LookupPage() {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [mode, setMode] = useState<'LOCATION' | 'ITEM' | null>(null);

  useBarcodeScanner({
    onLocation: (locationCode) => {
      setLastScanned(locationCode);
      setMode('LOCATION');
    },
    onItem: (skuOrUpc) => {
      setLastScanned(skuOrUpc);
      setMode('ITEM');
    },
    onError: (raw) => {
      setLastScanned(`Error: Unknown Barcode (${raw})`);
      setMode(null);
    }
  });

  return (
    <div className="p-4 flex flex-col h-full gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📷</span>
        <h2 className="text-xl font-semibold mb-2">Waiting for Scan</h2>
        <p className="text-zinc-400 text-sm">
          Scan Location Barcode (A01-05-B01) or<br />
          Item Barcode (UPC/SKU)
        </p>
      </div>

      {lastScanned && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Recent Scan Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-400 mb-1">
              {mode === 'LOCATION' ? 'Location: ' : mode === 'ITEM' ? 'Item/SKU: ' : ''}
              {lastScanned}
            </div>
            <p className="text-sm text-zinc-500">
              {mode === 'LOCATION' 
                ? 'Loading items stored in this location...' 
                : mode === 'ITEM' 
                ? 'Searching for warehouse locations containing this item...' 
                : 'Please scan a valid barcode.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
