"use client";

import { useState } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Package, MapPin } from "lucide-react";
import { InlineNumberPad } from "@/components/features/inventory/inline-number-pad";
import { feedback } from "@/lib/feedback";

type TransferStep = "SOURCE" | "ITEM" | "QTY" | "DESTINATION" | "CONFIRM";

export default function TransferPage() {
  const [step, setStep] = useState<TransferStep>("SOURCE");
  
  const [sourceLoc, setSourceLoc] = useState<string | null>(null);
  const [itemSku, setItemSku] = useState<string | null>(null);
  const [transferQty, setTransferQty] = useState<number>(0);
  const [destLoc, setDestLoc] = useState<string | null>(null);

  // Mock max qty for now
  const maxQty = 50;

  useBarcodeScanner({
    onLocation: (loc) => {
      if (step === "SOURCE") {
        setSourceLoc(loc);
        setStep("ITEM");
        feedback.match();
      } else if (step === "DESTINATION") {
        if (loc === sourceLoc) {
          feedback.error();
          alert("Destination cannot be the same as source location.");
          return;
        }
        setDestLoc(loc);
        setStep("CONFIRM");
        feedback.match();
      } else {
        feedback.error();
      }
    },
    onItem: (sku) => {
      if (step === "ITEM") {
        setItemSku(sku);
        setTransferQty(1); // Default to 1
        setStep("QTY");
        feedback.match();
      } else {
        feedback.error();
      }
    },
    onError: () => {
      feedback.error();
    }
  });

  const handleAdjustQty = (amount: number) => {
    setTransferQty(prev => {
      const next = prev + amount;
      if (next < 1) return 1;
      if (next > maxQty) return maxQty;
      return next;
    });
  };

  const handleTransfer = async () => {
    // API call would go here
    feedback.complete();
    alert(`Transfer Complete: ${transferQty} of ${itemSku} from ${sourceLoc} to ${destLoc}`);
    
    // Reset state
    setSourceLoc(null);
    setItemSku(null);
    setTransferQty(0);
    setDestLoc(null);
    setStep("SOURCE");
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Bin-to-Bin Transfer</h2>
        <p className="text-zinc-400 text-sm">Move inventory between locations</p>
      </div>

      <div className="space-y-3 mb-6 flex-1">
        {/* Step 1: Source */}
        <Card className={`border ${step === "SOURCE" ? "border-emerald-500 bg-emerald-500/10" : sourceLoc ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950 opacity-50"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-zinc-800 p-2 rounded-full"><MapPin className="w-5 h-5 text-zinc-400" /></div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Step 1: Source Location</div>
                <div className="font-bold text-lg">{sourceLoc || "Waiting for scan..."}</div>
              </div>
            </div>
            {sourceLoc && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </CardContent>
        </Card>

        {/* Step 2: Item */}
        <Card className={`border ${step === "ITEM" ? "border-emerald-500 bg-emerald-500/10" : itemSku ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950 opacity-50"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-zinc-800 p-2 rounded-full"><Package className="w-5 h-5 text-zinc-400" /></div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Step 2: Target Item</div>
                <div className="font-bold text-lg">{itemSku || (step === "ITEM" ? "Scan item..." : "Pending")}</div>
              </div>
            </div>
            {itemSku && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </CardContent>
        </Card>

        {/* Step 3: Quantity */}
        <Card className={`border ${step === "QTY" ? "border-emerald-500 bg-emerald-500/10" : transferQty > 0 && step !== "ITEM" && step !== "SOURCE" ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950 opacity-50"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-zinc-400 font-medium">Step 3: Transfer Quantity</div>
              {step !== "QTY" && transferQty > 0 && <span className="font-bold text-emerald-400">{transferQty} BOX</span>}
            </div>
            
            {step === "QTY" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <div className="text-center text-3xl font-bold text-emerald-400 my-4">{transferQty}</div>
                <InlineNumberPad onAdjust={handleAdjustQty} />
                <Button 
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12"
                  onClick={() => setStep("DESTINATION")}
                >
                  Confirm Quantity
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Destination */}
        <Card className={`border ${step === "DESTINATION" ? "border-emerald-500 bg-emerald-500/10" : destLoc ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950 opacity-50"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-zinc-800 p-2 rounded-full"><MapPin className="w-5 h-5 text-zinc-400" /></div>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Step 4: Destination</div>
                <div className="font-bold text-lg">{destLoc || (step === "DESTINATION" ? "Scan destination..." : "Pending")}</div>
              </div>
            </div>
            {destLoc && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Action */}
      {step === "CONFIRM" && (
        <div className="animate-in slide-in-from-bottom-4">
          <div className="bg-zinc-900 p-4 rounded-t-xl border border-zinc-800 text-center mb-4">
            <div className="flex justify-center items-center gap-4 text-xl font-bold text-white mb-2">
              <span>{sourceLoc}</span>
              <ArrowRight className="w-6 h-6 text-zinc-500" />
              <span className="text-emerald-400">{destLoc}</span>
            </div>
            <p className="text-zinc-400">Moving <strong className="text-white">{transferQty}</strong> items of {itemSku}</p>
          </div>
          <Button 
            className="w-full h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={handleTransfer}
          >
            Execute Transfer
          </Button>
        </div>
      )}
    </div>
  );
}
